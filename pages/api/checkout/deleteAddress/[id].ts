import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '@/lib/authMiddleware';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (req.method === 'DELETE') {
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

      await prisma.address.delete({
        where: { id: Number(id) },
      });

      res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to delete address', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete address', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default authenticateToken(handler);
