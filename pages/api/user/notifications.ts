import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = parseInt(session.user.id);

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          newsletter: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Burada gerçek bildirim ayarları veritabanından alınacak
      // Şimdilik newsletter değerini kullanıyoruz
      return res.status(200).json({
        emailNotifications: user.newsletter,
        smsNotifications: false,
        marketingEmails: user.newsletter,
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { emailNotifications, smsNotifications, marketingEmails } = req.body;

      // Şimdilik sadece newsletter değerini güncelliyoruz
      // Gerçek uygulamada daha kapsamlı bildirim ayarları olabilir
      await prisma.user.update({
        where: { id: userId },
        data: {
          newsletter: marketingEmails || emailNotifications,
        },
      });

      return res.status(200).json({
        emailNotifications,
        smsNotifications,
        marketingEmails,
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return res.status(500).json({ error: 'Failed to update notification settings' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 