import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function sendEmailNotification(email: string, message: string) {
  // Mock email sending logic
  console.log(`Sending email to ${email}: ${message}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { message, type, userId } = req.body;
    try {
      const notification = await prisma.notification.create({
        data: {
          message,
          type,
          userId,
        },
      });

      // Send email notification if userId is provided
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await sendEmailNotification(user.email, message);
        }
      }

      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: 'Error creating notification' });
    }
  } else if (req.method === 'GET') {
    try {
      const notifications = await prisma.notification.findMany();
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching notifications' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 