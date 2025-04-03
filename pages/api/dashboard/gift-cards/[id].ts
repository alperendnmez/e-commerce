import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Yetkilendirme kontrolü
    const session = await getServerSession(req, res, authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' });
    }

    const { id } = req.query;
    const giftCardId = parseInt(id as string);

    if (isNaN(giftCardId)) {
      return res.status(400).json({ error: 'Geçersiz hediye kartı ID' });
    }

    // GET - Belirli bir hediye kartını getir
    if (req.method === 'GET') {
      try {
        const giftCard = await prisma.giftCard.findUnique({
          where: { id: giftCardId },
          include: {
            transactions: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        if (!giftCard) {
          return res.status(404).json({ error: 'Hediye kartı bulunamadı' });
        }

        return res.status(200).json(giftCard);
      } catch (error) {
        console.error('Hediye kartı getirilirken hata oluştu:', error);
        return res.status(500).json({ error: 'Hediye kartı getirilirken hata oluştu' });
      }
    } 
    // PUT - Hediye kartını güncelle
    else if (req.method === 'PUT') {
      try {
        const { code, initialBalance, validFrom, validUntil, status, userId } = req.body;

        // Hediye kartının mevcut durumu
        const existingGiftCard = await prisma.giftCard.findUnique({
          where: { id: giftCardId }
        });

        if (!existingGiftCard) {
          return res.status(404).json({ error: 'Hediye kartı bulunamadı' });
        }

        // Kod değişiyorsa, yeni kodun benzersiz olup olmadığını kontrol et
        if (code !== existingGiftCard.code) {
          const codeExists = await prisma.giftCard.findUnique({
            where: { code }
          });
          
          if (codeExists) {
            return res.status(400).json({ error: 'Bu kod ile bir hediye kartı zaten mevcut' });
          }
        }

        // Mevcut bakiye hesaplaması
        let currentBalance = existingGiftCard.currentBalance;
        if (initialBalance !== existingGiftCard.initialBalance) {
          // Eğer başlangıç bakiyesi değiştiyse, mevcut bakiyeyi orantılı olarak güncelle
          const usedAmount = existingGiftCard.initialBalance - existingGiftCard.currentBalance;
          currentBalance = Math.max(0, initialBalance - usedAmount);
        }

        // Hediye kartını güncelle
        const updatedGiftCard = await prisma.giftCard.update({
          where: { id: giftCardId },
          data: {
            code,
            initialBalance,
            currentBalance,
            validFrom: validFrom ? new Date(validFrom) : existingGiftCard.validFrom,
            validUntil: validUntil ? new Date(validUntil) : existingGiftCard.validUntil,
            status,
            userId: userId ? parseInt(userId) : null
          }
        });

        return res.status(200).json(updatedGiftCard);
      } catch (error) {
        console.error('Hediye kartı güncellenirken hata oluştu:', error);
        return res.status(500).json({ error: 'Hediye kartı güncellenirken hata oluştu' });
      }
    } 
    // DELETE - Hediye kartını sil
    else if (req.method === 'DELETE') {
      try {
        // İlişkili işlemleri sil
        await prisma.giftCardTransaction.deleteMany({
          where: { giftCardId }
        });

        // Hediye kartını sil
        await prisma.giftCard.delete({
          where: { id: giftCardId }
        });

        return res.status(200).json({ message: 'Hediye kartı başarıyla silindi' });
      } catch (error) {
        console.error('Hediye kartı silinirken hata oluştu:', error);
        return res.status(500).json({ error: 'Hediye kartı silinirken hata oluştu' });
      }
    } else {
      return res.status(405).json({ error: `Metod izin verilmiyor: ${req.method}` });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
} 