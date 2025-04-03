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
    console.log(`GET /api/brands/stats/${slug} isteği alındı`);
    
    // Markayı bul
    const brand = await prisma.brand.findUnique({
      where: { slug }
    });

    if (!brand) {
      return res.status(404).json({ message: 'Marka bulunamadı' });
    }

    // Markaya ait ürünleri bul
    const products = await prisma.product.findMany({
      where: { brandId: brand.id },
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
        totalStock += product.stock || 0;
      }
    });

    // Fiyat istatistikleri
    const prices = products.map(p => p.price).filter(Boolean) as number[];
    const avgPrice = prices.length > 0 
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
      : null;
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
              brandId: brand.id
            }
          }
        }
      },
      include: {
        orderItems: {
          where: {
            product: {
              brandId: brand.id
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

    console.log(`${brand.name} markası için istatistikler hesaplandı`);
    return res.status(200).json(stats);
  } catch (error) {
    console.error(`GET /api/brands/stats/${slug} hatası:`, error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
} 