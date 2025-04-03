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
  // Customer ID'sini al
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz müşteri ID' });
  }

  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'CUSTOMER_ACTIVITY_API');
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
    // Müşterinin var olup olmadığını kontrol et
    const customer = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Müşteri bulunamadı.' });
    }

    // GET: Müşterinin aktivite geçmişini getir
    if (req.method === 'GET') {
      // Kullanıcının bilgi güncellemeleri
      const profileUpdates = await prisma.user
        .findUnique({
          where: { id: parseInt(id) },
          select: { updatedAt: true }
        })
        .then(user => {
          if (user && user.updatedAt) {
            return [{
              type: 'PROFILE_UPDATE',
              description: 'Profil bilgileri güncellendi',
              date: user.updatedAt,
            }];
          }
          return [];
        });

      // Kullanıcının oturum açma kayıtları
      const loginActivities = await prisma.session
        .findMany({
          where: { userId: parseInt(id) },
          orderBy: { expires: 'desc' },
          take: 10,
        })
        .then(sessions => {
          return sessions.map(session => ({
            type: 'LOGIN',
            description: 'Sistem girişi yapıldı',
            date: session.expires,
            ipAddress: session.sessionToken.substring(0, 10) // Demo amaçlı
          }));
        });

      // Kullanıcının sipariş aktiviteleri
      const orderActivities = await prisma.order
        .findMany({
          where: { userId: parseInt(id) },
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, status: true, createdAt: true }
        })
        .then(orders => {
          return orders.map(order => ({
            type: 'ORDER',
            description: `Sipariş oluşturuldu: #${order.orderNumber}`,
            date: order.createdAt,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status
          }));
        });
        
      // Kullanıcının adres güncellemeleri
      const addressActivities = await prisma.address
        .findMany({
          where: { userId: parseInt(id) },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, updatedAt: true, createdAt: true }
        })
        .then(addresses => {
          return addresses.map(address => ({
            type: 'ADDRESS',
            description: `Adres güncellendi: ${address.title}`,
            date: address.updatedAt,
            addressId: address.id,
            addressTitle: address.title
          }));
        });

      // Tüm aktiviteleri birleştir ve tarih sırasına göre sırala
      const allActivities = [
        ...profileUpdates,
        ...loginActivities,
        ...orderActivities,
        ...addressActivities
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json(allActivities);
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