import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '@/lib/authMiddleware';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { street, city, state, zipCode, country, phone } = req.body;

    if (!street || !city || !state || !zipCode || !country || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const address = await prisma.address.findUnique({
        where: { id: Number(id) },
      });

      if (!address || address.userId !== parseInt(userId)) {
        return res.status(404).json({ error: 'Address not found or unauthorized' });
      }

      const updatedAddress = await prisma.address.update({
        where: { id: Number(id) },
        data: {
          street,
          city,
          state,
          zipCode,
          country,
          phone,
        },
      });

      res.status(200).json(updatedAddress);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to update address', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update address', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default authenticateToken(handler);
