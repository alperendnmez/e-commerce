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
    await limiter.check(res, 20, 'CUSTOMER_ORDERS_API');
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

    // GET: Müşterinin siparişlerini getir
    if (req.method === 'GET') {
      const orders = await prisma.order.findMany({
        where: { userId: parseInt(id) },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          orderItems: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                  imageUrls: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // Sipariş verilerini formatla
      const formattedOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt.toISOString(),
        items: order.orderItems.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.product.imageUrls && item.product.imageUrls.length > 0 
            ? item.product.imageUrls[0] 
            : null,
        }))
      }));

      return res.status(200).json(formattedOrders);
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