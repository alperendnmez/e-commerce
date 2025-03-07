import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateToken, tokenBlacklist } from '@/lib/authMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Add the token to the blacklist
    tokenBlacklist.push(token);

    res.status(200).json({ message: 'Logout successful' });
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default authenticateToken(handler);
