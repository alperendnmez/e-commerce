import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '@/lib/authMiddleware';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { street, city, state, zipCode, country, phone } = req.body;

    if (!street || !city || !state || !zipCode || !country || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const address = await prisma.address.create({
        data: {
          user: { connect: { id: parseInt(userId) } },
          street,
          city,
          state,
          zipCode,
          country,
          phone,
        },
      });

      res.status(201).json(address);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to add address', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to add address', details: 'An unknown error occurred' });
      }
    }
  } else if (req.method === 'GET') {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const addresses = await prisma.address.findMany({
        where: { userId: parseInt(userId) },
      });

      res.status(200).json(addresses);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to fetch addresses', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch addresses', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default authenticateToken(handler);
