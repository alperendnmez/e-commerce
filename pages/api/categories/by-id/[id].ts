import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  // Validate ID parameter
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz kategori ID' });
  }

  // Convert ID to number
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return res.status(400).json({ error: 'Geçersiz kategori ID formatı' });
  }

  switch (req.method) {
    case 'GET':
      try {
        console.log(`GET /api/categories/${id} isteği alındı`);
        
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });

        if (!category) {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }

        return res.status(200).json(category);
      } catch (error) {
        console.error(`GET /api/categories/${id} hatası:`, error);
        return res.status(500).json({ error: 'Kategori bilgileri alınırken bir hata oluştu' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default withErrorHandler(handler); 