// pages/api/brands/[slug].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import { slugify } from '@/lib/slugify';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query;

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Geçersiz slug' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const brand = await prisma.brand.findUnique({
          where: { slug },
          include: { products: true },
        });

        if (!brand) {
          return res.status(404).json({ error: 'Marka bulunamadı' });
        }

        return res.status(200).json(brand);
      } catch (error) {
        console.error(`GET /api/brands/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'PUT':
      try {
        const { name, seoTitle, seoDescription } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Marka adı gerekli' });
        }

        // Eğer istenirse slug'ı güncelleyebilirsiniz
        const updatedBrand = await prisma.brand.update({
          where: { slug },
          data: {
            name,
            seoTitle,
            seoDescription,
            slug: slugify(name), // Slug'ı otomatik olarak güncelle
          },
        });

        return res.status(200).json(updatedBrand);
      } catch (error: any) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Marka bulunamadı' });
        }
        console.error(`PUT /api/brands/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'DELETE':
      try {
        await prisma.brand.delete({
          where: { slug },
        });

        return res.status(200).json({ message: 'Marka başarıyla silindi' });
      } catch (error: any) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Marka bulunamadı' });
        }
        console.error(`DELETE /api/brands/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez` });
  }
};

export default withAdmin(withErrorHandler(handler));
