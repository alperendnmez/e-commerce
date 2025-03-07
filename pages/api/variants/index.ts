import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import { uploadToS3 } from '@/lib/s3';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        const variants = await prisma.productVariant.findMany({
          include: {
            variantValues: {
              include: {
                variantGroup: true, // Variant grup bilgilerini çekiyoruz
              },
            },
          },
        });
        return res.status(200).json(variants);
      } catch (error) {
        console.error('GET /api/variants hatası:', error);
        return res.status(500).json({ error: 'Varyantlar alınırken hata oluştu.' });
      }

    case 'POST':
      try {
        const { productId, variantValues, price, stock, images } = req.body;

        if (!productId || !Array.isArray(variantValues) || !price || !stock) {
          return res.status(400).json({ error: 'Gerekli tüm alanları doldurun.' });
        }

        // S3'e fotoğraf yükleme
        let imageUrls: string[] = [];
        if (images && Array.isArray(images)) {
          for (const image of images) {
            const uploadedUrl = await uploadToS3(image, `variants/${Date.now()}-${productId}`);
            imageUrls.push(uploadedUrl);
          }
        }

        // Yeni varyant oluşturma
        const newVariant = await prisma.productVariant.create({
          data: {
            productId,
            stock,
            price,
            imageUrls,
            variantValues: {
              connect: variantValues.map((valueId: number) => ({ id: valueId })),
            },
          },
        });

        return res.status(201).json(newVariant);
      } catch (error) {
        console.error('POST /api/variants hatası:', error);
        return res.status(500).json({ error: 'Varyant eklenirken hata oluştu.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez.` });
  }
};

export default withAdmin(withErrorHandler(handler));
