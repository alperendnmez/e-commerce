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
  // Rate limit kontrolü
  try {
    await limiter.check(res, 30, 'REVIEWS_API');
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
    // Endpoint işlemleri
    // GET: Tüm değerlendirmeleri getir
    if (req.method === 'GET') {
      const {
        product,
        customer,
        status,
        rating,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = '1',
        limit = '10',
      } = req.query;

      // Filtreleme koşullarını oluştur
      const filters: any = {};

      // Ürün filtresi
      if (product) {
        filters.product = {
          name: {
            contains: product.toString(),
            mode: 'insensitive',
          },
        };
      }

      // Müşteri filtresi
      if (customer) {
        filters.user = {
          OR: [
            {
              firstName: {
                contains: customer.toString(),
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: customer.toString(),
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: customer.toString(),
                mode: 'insensitive',
              },
            },
          ],
        };
      }

      // Durum filtresi
      if (status && status !== 'all') {
        filters.status = status.toString().toUpperCase();
      }

      // Derecelendirme filtresi
      if (rating && rating !== 'all') {
        filters.rating = parseInt(rating.toString());
      }

      // Sayfalama ayarlarını yapılandır
      const pageNumber = parseInt(page.toString()) || 1;
      const pageSize = parseInt(limit.toString()) || 10;
      const skip = (pageNumber - 1) * pageSize;

      // Sıralama seçeneklerini belirle
      const orderBy: any = {};
      orderBy[sortBy.toString()] = sortOrder.toString().toLowerCase();

      // Değerlendirmeleri getir
      const reviews = await prisma.review.findMany({
        where: filters,
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
        },
        orderBy,
        skip,
        take: pageSize,
      });

      // Toplam değerlendirme sayısını getir
      const total = await prisma.review.count({
        where: filters,
      });

      // Son sayfa kontrolü ve hesaplaması
      const totalPages = Math.ceil(total / pageSize);
      const hasMore = pageNumber < totalPages;

      // Cevabı formatla ve gönder
      return res.status(200).json({
        reviews,
        pagination: {
          page: pageNumber,
          pageSize,
          total,
          totalPages,
          hasMore,
        },
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