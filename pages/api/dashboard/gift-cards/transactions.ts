import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { systemLog } from '@/lib/systemLogger';
import { rateLimit } from '@/lib/rateLimit';

// Doğrudan PrismaClient'ı her endpoint'de yeniden oluştur
const prisma = new PrismaClient();

// Her IP için dakikada maksimum istek sayısı
const limiter = rateLimit({
  interval: 60 * 1000, // 60 saniye
  uniqueTokenPerInterval: 100, // maksimum 100 benzersiz token (IP başına)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if Prisma is initialized
  if (!prisma) {
    console.error('Prisma client is not initialized');
    return res.status(500).json({ error: 'Database connection error' });
  }
  
  const session = await getServerSession(req, res, authOptions);
  const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
  
  // Rate limiting - DOS saldırılarına karşı koruma
  try {
    await limiter.check(res, 20, ipAddress); // Dakikada 20 istek limiti
  } catch (error) {
    return res.status(429).json({ error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' });
  }

  // Yetkilendirme kontrolü
  if (!session || session.user.role !== 'ADMIN') {
    await systemLog({
      type: 'WARNING',
      action: 'UNAUTHORIZED_ACCESS',
      description: `Yetkisiz hediye kartı işlemleri erişim denemesi: ${req.method}`,
      ipAddress
    });
    return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
  }

  // GET methodu - İşlem geçmişini getir
  if (req.method === 'GET') {
    try {
      // URL parametre olarak giftCardId alınabilir
      const { giftCardId } = req.query;
      let transactions;

      if (giftCardId) {
        // Belirli bir hediye kartının işlemlerini getir
        transactions = await prisma.giftCardTransaction.findMany({
          where: {
            giftCardId: Number(giftCardId)
          },
          include: {
            giftCard: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        // Tüm işlemleri getir (sayfalandırma ile)
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        transactions = await prisma.giftCardTransaction.findMany({
          skip,
          take: limit,
          include: {
            giftCard: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Toplam kayıt sayısı
        const total = await prisma.giftCardTransaction.count();

        return res.status(200).json({
          transactions,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        });
      }

      return res.status(200).json(transactions);
    } catch (error: any) {
      console.error('İşlem geçmişi alınırken hata:', error);
      await systemLog({
        type: 'ERROR',
        action: 'GIFT_CARD_TRANSACTIONS_LIST_FAILED',
        description: `İşlem geçmişi alınırken hata: ${error.message || 'Bilinmeyen hata'}`,
        ipAddress,
        userId: session.user?.id ? parseInt(session.user.id as string) : undefined
      });
      return res.status(500).json({ error: 'İşlem geçmişi alınırken bir hata oluştu.' });
    }
  }

  // POST methodu - Yeni işlem ekle (bakiye ekleme/çıkarma)
  if (req.method === 'POST') {
    try {
      const { giftCardId, amount, description } = req.body;

      // Gerekli alanları kontrol et
      if (!giftCardId) {
        return res.status(400).json({ error: 'Hediye kartı ID gereklidir.' });
      }

      if (amount === undefined || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Geçerli bir miktar belirtilmelidir.' });
      }

      // Bakiye için pozitif (yükleme) veya negatif (harcama) değer
      const amountValue = parseFloat(amount);

      // Hediye kartını getir
      const giftCard = await prisma.giftCard.findUnique({
        where: { id: Number(giftCardId) }
      });

      if (!giftCard) {
        await systemLog({
          type: 'WARNING',
          action: 'GIFT_CARD_NOT_FOUND',
          description: `Hediye kartı bulunamadı. ID: ${giftCardId}`,
          ipAddress,
          userId: session.user?.id ? parseInt(session.user.id as string) : undefined
        });
        return res.status(404).json({ error: 'Hediye kartı bulunamadı.' });
      }

      // Bakiye çıkarma işlemi için kontrol
      if (amountValue < 0 && Math.abs(amountValue) > giftCard.currentBalance) {
        await systemLog({
          type: 'WARNING',
          action: 'GIFT_CARD_INSUFFICIENT_BALANCE',
          description: `Yetersiz bakiye. Kart ID: ${giftCardId}, Mevcut: ${giftCard.currentBalance}, İstenen: ${Math.abs(amountValue)}`,
          ipAddress,
          userId: session.user?.id ? parseInt(session.user.id as string) : undefined
        });
        return res.status(400).json({ 
          error: 'Yetersiz bakiye.', 
          currentBalance: giftCard.currentBalance 
        });
      }

      // Transaction ile atomik olarak işlemi gerçekleştir
      const result = await prisma.$transaction(async (prismaClient) => {
        // Yeni işlem kaydı
        const transaction = await prismaClient.giftCardTransaction.create({
          data: {
            giftCardId: Number(giftCardId),
            amount: amountValue,
            description: description || (amountValue > 0 
              ? 'Bakiye yükleme (admin)' 
              : 'Bakiye düşme (admin)')
          }
        });

        // Hediye kartı bakiyesi güncelleme
        const newBalance = giftCard.currentBalance + amountValue;
        const newStatus = newBalance > 0 ? 'ACTIVE' : 'USED';

        const updatedGiftCard = await prismaClient.giftCard.update({
          where: { id: Number(giftCardId) },
          data: {
            currentBalance: newBalance,
            status: newStatus,
            ...(amountValue < 0 ? { lastUsed: new Date() } : {})
          }
        });

        return {
          transaction,
          updatedGiftCard
        };
      });

      // İşlem logunu kaydet
      await systemLog({
        type: 'INFO',
        action: 'GIFT_CARD_TRANSACTION_CREATED',
        description: `Hediye kartı işlemi oluşturuldu. Kart ID: ${giftCardId}, Miktar: ${amountValue}, Yeni Bakiye: ${result.updatedGiftCard.currentBalance}`,
        ipAddress,
        userId: session.user?.id ? parseInt(session.user.id as string) : undefined
      });

      // Kullanıcıya bildirim gönder (eğer kartın bir kullanıcısı varsa)
      if (result.updatedGiftCard.userId) {
        await prisma.notification.create({
          data: {
            userId: result.updatedGiftCard.userId,
            type: 'GIFT_CARD_UPDATED',
            message: amountValue > 0 
              ? `Hediye kartınıza ${amountValue} TL bakiye yüklendi. Yeni bakiye: ${result.updatedGiftCard.currentBalance} TL.`
              : `Hediye kartınızdan ${Math.abs(amountValue)} TL harcandı. Kalan bakiye: ${result.updatedGiftCard.currentBalance} TL.`,
            isRead: false
          }
        });
      }

      return res.status(200).json({
        success: true,
        transaction: result.transaction,
        giftCard: result.updatedGiftCard
      });
    } catch (error: any) {
      console.error('Hediye kartı işlemi oluşturulurken hata:', error);
      await systemLog({
        type: 'ERROR',
        action: 'GIFT_CARD_TRANSACTION_FAILED',
        description: `Hediye kartı işlemi oluşturulurken hata: ${error.message || 'Bilinmeyen hata'}`,
        ipAddress,
        userId: session.user?.id ? parseInt(session.user.id as string) : undefined
      });
      return res.status(500).json({ error: 'Hediye kartı işlemi oluşturulurken bir hata oluştu.' });
    }
  }

  // Desteklenmeyen metot
  return res.status(405).json({ error: 'Method Not Allowed' });
} 