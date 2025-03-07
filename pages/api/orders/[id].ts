import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withUser, withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const user = (req as any).user;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Geçersiz sipariş ID' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const order = await prisma.order.findUnique({
          where: { id: parseInt(id, 10) },
          include: {
            user: true,
            orderItems: {
              include: {
                product: true,
                variant: true,
              },
            },
            payment: true,
            shippingAddress: true,
            billingAddress: true,
            coupon: true,
          },
        });

        if (!order) {
          return res.status(404).json({ error: 'Sipariş bulunamadı' });
        }

        if (user.role !== 'ADMIN' && order.userId !== user.id) {
          return res.status(403).json({ error: 'Erişim reddedildi' });
        }

        return res.status(200).json(order);
      } catch (error) {
        console.error(`GET /api/orders/${id} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'PUT':
      return withAdmin(async (req: NextApiRequest, res: NextApiResponse) => {
        try {
          const { status } = req.body;

          if (!status) {
            return res.status(400).json({ error: 'Durum gerekli' });
          }

          const order = await prisma.order.findUnique({
            where: { id: parseInt(id, 10) },
            include: { orderItems: true },
          });

          if (!order) {
            return res.status(404).json({ error: 'Sipariş bulunamadı' });
          }

          if (['CANCELED', 'DELIVERED'].includes(order.status)) {
            return res.status(400).json({ error: 'Bu siparişin durumu güncellenemez' });
          }

          const updatedOrder = await prisma.$transaction(async (tx) => {
            if (status === 'CANCELED') {
              for (const item of order.orderItems) {
                if (item.variantId) {
                  await tx.variant.update({
                    where: { id: item.variantId },
                    data: {
                      stock: { increment: item.quantity },
                    },
                  });
                }
              }
            }

            return tx.order.update({
              where: { id: parseInt(id, 10) },
              data: { status },
              include: {
                user: true,
                orderItems: {
                  include: {
                    product: true,
                    variant: true,
                  },
                },
                payment: true,
                shippingAddress: true,
                billingAddress: true,
                coupon: true,
              },
            });
          });

          return res.status(200).json(updatedOrder);
        } catch (error: any) {
          console.error(`PUT /api/orders/${id} hatası:`, error);
          return res.status(400).json({ error: error.message || 'Sipariş güncellenemedi' });
        }
      })(req, res);

    case 'DELETE':
      return withAdmin(async (req: NextApiRequest, res: NextApiResponse) => {
        try {
          await prisma.order.delete({
            where: { id: parseInt(id, 10) },
          });
          return res.status(200).json({ message: 'Sipariş başarıyla silindi.' });
        } catch (error: any) {
          if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Sipariş bulunamadı.' });
          }
          console.error(`DELETE /api/orders/${id} hatası:`, error);
          return res.status(500).json({ error: 'Sunucu hatası' });
        }
      })(req, res);

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez` });
  }
};

export default withUser(withErrorHandler(handler));