import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query;

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Geçersiz slug' });
  }

  switch (req.method) {
    case 'GET': // Herkes için açık
      try {
        const product = await prisma.product.findUnique({
          where: { slug },
          include: {
            brand: true,
            category: true,
            variants: {
              include: {
                variantValues: {
                  include: {
                    variantGroup: true,
                  }
                },
              },
            },
            variantGroups: {
              include: {
                values: true,
              },
            },
          },
        });

        if (!product) {
          return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        // Kategori ve marka bilgilerini ID'leri ile birlikte ekle
        const enhancedProduct = {
          ...product,
          categoryId: product.categoryId,
          brandId: product.brandId,
        };

        // Ürün verilerini doğrudan döndür - frontend'de işlenecek
        return res.status(200).json(enhancedProduct);
      } catch (error) {
        console.error('Ürün detayları alınırken hata:', error);
        return res.status(500).json({ error: 'Ürün bilgileri alınırken bir hata oluştu' });
      }

    case 'PUT': // Published veya detayları güncelleme
      try {
        const {
          name,
          description,
          seoTitle,
          seoDescription,
          brandId,
          categoryId,
          published,
          price,
          comparativePrice,
          taxIncluded,
          costPerItem,
          images,
          sku,
          barcode,
          isPhysicalProduct,
          weight,
          weightUnit,
          countryOfOrigin,
          hsCode
        } = req.body;

        if (typeof published !== 'undefined') {
          const updatedProduct = await prisma.product.update({
            where: { slug },
            data: { published },
          });

          return res
            .status(200)
            .json({
              message: `Ürün yayına ${published ? 'alındı' : 'kaldırıldı'}`,
              product: updatedProduct,
            });
        }

        if (!name || !brandId || !categoryId) {
          return res.status(400).json({ error: 'Tüm alanlar doldurulmalıdır.' });
        }

        // Güncelleme verilerini hazırla
        const updateData: any = {
          name,
          description,
          seoTitle,
          seoDescription,
          brandId: parseInt(brandId),
          categoryId: parseInt(categoryId),
          slug: name.toLowerCase().replace(/\s+/g, '-'),
        };

        // Fiyat bilgisi varsa ekle
        if (price !== undefined) {
          updateData.basePrice = parseFloat(price);
        }

        // Karşılaştırma fiyatı bilgisi varsa ekle
        if (comparativePrice !== undefined) {
          updateData.comparativePrice = comparativePrice ? parseFloat(comparativePrice) : null;
        }

        // Vergi bilgisi varsa ekle
        if (taxIncluded !== undefined) {
          updateData.taxIncluded = Boolean(taxIncluded);
        }

        // Maliyet bilgisi varsa ekle
        if (costPerItem !== undefined) {
          updateData.costPerItem = costPerItem ? parseFloat(costPerItem) : null;
        }

        // Görsel bilgisi varsa ekle
        if (images && Array.isArray(images)) {
          updateData.imageUrls = images;
        }

        // SKU bilgisi varsa ekle
        if (sku !== undefined) {
          updateData.sku = sku;
        }

        // Barkod bilgisi varsa ekle
        if (barcode !== undefined) {
          updateData.barcode = barcode;
        }
        
        // Fiziksel ürün bilgisi varsa ekle
        if (isPhysicalProduct !== undefined) {
          updateData.isPhysicalProduct = Boolean(isPhysicalProduct);
        }
        
        // Ağırlık bilgisi varsa ekle
        if (weight !== undefined) {
          updateData.weight = weight ? parseFloat(weight) : null;
        }
        
        // Ağırlık birimi bilgisi varsa ekle
        if (weightUnit !== undefined) {
          updateData.weightUnit = weightUnit;
        }
        
        // Menşe ülke bilgisi varsa ekle
        if (countryOfOrigin !== undefined) {
          updateData.countryOfOrigin = countryOfOrigin;
        }
        
        // HS kodu bilgisi varsa ekle
        if (hsCode !== undefined) {
          updateData.hsCode = hsCode;
        }

        const updatedProduct = await prisma.product.update({
          where: { slug },
          data: updateData,
        });

        return res.status(200).json(updatedProduct);
      } catch (error) {
        console.error(`PUT /api/products/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Ürün güncellenirken hata oluştu.' });
      }

    case 'DELETE': // Ürün ve varyantları silme
      try {
        const productToDelete = await prisma.product.findUnique({
          where: { slug },
          include: {
            variants: true,
          },
        });

        if (!productToDelete) {
          return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        await prisma.productVariant.deleteMany({
          where: { productId: productToDelete.id },
        });

        await prisma.product.delete({
          where: { slug },
        });

        return res.status(200).json({ message: 'Ürün ve tüm varyantları silindi.' });
      } catch (error) {
        console.error(`DELETE /api/products/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Ürün silinirken hata oluştu.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez.` });
  }
};

export default withAdmin(withErrorHandler(handler));
