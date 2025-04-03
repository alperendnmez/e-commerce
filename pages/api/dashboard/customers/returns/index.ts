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
    await limiter.check(res, 20, 'RETURN_REQUESTS_API');
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
    // GET: Tüm iade taleplerini getir
    if (req.method === 'GET') {
      const returnRequests = await prisma.returnRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          OrderItem: true,
        },
      });

      // API yanıtı için veriyi düzenle
      const formattedReturns = await Promise.all(returnRequests.map(async (request) => {
        // İade ürün bilgilerini getir
        let productInfo = { id: 0, name: 'Ürün Bulunamadı', imageUrls: [] };
        
        if (request.orderItemId) {
          const orderItem = await prisma.orderItem.findUnique({
            where: { id: request.orderItemId },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrls: true,
                },
              },
            },
          });
          
          if (orderItem && orderItem.product) {
            productInfo = orderItem.product;
          }
        }

        return {
          id: request.id,
          orderId: request.orderId,
          orderNumber: request.order.orderNumber,
          userId: request.userId,
          userEmail: request.user.email,
          userName: `${request.user.firstName} ${request.user.lastName}`,
          status: request.status,
          type: request.type,
          reason: request.reason,
          description: request.description || null,
          refundAmount: request.refundAmount || null,
          refundMethod: request.refundMethod || null,
          refundDate: request.refundDate ? request.refundDate.toISOString() : null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          items: [{
            id: request.orderItemId || 0,
            productId: productInfo.id,
            productName: productInfo.name,
            productImage: productInfo.imageUrls && productInfo.imageUrls.length > 0
              ? productInfo.imageUrls[0] 
              : null,
            quantity: request.OrderItem?.quantity || 1,
            price: request.OrderItem?.price || 0,
          }],
        };
      }));

      return res.status(200).json(formattedReturns);
    }

    // POST: Yeni iade talebi ekle (admin tarafından)
    if (req.method === 'POST') {
      const { 
        orderId, 
        userId, 
        type = 'RETURN', 
        reason, 
        description,
        orderItemId
      } = req.body;

      // Gerekli alanları kontrol et
      if (!orderId || !userId || !reason || !orderItemId) {
        return res.status(400).json({ 
          error: 'Sipariş ID, kullanıcı ID, ürün ID ve iade nedeni zorunludur.' 
        });
      }

      // Sipariş ve kullanıcıyı kontrol et
      const orderExists = await prisma.order.findUnique({
        where: { id: orderId },
      });

      const userExists = await prisma.user.findUnique({
        where: { id: userId },
      });

      const orderItemExists = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
      });

      if (!orderExists || !userExists || !orderItemExists) {
        return res.status(404).json({ 
          error: 'Sipariş, kullanıcı veya sipariş ürünü bulunamadı.' 
        });
      }

      // İade talebini oluştur
      const returnRequest = await prisma.returnRequest.create({
        data: {
          order: { connect: { id: orderId } },
          user: { connect: { id: userId } },
          OrderItem: { connect: { id: orderItemId } },
          type,
          status: 'PENDING',
          reason,
          description: description || null,
        },
      });

      // Log oluştur
      await systemLog({
        action: 'RETURN_REQUEST_CREATED',
        description: `Admin tarafından yeni iade talebi oluşturuldu: Sipariş #${orderExists.orderNumber}, Kullanıcı: ${userExists.email}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
        metadata: JSON.stringify({ 
          returnRequestId: returnRequest.id, 
          orderId, 
          userId, 
          orderItemId 
        }),
      });

      return res.status(201).json({ 
        success: true, 
        message: 'İade talebi başarıyla oluşturuldu.',
        id: returnRequest.id 
      });
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