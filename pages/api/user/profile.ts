import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    // Authorization header'ı kontrol et (alternatif kimlik doğrulama yöntemi)
    const authHeader = req.headers.authorization;
    let userId: number | null = null;
    
    if (session?.user?.id) {
      // Session varsa kullan
      userId = parseInt(session.user.id);
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Bearer token varsa kullan
      const token = authHeader.substring(7);
      if (token && /^\d+$/.test(token)) {
        userId = parseInt(token);
      }
    }
    
    // Kullanıcı kimliği yok, yetkilendirme hatası ver
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            phone: true,
            birthDate: true,
            gender: true,
            createdAt: true,
            _count: {
              select: {
                orders: true,
                reviews: true,
                addresses: true,
              }
            }
          }
        });

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get last 5 orders
        const recentOrders = await prisma.order.findMany({
          where: { userId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    imageUrls: true,
                  }
                }
              }
            }
          }
        });

        return res.status(200).json({
          ...user,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatarUrl,
          recentOrders
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Failed to fetch user profile' });
      }
    } else if (req.method === 'PUT') {
      try {
        const { name, email, phone, birthDate, gender } = req.body;

        // Validate required fields
        if (!name || !email) {
          return res.status(400).json({ error: 'Name and email are required' });
        }

        // Parse name into firstName and lastName
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        // Check if email is already taken by another user
        if (email !== session?.user?.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Email is already in use' });
          }
        }

        // Update user profile
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            firstName,
            lastName,
            email,
            phone,
            birthDate: birthDate ? new Date(birthDate) : null,
            gender,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            phone: true,
            birthDate: true,
            gender: true,
            createdAt: true,
          }
        });

        return res.status(200).json({
          ...updatedUser,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`,
          image: updatedUser.avatarUrl
        });
      } catch (error) {
        console.error('Error updating user profile:', error);
        return res.status(500).json({ error: 'Failed to update user profile' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
