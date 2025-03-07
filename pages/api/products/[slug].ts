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
                variantValues: true, // Variant değerlerini ekledik
              },
            },
            variantGroups: {
              include: {
                values: true, // Variant gruplarındaki değerleri ekledik
              },
            },
          },
        });

        if (!product) {
          return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        return res.status(200).json(product);
      } catch (error) {
        console.error(`GET /api/products/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Ürün alınırken hata oluştu.' });
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

        const updatedProduct = await prisma.product.update({
          where: { slug },
          data: {
            name,
            description,
            seoTitle,
            seoDescription,
            brandId,
            categoryId,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
          },
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
