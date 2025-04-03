import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      categoryId,
      categorySlug,
      search,
      minPrice,
      maxPrice,
      sort,
      brands,
      inStock,
      page = "1",
      pageSize = "12"
    } = req.query;

    // Sayfa numarasını ve sayfa başına ürün sayısını sayıya çevir
    const pageNumber = parseInt(page as string, 10) || 1;
    const itemsPerPage = parseInt(pageSize as string, 10) || 12;
    const skip = (pageNumber - 1) * itemsPerPage;

    let categoryIds: number[] = [];
    
    // CategoryId veya categorySlug ile kategori bilgisini al
    if (categorySlug && typeof categorySlug === 'string') {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: {
          children: {
            select: { id: true }
          }
        }
      });
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Ana kategori ve alt kategorilerin ID'lerini topla
      categoryIds = [category.id, ...category.children.map(c => c.id)];
    } 
    else if (categoryId && typeof categoryId === 'string') {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
        include: {
          children: {
            select: { id: true }
          }
        }
      });
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Ana kategori ve alt kategorilerin ID'lerini topla
      categoryIds = [category.id, ...category.children.map(c => c.id)];
    }

    // Filtre kriterlerini hazırla
    const whereClause: any = {
      categoryId: {
        in: categoryIds.length > 0 ? categoryIds : undefined
      },
      published: true
    };

    // Arama filtresi
    if (search && typeof search === 'string' && search.trim() !== '') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fiyat filtresi
    if ((minPrice && typeof minPrice === 'string') || (maxPrice && typeof maxPrice === 'string')) {
      whereClause.variants = {
        some: {
          ...(minPrice ? { price: { gte: parseFloat(minPrice) } } : {}),
          ...(maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {})
        }
      };
    }

    // Marka filtresi
    if (brands) {
      const brandArray = Array.isArray(brands) ? brands : [brands];
      if (brandArray.length > 0) {
        whereClause.brandId = {
          in: brandArray.map(b => parseInt(b as string))
        };
      }
    }

    // Stok durumu filtresi
    if (inStock === 'true') {
      whereClause.variants = {
        some: {
          stock: { gt: 0 }
        }
      };
    }

    // Sıralama seçenekleri
    let orderBy: any = { createdAt: 'desc' }; // Varsayılan sıralama

    if (sort && typeof sort === 'string') {
      switch (sort) {
        case 'price_asc':
          orderBy = { variants: { _count: 'asc' } };
          break;
        case 'price_desc':
          orderBy = { variants: { _count: 'desc' } };
          break;
        case 'name_asc':
          orderBy = { name: 'asc' };
          break;
        case 'name_desc':
          orderBy = { name: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }
    }

    // Toplam ürün sayısını hesapla
    const totalProducts = await prisma.product.count({
      where: whereClause
    });

    // Filtrelenen ürünleri getir
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        brand: {
          select: {
            name: true,
            id: true
          }
        },
        variants: {
          select: {
            price: true,
            stock: true
          },
          take: 1,
          orderBy: {
            price: 'asc'
          }
        },
        category: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      skip,
      take: itemsPerPage,
      orderBy
    });

    // Kategoride bulunan tüm markaları getir (filtre için)
    const brandsInCategory = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            categoryId: {
              in: categoryIds
            }
          }
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Sonuçları döndür
    return res.status(200).json({
      products,
      totalProducts,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / itemsPerPage),
      brandsInCategory
    });
  } catch (error) {
    console.error('Product filtering error:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
} 