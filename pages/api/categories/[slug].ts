// pages/api/categories/[slug].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import { slugify } from '@/lib/slugify'; // Slugify fonksiyonunu import edin

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query;

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Geçersiz slug' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const category = await prisma.category.findUnique({
          where: { slug },
          include: { children: true },
        });

        if (!category) {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }

        return res.status(200).json(category);
      } catch (error) {
        console.error(`GET /api/categories/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'PUT':
      try {
        const { name, seoTitle, seoDescription, parentSlug } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Kategori adı gerekli' });
        }

        let parentId: number | null = null;
        if (parentSlug) {
          const parentCategory = await prisma.category.findUnique({
            where: { slug: parentSlug },
          });

          if (!parentCategory) {
            return res.status(400).json({ error: 'Parent kategori bulunamadı' });
          }
          parentId = parentCategory.id;
        }

        // Eğer istenirse slug'ı güncelleyebilirsiniz
        const updatedCategory = await prisma.category.update({
          where: { slug },
          data: {
            name,
            seoTitle,
            seoDescription,
            slug: slugify(name), // Slug'ı otomatik olarak güncelle
            parentId,
          },
        });

        return res.status(200).json(updatedCategory);
      } catch (error: any) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }
        console.error(`PUT /api/categories/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'DELETE':
      try {
        await prisma.category.delete({
          where: { slug },
        });

        return res.status(200).json({ message: 'Kategori başarıyla silindi' });
      } catch (error: any) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }
        console.error(`DELETE /api/categories/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez` });
  }
};

export default withAdmin(withErrorHandler(handler));
