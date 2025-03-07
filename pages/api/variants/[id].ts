import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import { deleteFromS3, uploadToS3 } from '@/lib/s3';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Geçersiz ID.' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const variant = await prisma.productVariant.findUnique({
          where: { id: parseInt(id) },
          include: {
            variantValues: {
              include: {
                variantGroup: true,
              },
            },
          },
        });

        if (!variant) {
          return res.status(404).json({ error: 'Varyant bulunamadı.' });
        }

        return res.status(200).json(variant);
      } catch (error) {
        console.error(`GET /api/variants/${id} hatası:`, error);
        return res.status(500).json({ error: 'Varyant alınırken hata oluştu.' });
      }

    case 'PUT':
      try {
        const { price, stock, images, variantValues } = req.body;

        const existingVariant = await prisma.productVariant.findUnique({
          where: { id: parseInt(id) },
        });

        if (!existingVariant) {
          return res.status(404).json({ error: 'Varyant bulunamadı.' });
        }

        // Fotoğrafları güncelleme
        let imageUrls = existingVariant.imageUrls || [];
        if (images && Array.isArray(images)) {
          for (const image of images) {
            const uploadedUrl = await uploadToS3(image, `variants/${Date.now()}-${id}`);
            imageUrls.push(uploadedUrl);
          }
        }

        // Varyant güncelleme
        const updatedVariant = await prisma.productVariant.update({
          where: { id: parseInt(id) },
          data: {
            stock,
            price,
            imageUrls,
            variantValues: {
              set: variantValues.map((valueId: number) => ({ id: valueId })),
            },
          },
        });

        return res.status(200).json(updatedVariant);
      } catch (error) {
        console.error(`PUT /api/variants/${id} hatası:`, error);
        return res.status(500).json({ error: 'Varyant güncellenirken hata oluştu.' });
      }

    case 'DELETE':
      try {
        const variant = await prisma.productVariant.findUnique({
          where: { id: parseInt(id) },
        });

        if (!variant) {
          return res.status(404).json({ error: 'Varyant bulunamadı.' });
        }

        // Fotoğrafları S3'ten sil
        if (variant.imageUrls.length > 0) {
          for (const url of variant.imageUrls) {
            await deleteFromS3(url);
          }
        }

        // Varyantı sil
        await prisma.productVariant.delete({
          where: { id: parseInt(id) },
        });

        return res.status(200).json({ message: 'Varyant silindi.' });
      } catch (error) {
        console.error(`DELETE /api/variants/${id} hatası:`, error);
        return res.status(500).json({ error: 'Varyant silinirken hata oluştu.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez.` });
  }
};

export default withAdmin(withErrorHandler(handler));
