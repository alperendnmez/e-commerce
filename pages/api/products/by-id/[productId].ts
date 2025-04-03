import { NextApiRequest, NextApiResponse } from 'next';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

// ID ile ürün işlemleri yapan handler
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { productId } = req.query;
  
  if (!productId || Array.isArray(productId)) {
    return res.status(400).json({ error: 'Geçerli bir ürün ID\'si sağlanmalıdır.' });
  }

  const productIdNumber = parseInt(productId, 10);
  
  if (isNaN(productIdNumber)) {
    return res.status(400).json({ error: 'Geçerli bir ürün ID\'si sağlanmalıdır.' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const product = await prisma.product.findUnique({
          where: { id: productIdNumber },
          include: {
            variants: true,
            variantGroups: {
              include: {
                values: true
              }
            },
            category: true,
            brand: true
          }
        });

        if (!product) {
          return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        return res.status(200).json(product);
      } catch (error) {
        console.error('Ürün detayları alınırken hata:', error);
        return res.status(500).json({ error: 'Ürün bilgileri alınırken bir hata oluştu' });
      }

    case 'PUT':
      try {
        const {
          name,
          description,
          slug,
          categoryId,
          brandId,
          published,
          seoTitle,
          seoDescription,
          imageUrls,
          variants
        } = req.body;

        // Önce ürünü güncelle
        const updatedProduct = await prisma.product.update({
          where: { id: productIdNumber },
          data: {
            name,
            description,
            slug,
            categoryId,
            brandId,
            published,
            seoTitle,
            seoDescription,
            imageUrls
          }
        });

        // Varyantları güncelle
        if (variants && variants.length > 0) {
          for (const variant of variants) {
            if (variant.id) {
              // Mevcut varyantı güncelle
              await prisma.productVariant.update({
                where: { id: variant.id },
                data: {
                  price: variant.price,
                  stock: variant.stock
                }
              });
            } else {
              // Yeni varyant ekle
              await prisma.productVariant.create({
                data: {
                  productId: productIdNumber,
                  price: variant.price,
                  stock: variant.stock
                }
              });
            }
          }
        }

        return res.status(200).json({
          message: 'Ürün başarıyla güncellendi',
          product: updatedProduct
        });
      } catch (error) {
        console.error('Ürün güncellenirken hata:', error);
        return res.status(500).json({ error: 'Ürün güncellenirken bir hata oluştu' });
      }
      
    case 'DELETE':
      try {
        // Önce ürünün var olup olmadığını kontrol et
        const productToDelete = await prisma.product.findUnique({
          where: { id: productIdNumber },
          include: {
            variants: {
              include: {
                variantValues: true
              }
            },
            variantGroups: {
              include: {
                values: true
              }
            },
            favoritedBy: true,
            cartItems: true,
            orderItems: true
          },
        });

        if (!productToDelete) {
          return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        // İşlemi transaction içinde yap - tüm silme işlemlerinin ya hepsi başarılı olur ya da hiçbiri olmaz
        await prisma.$transaction(async (tx) => {
          // 1. Favori listelerinden sil
          if (productToDelete.favoritedBy.length > 0) {
            await tx.userFavoriteProducts.deleteMany({
              where: { productId: productIdNumber }
            });
          }
          
          // 2. Sepet öğelerini sil
          if (productToDelete.cartItems.length > 0) {
            await tx.cartItem.deleteMany({
              where: { productId: productIdNumber }
            });
          }
          
          // 3. Sipariş öğeleri varsa yönet (gerçek bir sistemde bunları silmek yerine deactive edebiliriz)
          if (productToDelete.orderItems.length > 0) {
            // NOT: Bu örnekte siliyoruz, ancak gerçek dünyada eski siparişlerde ürün bilgilerini kaybetmemek gerekebilir
            await tx.orderItem.deleteMany({
              where: { productId: productIdNumber }
            });
          }

          // 4. Varyant değerlerini sil - her varyant için variantValues ilişkisini kaldır
          for (const variant of productToDelete.variants) {
            if (variant.variantValues.length > 0) {
              // variantValues tablosundaki ilişkileri kaldır
              await tx.productVariant.update({
                where: { id: variant.id },
                data: { variantValues: { set: [] } }
              });
            }
          }
          
          // 5. Varyantları sil
          await tx.productVariant.deleteMany({
            where: { productId: productIdNumber }
          });
          
          // 6. Varyant değerlerini sil
          for (const group of productToDelete.variantGroups) {
            await tx.variantValue.deleteMany({
              where: { variantGroupId: group.id }
            });
          }
          
          // 7. Varyant gruplarını sil
          await tx.variantGroup.deleteMany({
            where: { productId: productIdNumber }
          });
          
          // 8. Son olarak ürünü sil
          await tx.product.delete({
            where: { id: productIdNumber }
          });
        });

        return res.status(200).json({ 
          message: 'Ürün ve tüm ilişkili veriler başarıyla silindi.',
          deletedProduct: {
            id: productToDelete.id,
            name: productToDelete.name,
            slug: productToDelete.slug
          }
        });
      } catch (error: any) {
        console.error(`DELETE /api/products/by-id/${productId} hatası:`, error);
        
        // Daha detaylı hata mesajı
        return res.status(500).json({ 
          error: 'Ürün silinirken hata oluştu.',
          details: error.message,
          code: error.code
        });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez.` });
  }
};

export default withAdmin(withErrorHandler(handler)); 