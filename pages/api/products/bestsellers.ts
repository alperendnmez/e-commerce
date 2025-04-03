import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withErrorHandler, ApiError, ErrorType } from '@/lib/errorHandler';
import { OrderStatus } from '@prisma/client';

/**
 * En çok satılan ürünleri getiren API endpoint
 * 
 * Bu API, tamamlanmış siparişlerdeki ürünleri sayarak, en çok satılan ürünleri belirlemeye çalışır.
 * COMPLETED, DELIVERED ve SHIPPED statüsündeki siparişleri dikkate alır.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    throw new ApiError(
      ErrorType.VALIDATION,
      `HTTP ${req.method} metodu bu endpoint için geçerli değil`,
      { allowedMethods: ['GET'] }
    );
  }

  try {
    // Limit parametresini al, varsayılan olarak 10
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    // Geçerli siparişlerin durumları
    const validOrderStatuses: OrderStatus[] = [
      OrderStatus.COMPLETED, 
      OrderStatus.DELIVERED, 
      OrderStatus.SHIPPED
    ];

    // En çok satılan ürünleri bulmak için sorgu
    // OrderItem tablosunda productId'ye göre gruplama yaparak, her ürünün kaç kez sipariş edildiğini hesaplar
    const mostOrderedProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true
      },
      where: {
        order: {
          status: {
            in: validOrderStatuses
          }
        }
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: limit
    });

    // Eğer hiç sipariş edilmiş ürün yoksa, normal ürün sıralamasını kullan
    if (mostOrderedProducts.length === 0) {
      console.log('Tamamlanmış sipariş bulunamadı. Yeni ürünler listeleniyor.');
      
      const products = await prisma.product.findMany({
        where: {
          published: true
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          variants: {
            select: {
              id: true,
              price: true,
              stock: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
      
      return res.status(200).json(products);
    }

    // Bulunan ürün ID'lerini al
    const productIds = mostOrderedProducts.map(p => p.productId);

    // Sık satılan ürünlerin detaylı bilgilerini getir
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        },
        published: true
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        variants: {
          select: {
            id: true,
            price: true,
            stock: true
          }
        }
      }
    });

    // Ürünleri sipariş sayısına göre sırala
    const sortedProducts = products.sort((a, b) => {
      // Ürünün sipariş sayısını bul
      const aCount = mostOrderedProducts.find(p => p.productId === a.id)?._sum?.quantity || 0;
      const bCount = mostOrderedProducts.find(p => p.productId === b.id)?._sum?.quantity || 0;
      
      // Sıralama yap
      return bCount - aCount;
    });

    // Zenginleştirilmiş ürün bilgilerini döndür
    const enrichedProducts = sortedProducts.map(product => {
      // Varyantlardan en düşük fiyatı ve toplam stok miktarını hesapla
      let minPrice: number | null = null;
      let totalStock = 0;
      
      // Varyantları filtrele ve geçerli ID'leri olanları kullan
      const validVariants = product.variants.filter(variant => 
        variant.id !== null && variant.id !== undefined
      );
      
      if (validVariants.length > 0) {
        validVariants.forEach(variant => {
          if (variant.price !== null) {
            if (minPrice === null || variant.price < minPrice) {
              minPrice = variant.price;
            }
          }
          
          if (variant.stock !== null) {
            totalStock += variant.stock;
          }
        });
      }
      
      // Satış sayısını ekle
      const salesCount = mostOrderedProducts.find(p => p.productId === product.id)?._sum?.quantity || 0;
      
      return {
        ...product,
        price: validVariants.length > 0 ? minPrice : product.basePrice || 0,
        stock: totalStock,
        salesCount,
        // Filtrelenmiş geçerli varyantları gönder
        variants: validVariants
      };
    });

    res.status(200).json(enrichedProducts);
  } catch (error) {
    console.error('Bestsellers API hatası:', error);
    throw new ApiError(
      ErrorType.INTERNAL,
      'En çok satanlar verisi yüklenirken bir hata oluştu.'
    );
  }
}

export default withErrorHandler(handler); 