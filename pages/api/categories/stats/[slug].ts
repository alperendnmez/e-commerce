import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { slug } = req.query as { slug: string };

  try {
    console.log(`GET /api/categories/stats/${slug} isteği alındı`);
    
    // Kategoriyi bul
    const category = await prisma.category.findUnique({
      where: { slug }
    });

    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    // Alt kategorileri de dahil et
    const allCategoryIds = await getAllCategoryIds(category.id);

    // Kategoriye ait ürünleri bul
    const products = await prisma.product.findMany({
      where: { 
        OR: [
          { categoryId: category.id },
          { categoryId: { in: allCategoryIds } }
        ]
      },
      include: {
        variants: true,
        orderItems: {
          include: {
            order: true
          }
        }
      }
    });

    // Temel istatistikleri hesapla
    const productCount = products.length;
    const activeProductCount = products.filter(p => p.published).length;
    
    // Stok hesapla
    let totalStock = 0;
    products.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          totalStock += variant.stock || 0;
        });
      } else {
        totalStock += (product as any).stock || 0;
      }
    });

    // Fiyat istatistikleri
    let prices: number[] = [];
    
    // Ürün ve varyant fiyatlarını topla
    products.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        // Varyantlar varsa, her bir varyantın fiyatını ekle
        product.variants.forEach(variant => {
          if (variant.price && !isNaN(Number(variant.price))) {
            prices.push(Number(variant.price));
          }
        });
      } else if ((product as any).price && !isNaN(Number((product as any).price))) {
        // Varyant yoksa, ürünün kendi fiyatını ekle
        prices.push(Number((product as any).price));
      }
    });
    
    // Daha sağlam ortalama fiyat hesaplaması
    let avgPrice = null;
    if (prices.length > 0) {
      const sum = prices.reduce((sum, price) => sum + price, 0);
      
      // Sıfıra bölme hatasını önlemek için kontrol
      avgPrice = prices.length > 0 ? sum / prices.length : null;
      
      // NaN veya Infinity değerleri için kontrol
      if (isNaN(avgPrice as number) || !isFinite(avgPrice as number)) {
        avgPrice = null;
      }
    }
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    // Sipariş istatistikleri
    const orders = new Set();
    let totalQuantitySold = 0;
    let totalRevenue = 0;

    products.forEach(product => {
      if (product.orderItems && product.orderItems.length > 0) {
        product.orderItems.forEach(item => {
          if (item.order) {
            orders.add(item.order.id);
            totalQuantitySold += item.quantity;
            totalRevenue += item.price * item.quantity;
          }
        });
      }
    });

    // Aylık satış verileri
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Tüm siparişleri al
    const allOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo
        },
        orderItems: {
          some: {
            product: {
              OR: [
                { categoryId: category.id },
                { categoryId: { in: allCategoryIds } }
              ]
            }
          }
        }
      },
      include: {
        orderItems: {
          where: {
            product: {
              OR: [
                { categoryId: category.id },
                { categoryId: { in: allCategoryIds } }
              ]
            }
          }
        }
      }
    });

    // Aylık satış verilerini oluştur
    const monthlySalesMap = new Map();
    
    allOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const monthYear = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
      
      if (!monthlySalesMap.has(monthYear)) {
        monthlySalesMap.set(monthYear, {
          month: new Date(orderDate.getFullYear(), orderDate.getMonth(), 1),
          orderCount: 0,
          totalQuantity: 0,
          totalRevenue: 0
        });
      }
      
      const monthData = monthlySalesMap.get(monthYear);
      monthData.orderCount += 1;
      
      order.orderItems.forEach(item => {
        monthData.totalQuantity += item.quantity;
        monthData.totalRevenue += item.price * item.quantity;
      });
    });
    
    // Son 6 ayı doldur (veri yoksa bile)
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlySalesMap.has(monthYear)) {
        monthlySalesMap.set(monthYear, {
          month: new Date(date.getFullYear(), date.getMonth(), 1),
          orderCount: 0,
          totalQuantity: 0,
          totalRevenue: 0
        });
      }
    }
    
    // Map'i diziye çevir ve sırala
    const monthlySales = Array.from(monthlySalesMap.values())
      .sort((a, b) => a.month.getTime() - b.month.getTime());

    // İstatistikleri döndür
    const stats = {
      productCount,
      activeProductCount,
      totalStock,
      avgPrice,
      minPrice,
      maxPrice,
      orderCount: orders.size,
      totalQuantitySold,
      totalRevenue,
      monthlySales
    };

    console.log(`${category.name} kategorisi için istatistikler hesaplandı`);
    return res.status(200).json(stats);
  } catch (error) {
    console.error(`GET /api/categories/stats/${slug} hatası:`, error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// Bir kategorinin tüm alt kategorilerini recursive olarak bulan yardımcı fonksiyon
async function getAllCategoryIds(categoryId: number): Promise<number[]> {
  const childCategories = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true }
  });
  
  const childIds = childCategories.map(c => c.id);
  
  if (childIds.length === 0) {
    return [];
  }
  
  const descendantIds = [];
  for (const childId of childIds) {
    const descendants = await getAllCategoryIds(childId);
    descendantIds.push(...descendants);
  }
  
  return [...childIds, ...descendantIds];
} 