import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  // Validate ID parameter
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz marka ID' });
  }

  // Convert ID to number
  const brandId = parseInt(id, 10);
  if (isNaN(brandId)) {
    return res.status(400).json({ error: 'Geçersiz marka ID formatı' });
  }

  switch (req.method) {
    case 'GET':
      try {
        console.log(`GET /api/brands/${id} isteği alındı`);
        
        const brand = await prisma.brand.findUnique({
          where: { id: brandId },
        });

        if (!brand) {
          return res.status(404).json({ error: 'Marka bulunamadı' });
        }

        return res.status(200).json(brand);
      } catch (error) {
        console.error(`GET /api/brands/${id} hatası:`, error);
        return res.status(500).json({ error: 'Marka bilgileri alınırken bir hata oluştu' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default withErrorHandler(handler); 