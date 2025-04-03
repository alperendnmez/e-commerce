import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from '@/lib/rateLimit';
import { systemLog } from '@/lib/systemLogger';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 saniye
  uniqueTokenPerInterval: 500,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Review ID'sini al
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Geçerli bir değerlendirme ID gereklidir.' });
  }

  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'REVIEW_API');
  } catch (error) {
    return res.status(429).json({
      error: 'Rate limit aşıldı, lütfen daha sonra tekrar deneyin.'
    });
  }

  // Yetki kontrolü
  const session = await getServerSession(req, res, authOptions);
  if (!session || session?.user?.role !== 'ADMIN') {
    // Yetkisiz erişimi logla
    try {
      await systemLog({
        action: 'UNAUTHORIZED_ACCESS',
        description: `Yetkisiz erişim girişimi: ${req.method} ${req.url}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
      });
    } catch (error) {
      console.error('Log oluşturulamadı:', error);
    }

    return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }

  // Prisma istemcisini başlat
  const prisma = new PrismaClient();

  try {
    // GET: Değerlendirme detaylarını getir
    if (req.method === 'GET') {
      const review = await prisma.review.findUnique({
        where: { id: parseInt(id) },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrls: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              totalPrice: true,
            },
          },
        },
      });

      if (!review) {
        return res.status(404).json({ error: 'Değerlendirme bulunamadı.' });
      }

      return res.status(200).json({ review });
    }

    // DELETE: Değerlendirmeyi sil
    if (req.method === 'DELETE') {
      // Önce değerlendirmeyi getir
      const review = await prisma.review.findUnique({
        where: { id: parseInt(id) },
        include: {
          product: {
            select: { name: true },
          },
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!review) {
        return res.status(404).json({ error: 'Değerlendirme bulunamadı.' });
      }

      // Değerlendirmeyi sil
      await prisma.review.delete({
        where: { id: parseInt(id) },
      });

      // Log oluştur
      await systemLog({
        action: 'REVIEW_DELETED',
        description: `Değerlendirme silindi. Ürün: ${review.product.name}, Kullanıcı: ${review.user.firstName} ${review.user.lastName}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
        metadata: { reviewId: parseInt(id), productId: review.productId, userId: review.userId },
      });

      return res.status(200).json({
        success: true,
        message: 'Değerlendirme başarıyla silindi.',
      });
    }

    // Desteklenmeyen metot
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Hatası:', error);
    return res.status(500).json({ error: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
  } finally {
    await prisma.$disconnect();
  }
} 