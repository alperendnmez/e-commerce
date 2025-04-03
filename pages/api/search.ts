import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from '@/lib/rateLimit';

// Arama isteklerini hız sınırlaması ile koruyoruz
const limiter = rateLimit({
  interval: 60 * 1000, // 60 saniye
  uniqueTokenPerInterval: 500,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Sadece GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Rate limit kontrolü
    await limiter.check(res, 10, 'SEARCH_API'); // Saniyede maksimum 10 istek
  } catch (error) {
    return res.status(429).json({ 
      message: 'Rate limit aşıldı, lütfen daha sonra tekrar deneyin.' 
    });
  }

  const { q } = req.query;
  
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ message: 'Geçerli bir arama sorgusu gerekli' });
  }

  const searchTerm = q.trim();
  const prisma = new PrismaClient();

  try {
    // Arama sonuçları için maksimum kayıt sayısı
    const maxResults = 5;

    // Eşzamanlı olarak birden fazla aramayı gerçekleştir
    const [products, categories, brands] = await Promise.all([
      // Ürün araması
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ],
          published: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          imageUrls: true,
          basePrice: true,
          variants: {
            where: { stock: { gt: 0 } },
            orderBy: { price: 'asc' },
            take: 1, 
            select: {
              price: true
            }
          },
          category: {
            select: {
              name: true,
              slug: true
            }
          },
          brand: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        take: maxResults,
      }),

      // Kategori araması
      prisma.category.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { seoKeywords: { contains: searchTerm, mode: 'insensitive' } }
          ],
          isActive: true,
          isArchived: false
        },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          iconUrl: true,
        },
        take: maxResults,
      }),

      // Marka araması
      prisma.brand.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { seoKeywords: { contains: searchTerm, mode: 'insensitive' } }
          ],
          isActive: true,
          isArchived: false
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
        take: maxResults,
      }),
    ]);

    // Ürün sonuçlarını formatlama
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      type: 'product',
      url: `/urunler/${product.slug}`,
      imageUrl: product.thumbnail || (product.imageUrls?.length > 0 ? product.imageUrls[0] : null),
      price: product.variants.length > 0 ? product.variants[0].price : product.basePrice,
      category: product.category?.name,
      brand: product.brand?.name,
    }));

    // Kategori sonuçlarını formatlama
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      type: 'category',
      url: `/kategoriler/${category.slug}`,
      imageUrl: category.imageUrl || category.iconUrl,
    }));

    // Marka sonuçlarını formatlama
    const formattedBrands = brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      type: 'brand',
      url: `/markalar/${brand.slug}`,
      imageUrl: brand.logoUrl,
    }));

    // Tüm sonuçları birleştir
    const results = {
      products: formattedProducts,
      categories: formattedCategories,
      brands: formattedBrands,
      // Her kategorideki sonuç sayısı
      counts: {
        total: formattedProducts.length + formattedCategories.length + formattedBrands.length,
        products: formattedProducts.length,
        categories: formattedCategories.length,
        brands: formattedBrands.length,
      }
    };

    return res.status(200).json(results);
  } catch (error) {
    console.error('Arama hatası:', error);
    return res.status(500).json({ message: 'Arama yapılırken bir hata oluştu' });
  } finally {
    await prisma.$disconnect();
  }
} 