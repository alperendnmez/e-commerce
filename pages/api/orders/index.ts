// pages/api/orders/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withUser } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = (req as any).user;

  switch (req.method) {
    case 'GET':
      try {
        if (user.role === 'ADMIN') {
          // Yöneticiler tüm siparişleri görür
          const orders = await prisma.order.findMany({
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
          return res.status(200).json(orders);
        } else {
          // Normal kullanıcılar sadece kendi siparişlerini görür
          const orders = await prisma.order.findMany({
            where: { userId: user.id },
            include: {
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
          return res.status(200).json(orders);
        }
      } catch (error) {
        console.error('GET /api/orders hatası:', error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'POST':
      try {
        const { items, shippingAddressId, billingAddressId, couponId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'Sipariş öğeleri gerekli' });
        }

        const order = await prisma.$transaction(async (tx) => {
          let totalPrice = 0;

          for (const item of items) {
            const variant = await tx.variant.findUnique({
              where: { id: item.variantId },
            });

            if (!variant) {
              throw new Error(`Variant ID ${item.variantId} bulunamadı`);
            }

            if (variant.stock < item.quantity) {
              throw new Error(`Variant ${variant.name} - ${variant.value} için yeterli stok yok`);
            }

            // Stoku düşürme
            await tx.variant.update({
              where: { id: item.variantId },
              data: { stock: variant.stock - item.quantity },
            });

            totalPrice += variant.price * item.quantity;
          }

          // Kupon uygulanmışsa indirimi hesaplama
          if (couponId) {
            const coupon = await tx.coupon.findUnique({
              where: { id: couponId },
            });

            if (coupon) {
              if (coupon.discountAmt) {
                totalPrice -= coupon.discountAmt;
              } else if (coupon.discountPct) {
                totalPrice -= (coupon.discountPct / 100) * totalPrice;
              }

              // Kupon kullanım sayısını artırma
              await tx.coupon.update({
                where: { id: couponId },
                data: { usageCount: { increment: 1 } },
              });
            }
          }

          // Siparişi oluşturma
          const newOrder = await tx.order.create({
            data: {
              userId: user.id,
              status: 'PENDING',
              totalPrice,
              shippingAddressId,
              billingAddressId,
              couponId,
              orderItems: {
                create: items.map((item: any) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            },
            include: {
              orderItems: true,
              payment: true,
            },
          });

          return newOrder;
        });

        return res.status(201).json(order);
      } catch (error: any) {
        console.error('POST /api/orders hatası:', error);
        return res.status(400).json({ error: error.message || 'Sipariş oluşturulamadı' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez` });
  }
};

export default withUser(withErrorHandler(handler));
