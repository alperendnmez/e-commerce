// pages/api/categories/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        const categories = await prisma.category.findMany({
          include: {
            children: true,
          },
        });
        return res.status(200).json(categories);
      } catch (error) {
        console.error('GET /api/categories error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

    case 'POST':
      try {
        const { name, description, parentId, slug, seoTitle, seoDescription } = req.body;

        if (!name || !slug) {
          return res.status(400).json({ error: 'Name and slug are required' });
        }

        const existingCategory = await prisma.category.findUnique({ where: { slug } });
        if (existingCategory) {
          return res.status(400).json({ error: 'Category with this slug already exists' });
        }

        const newCategory = await prisma.category.create({
          data: {
            name,
            description,
            slug,
            seoTitle,
            seoDescription,
            parentId: parentId || null,
          },
        });

        return res.status(201).json(newCategory);
      } catch (error) {
        console.error('POST /api/categories error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default withAdmin(withErrorHandler(handler));
