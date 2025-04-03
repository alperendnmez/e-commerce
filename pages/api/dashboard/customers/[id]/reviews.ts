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
  // Customer ID'sini al
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz müşteri ID' });
  }

  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'CUSTOMER_REVIEWS_API');
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
    // Müşterinin var olup olmadığını kontrol et
    const customer = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Müşteri bulunamadı.' });
    }

    // GET: Müşterinin değerlendirmelerini getir
    if (req.method === 'GET') {
      const reviews = await prisma.productReview.findMany({
        where: { userId: parseInt(id) },
        include: {
          product: {
            include: {
              brand: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // Değerlendirmeleri formatla
      const formattedReviews = reviews.map(review => ({
        id: review.id,
        productId: review.productId,
        rating: review.rating,
        title: review.title || '',
        comment: review.comment || '',
        status: review.isApproved ? 'Onaylandı' : 'Onay bekliyor',
        createdAt: review.createdAt.toISOString(),
        product: {
          name: review.product.name,
          slug: review.product.slug,
          imageUrl: review.product.thumbnail || 
            (review.product.imageUrls && review.product.imageUrls.length > 0 
              ? review.product.imageUrls[0] 
              : null),
          brand: review.product.brand?.name,
          category: review.product.category?.name,
        }
      }));

      return res.status(200).json(formattedReviews);
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