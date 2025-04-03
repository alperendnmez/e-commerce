import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { productId, threshold } = req.body;
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true },
      });

      if (product) {
        const totalStock = product.variants.reduce((acc, variant) => acc + variant.stock, 0);
        if (totalStock < threshold) {
          await prisma.notification.create({
            data: {
              message: `Stock for product ${product.name} is below threshold`,
              type: 'Stock Alert',
              userId: null, // Assign to a specific user if needed
            },
          });
        }
      }

      res.status(200).json({ message: 'Stock checked' });
    } catch (error) {
      res.status(500).json({ error: 'Error checking stock levels' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 