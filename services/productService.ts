import prisma from '@/lib/prisma';
import { ApiError, ErrorType } from '@/lib/errorHandler';
import { Prisma, Product } from '@prisma/client';

/**
 * Ürün servisi - Tüm ürün işlemlerini yönetir
 */
export class ProductService {
  /**
   * Ürün ID'sine göre ürün bilgilerini getirir
   */
  async getProductById(productId: number) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: true,
          category: true,
          brand: true
        }
      });

      if (!product) {
        throw new ApiError(ErrorType.NOT_FOUND, `Product with ID ${productId} not found`);
      }

      return product;
    } catch (error) {
      console.error('Error fetching product:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to fetch product');
    }
  }

  /**
   * Ürün varyantını ID'ye göre getirir
   */
  async getVariantById(variantId: number) {
    try {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: true
        }
      });

      if (!variant) {
        throw new ApiError(ErrorType.NOT_FOUND, `Variant with ID ${variantId} not found`);
      }

      return variant;
    } catch (error) {
      console.error('Error fetching variant:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to fetch product variant');
    }
  }

  /**
   * Birden fazla ürünü toplu olarak getirir
   */
  async getProductsByIds(productIds: number[]) {
    try {
      const products = await prisma.product.findMany({
        where: {
          id: {
            in: productIds
          }
        },
        include: {
          variants: true,
          category: true,
          brand: true
        }
      });

      return products;
    } catch (error) {
      console.error('Error fetching products by IDs:', error);
      throw new ApiError(ErrorType.INTERNAL, 'Failed to fetch products');
    }
  }

  /**
   * Filtreleme koşullarına göre ürün listesi getirir
   */
  async getProducts({
    page = 1,
    limit = 10,
    search,
    categoryId,
    brandId,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    brandId?: number | number[];
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const skip = (page - 1) * limit;

      // Filtreleme koşullarını oluştur
      const where: Prisma.ProductWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (brandId) {
        if (Array.isArray(brandId)) {
          where.brandId = { in: brandId };
        } else {
          where.brandId = brandId;
        }
      }

      if (minPrice || maxPrice) {
        where.variants = {
          some: {
            AND: [
              minPrice ? { price: { gte: minPrice } } : {},
              maxPrice ? { price: { lte: maxPrice } } : {}
            ]
          }
        };
      }

      // Aktif ürünleri getir
      where.published = true;

      console.log('Ürün filtreleme koşulları:', where);

      // Toplam sayıyı getir
      const total = await prisma.product.count({ where });

      // Sıralama ayarları
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Ürünleri getir
      const products = await prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
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
              stock: true,
              productId: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      });

      return {
        products,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new ApiError(ErrorType.INTERNAL, 'Failed to fetch products');
    }
  }
}

// Singleton olarak bir örnek oluştur ve dışa aktar
export const productService = new ProductService();

// Tip tanımlamaları
type GetProductsOptions = {
  limit?: number;
  page?: number;
  categoryId?: number;
  brandId?: number | number[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  published?: boolean;
};

type ProductWithPriceAndStock = Product & {
  price: number;
  stock: number;
  variants?: any[];
  category?: any;
  brand?: any;
  variantGroups?: any[];
};

// Ürün fiyatını hesapla ve döndür - Varyantları ve basePrice'ı dikkate alacak şekilde güncellendi
export async function getProductPrice(productId: number): Promise<number> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          select: {
            price: true
          }
        }
      }
    });

    if (!product) {
      throw new Error('Ürün bulunamadı');
    }

    // Varyantlar varsa ve sayısı 0'dan büyükse
    if (product.variants && product.variants.length > 0) {
      // Varyantların fiyatlarını al
      const variantPrices = product.variants.map(v => v.price);
      
      // Minimum fiyatı döndür
      return Math.min(...variantPrices);
    }

    // Varyant yoksa basePrice'ı döndür (basePrice tipini belirtelim)
    const basePrice = (product as unknown as { basePrice: number }).basePrice || 0;
    return basePrice;
  } catch (error) {
    console.error('Ürün fiyatı alınırken hata:', error);
    return 0;
  }
}

// Ürünleri getir - varyantı olmayan ürünler için basePrice'ı kullanan güncellendi
export async function getProducts(options: GetProductsOptions = {}): Promise<ProductWithPriceAndStock[]> {
  try {
    const {
      limit = 10,
      page = 1,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      published = true
    } = options;

    const where: Prisma.ProductWhereInput = { published };
    
    // ... existing code ...

    const skip = (page - 1) * limit;
    
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            variantValues: {
              include: {
                variantGroup: true
              }
            }
          }
        },
        variantGroups: {
          include: {
            values: true
          }
        }
      }
    });

    // Ürünleri fiyat ve stok bilgileriyle zenginleştir
    const enrichedProducts = products.map(product => {
      // Eğer varyant yoksa basePrice'ı, varsa varyantların minimum fiyatını kullan
      const hasVariants = product.variants && product.variants.length > 0;
      
      // basePrice'ı güvenli bir şekilde çıkaralım
      const basePrice = (product as unknown as { basePrice: number }).basePrice || 0;
      let price = basePrice;
      let totalStock = 0;
      
      if (hasVariants) {
        // Varyantlardan minimum fiyatı bul
        const variantPrices = product.variants.map(v => v.price);
        if (variantPrices.length > 0) {
          price = Math.min(...variantPrices);
        }
        
        // Toplam stok miktarını hesapla
        totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      }
      
      return {
        ...product,
        price,
        stock: totalStock
      };
    });

    return enrichedProducts;
  } catch (error) {
    console.error('Ürünler alınırken hata:', error);
    return [];
  }
} 