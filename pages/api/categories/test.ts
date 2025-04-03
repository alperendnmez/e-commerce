import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Oturum bilgilerini kontrol et
  const session = await getServerSession(req, res, options);
  
  console.log('Test endpoint - Session:', session);
  console.log('Test endpoint - Method:', req.method);
  console.log('Test endpoint - Headers:', req.headers);

  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Test endpoint çalışıyor (GET)',
      session: session ? {
        user: session.user,
        expires: session.expires
      } : null
    });
  }
  
  if (req.method === 'POST') {
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ 
      message: 'Test endpoint çalışıyor (POST)',
      session: {
        user: session.user,
        expires: session.expires
      },
      body: req.body
    });
  }

  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
} 