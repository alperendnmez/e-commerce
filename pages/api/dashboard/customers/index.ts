import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from '@/lib/rateLimit';
import { systemLog } from '@/lib/systemLogger';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 saniye
  uniqueTokenPerInterval: 500,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'CUSTOMERS_API');
  } catch (error) {
    return res.status(429).json({ 
      error: 'Rate limit aşıldı, lütfen daha sonra tekrar deneyin.' 
    });
  }

  // Yetki kontrolü
  const session = await getServerSession(req, res, authOptions);
  if (!session || session?.user?.role !== 'ADMIN') {
    // Yetkisiz erişimi logla
    try {
      await systemLog({
        action: 'UNAUTHORIZED_ACCESS',
        description: `Yetkisiz erişim girişimi: ${req.method} ${req.url}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
      });
    } catch (error) {
      console.error('Log oluşturulamadı:', error);
    }
    
    return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }

  // Prisma istemcisini başlat
  const prisma = new PrismaClient();

  try {
    // GET: Tüm müşterileri getir
    if (req.method === 'GET') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          createdAt: true,
          lastLogin: true,
          phone: true,
          birthDate: true,
          gender: true,
          newsletter: true,
          role: true,
          orders: {
            select: {
              id: true,
              totalPrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Kullanıcı verilerini formatla
      const formattedUsers = users.map(user => {
        const orderCount = user.orders.length;
        const totalSpent = user.orders.reduce((sum, order) => sum + order.totalPrice, 0);

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString(),
          lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
          phone: user.phone,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
          gender: user.gender,
          newsletter: user.newsletter,
          role: user.role,
          orderCount,
          totalSpent,
        };
      });

      return res.status(200).json(formattedUsers);
    }

    // Desteklenmeyen metot
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Hatası:', error);
    return res.status(500).json({ error: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
  } finally {
    await prisma.$disconnect();
  }
} 