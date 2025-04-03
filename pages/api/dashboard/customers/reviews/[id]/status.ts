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
    await limiter.check(res, 20, 'REVIEW_STATUS_API');
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
    // PUT: Değerlendirme durumunu güncelle
    if (req.method === 'PUT') {
      const { status, adminFeedback } = req.body;
      
      // Gerekli alanları kontrol et
      if (!status || !['pending', 'approved', 'rejected'].includes(status.toLowerCase())) {
        return res.status(400).json({ 
          error: 'Geçerli bir durum değeri gereklidir (pending, approved, rejected).' 
        });
      }

      // Değerlendirmeyi kontrol et
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

      // Değerlendirme durumunu güncelle
      const updatedReview = await prisma.review.update({
        where: { id: parseInt(id) },
        data: {
          status: status.toUpperCase(),
          updatedAt: new Date(),
        },
      });

      // Log oluştur
      await systemLog({
        action: 'REVIEW_STATUS_UPDATED',
        description: `Değerlendirme durumu "${status}" olarak güncellendi. Ürün: ${review.product.name}, Kullanıcı: ${review.user.firstName} ${review.user.lastName}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
        metadata: { reviewId: parseInt(id), productId: review.productId, userId: review.userId },
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Değerlendirme durumu başarıyla güncellendi.',
        status: updatedReview.status
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