import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { ReturnStatus, ReturnType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt((session.user as any).id);

    // GET - Kullanıcının iade taleplerini getir
    if (req.method === 'GET') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      try {
        // Toplam iade talebi sayısını al
        const totalReturns = await prisma.returnRequest.count({
          where: {
            userId
          }
        });

        // İade taleplerini getir
        const returns = await prisma.returnRequest.findMany({
          where: {
            userId
          },
          include: {
            order: true,
            OrderItem: {
              include: {
                product: true,
                variant: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        });

        // İade taleplerini formatla
        const formattedReturns = returns.map(returnRequest => {
          const items = returnRequest.OrderItem ? [{
            id: returnRequest.OrderItem.id,
            productId: returnRequest.OrderItem.productId,
            productName: returnRequest.OrderItem.product.name,
            productSlug: returnRequest.OrderItem.product.slug,
            productImage: returnRequest.OrderItem.product.imageUrls && returnRequest.OrderItem.product.imageUrls.length > 0 
              ? returnRequest.OrderItem.product.imageUrls[0] 
              : null,
            quantity: returnRequest.OrderItem.quantity,
            price: returnRequest.OrderItem.price
          }] : [];

          return {
            id: returnRequest.id,
            orderId: returnRequest.orderId,
            orderNumber: returnRequest.order.orderNumber,
            orderDate: returnRequest.order.createdAt,
            reason: returnRequest.reason,
            status: returnRequest.status,
            createdAt: returnRequest.createdAt,
            updatedAt: returnRequest.updatedAt,
            items
          };
        });

        return res.status(200).json({
          returns: formattedReturns,
          pagination: {
            total: totalReturns,
            page,
            limit,
            pages: Math.ceil(totalReturns / limit)
          }
        });
      } catch (error) {
        console.error('Returns fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch return requests' });
      }
    }

    // POST - Yeni iade talebi oluştur
    if (req.method === 'POST') {
      const { orderId, reason, items } = req.body;

      if (!orderId || !reason || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order ID, reason and at least one item are required' });
      }

      try {
        // Siparişin kullanıcıya ait olduğunu doğrula
        const order = await prisma.order.findFirst({
          where: {
            id: parseInt(orderId),
            userId,
            status: {
              in: ['DELIVERED', 'SHIPPED']
            }
          }
        });

        if (!order) {
          return res.status(404).json({ error: 'Order not found, not owned by user, or not eligible for return' });
        }

        // Sipariş öğesini kontrol et
        const orderItem = await prisma.orderItem.findUnique({
          where: {
            id: parseInt(items[0])
          }
        });

        if (!orderItem || orderItem.orderId !== parseInt(orderId)) {
          return res.status(400).json({ error: 'Invalid order item' });
        }

        // İade isteği oluştur
        const returnRequest = await prisma.returnRequest.create({
          data: {
            userId,
            orderId: parseInt(orderId),
            orderItemId: parseInt(items[0]),
            reason,
            status: ReturnStatus.PENDING,
            type: ReturnType.RETURN
          },
          include: {
            order: true,
            OrderItem: {
              include: {
                product: true
              }
            }
          }
        });

        // Formatlanmış iade isteğini döndür
        const formattedReturn = {
          id: returnRequest.id,
          orderId: returnRequest.orderId,
          orderNumber: returnRequest.order.orderNumber,
          orderDate: returnRequest.order.createdAt,
          reason: returnRequest.reason,
          status: returnRequest.status,
          createdAt: returnRequest.createdAt,
          updatedAt: returnRequest.updatedAt,
          items: returnRequest.OrderItem ? [{
            id: returnRequest.OrderItem.id,
            productId: returnRequest.OrderItem.productId,
            productName: returnRequest.OrderItem.product.name,
            productSlug: returnRequest.OrderItem.product.slug,
            productImage: returnRequest.OrderItem.product.imageUrls && returnRequest.OrderItem.product.imageUrls.length > 0 
              ? returnRequest.OrderItem.product.imageUrls[0] 
              : null,
            quantity: returnRequest.OrderItem.quantity,
            price: returnRequest.OrderItem.price
          }] : []
        };

        return res.status(201).json(formattedReturn);
      } catch (error) {
        console.error('Return request creation error:', error);
        return res.status(500).json({ error: 'Failed to create return request' });
      }
    } else {
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 