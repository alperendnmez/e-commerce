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
    await limiter.check(res, 20, 'CUSTOMER_FAVORITES_API');
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

    // GET: Müşterinin favori ürünlerini getir
    if (req.method === 'GET') {
      const favorites = await prisma.userFavoriteProducts.findMany({
        where: { userId: parseInt(id) },
        include: {
          product: {
            include: {
              brand: true,
              category: true,
              variants: {
                where: {
                  stock: { gt: 0 }
                },
                orderBy: {
                  price: 'asc'
                },
                take: 1
              }
            }
          }
        }
      });

      // Favori ürünleri formatla
      const formattedFavorites = favorites.map(favorite => ({
        id: favorite.userId + '_' + favorite.productId, // Benzersiz bir ID oluştur
        productId: favorite.productId,
        addedAt: new Date().toISOString(), // Yaratılma tarihi mevcut değilse şu anki tarih
        product: {
          id: favorite.product.id,
          name: favorite.product.name,
          slug: favorite.product.slug,
          imageUrl: favorite.product.thumbnail || 
            (favorite.product.imageUrls && favorite.product.imageUrls.length > 0 
              ? favorite.product.imageUrls[0] 
              : null),
          price: favorite.product.variants.length > 0 
            ? favorite.product.variants[0].price 
            : favorite.product.basePrice,
          brand: favorite.product.brand?.name,
          category: favorite.product.category?.name,
          inStock: favorite.product.variants.length > 0,
        }
      }));

      return res.status(200).json(formattedFavorites);
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