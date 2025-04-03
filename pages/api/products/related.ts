import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { productId, categoryId, limit = 4 } = req.query;

  if (req.method === 'GET') {
    try {
      let relatedProducts: any[] = [];
      
      // Ürün ID'si ve kategori ID'si kontrol et
      if (!productId && !categoryId) {
        return res.status(400).json({ error: 'Ürün ID veya kategori ID gerekli' });
      }
      
      // İlgili ürünleri getir
      if (productId) {
        // Aynı ürünü çıkar, aynı kategoriden ürünleri getir
        const product = await prisma.product.findUnique({
          where: { id: parseInt(productId as string) },
          select: { categoryId: true }
        });
        
        if (!product) {
          return res.status(404).json({ error: 'Ürün bulunamadı' });
        }
        
        relatedProducts = await prisma.product.findMany({
          where: {
            categoryId: product.categoryId,
            id: { not: parseInt(productId as string) },
            published: true
          },
          include: {
            variants: {
              include: {
                variantValues: true,
              },
              take: 1, // Her ürün için sadece 1 varyantı dahil et (performans için)
            },
          },
          take: parseInt(limit as string),
        });
      } else if (categoryId) {
        // Kategoriye göre ürün getir
        relatedProducts = await prisma.product.findMany({
          where: {
            categoryId: parseInt(categoryId as string),
            published: true
          },
          include: {
            variants: {
              include: {
                variantValues: true,
              },
              take: 1, // Her ürün için sadece 1 varyantı dahil et (performans için)
            },
          },
          take: parseInt(limit as string),
        });
      }
      
      // İlgili ürünleri istenilen formatta formatla
      const formattedProducts = relatedProducts.map(product => {
        // Minimum fiyatı bul
        const minPrice = product.variants.length > 0 
          ? Math.min(...product.variants.map((v: any) => v.price)) 
          : 0;
        
        // Resim URL'leri
        let imageUrl = '';
        if (product.imageUrls && product.imageUrls.length > 0) {
          imageUrl = product.imageUrls[0];
        } else if (product.variants.length > 0) {
          for (const variant of product.variants) {
            if (variant.imageUrls && variant.imageUrls.length > 0) {
              imageUrl = variant.imageUrls[0];
              break;
            }
          }
        }
        
        // Formatlanmış ürün
        return {
          id: product.id,
          title: product.name,
          price: `${minPrice.toFixed(2)} TL`,
          discountedPrice: '', // İndirim varsa buraya eklenebilir
          discountPrecent: '', // İndirim yüzdesi varsa buraya eklenebilir
          isHot: false, // Varsayılan değer
          img: {
            src: imageUrl || '/default-image.jpg'
          },
          slug: product.slug
        };
      });
      
      // İlgili ürünleri döndür
      return res.status(200).json({
        title: 'Benzer Ürünler',
        href: '/urunler',
        relateds: formattedProducts
      });
    } catch (error) {
      console.error('İlgili ürünler alınırken hata:', error);
      return res.status(500).json({ error: 'İlgili ürünler alınırken bir hata oluştu' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 