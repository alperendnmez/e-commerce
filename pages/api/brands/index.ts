// pages/api/brands/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        const brands = await prisma.brand.findMany();
        return res.status(200).json(brands);
      } catch (error) {
        console.error('GET /api/brands error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

    case 'POST':
      try {
        const { name, slug, seoTitle, seoDescription } = req.body;

        if (!name || !slug) {
          return res.status(400).json({ error: 'Name and slug are required' });
        }

        const existingBrand = await prisma.brand.findUnique({ where: { slug } });
        if (existingBrand) {
          return res.status(400).json({ error: 'Brand with this slug already exists' });
        }

        const newBrand = await prisma.brand.create({
          data: {
            name,
            slug,
            seoTitle,
            seoDescription,
          },
        });

        return res.status(201).json(newBrand);
      } catch (error) {
        console.error('POST /api/brands error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default withAdmin(withErrorHandler(handler));
