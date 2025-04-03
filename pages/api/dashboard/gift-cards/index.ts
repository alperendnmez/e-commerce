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

    // GET - Tüm hediye kartlarını getir
    if (req.method === 'GET') {
      try {
        const giftCards = await prisma.giftCard.findMany({
          orderBy: [
            { createdAt: 'desc' }
          ]
        });

        return res.status(200).json(giftCards);
      } catch (error) {
        console.error('Hediye kartları getirilirken hata oluştu:', error);
        return res.status(500).json({ error: 'Hediye kartları getirilirken hata oluştu' });
      }
    } 
    // POST - Yeni hediye kartı oluştur
    else if (req.method === 'POST') {
      try {
        const { code, initialBalance, validFrom, validUntil, status, userId } = req.body;

        // Kod kontrolü
        const existingGiftCard = await prisma.giftCard.findUnique({
          where: {
            code: code
          }
        });

        if (existingGiftCard) {
          return res.status(400).json({ error: 'Bu kod ile bir hediye kartı zaten mevcut' });
        }

        // Yeni hediye kartı oluştur
        const newGiftCard = await prisma.giftCard.create({
          data: {
            code,
            initialBalance,
            currentBalance: initialBalance, // Başlangıçta bakiye aynı
            validFrom: validFrom ? new Date(validFrom) : new Date(),
            validUntil: new Date(validUntil),
            status,
            userId: userId || null
          }
        });

        return res.status(201).json(newGiftCard);
      } catch (error) {
        console.error('Hediye kartı oluşturulurken hata oluştu:', error);
        return res.status(500).json({ error: 'Hediye kartı oluşturulurken hata oluştu' });
      }
    } else {
      return res.status(405).json({ error: `Metod izin verilmiyor: ${req.method}` });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
} 