import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '@/lib/authMiddleware';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { addressId, items } = req.body;

    if (!addressId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Address and items are required' });
    }

    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const address = await prisma.address.findUnique({
        where: { id: addressId },
        include: { user: true }
      });

      if (!address || address.userId !== parseInt(userId)) {
        return res.status(404).json({ error: 'Address not found or unauthorized' });
      }

      // Kurgu ödeme işlemi (her zaman başarılı kabul edilir)
      const paymentStatus = 'COMPLETED';

      if (paymentStatus === 'COMPLETED') {
        const order = await prisma.order.create({
          data: {
            user: { connect: { id: parseInt(userId) } },
            status: 'PENDING',
            totalPrice: items.reduce((total, item) => total + item.price * item.quantity, 0),
            orderItems: {
              create: items.map(item => ({
                product: { connect: { id: item.productId } },
                variant: item.variantId ? { connect: { id: item.variantId } } : undefined,
                quantity: item.quantity,
                price: item.price,
              }))
            },
            shippingAddress: `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}, ${address.country}`,
            billingAddress: `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}, ${address.country}`, // Farklı fatura adresi varsa burası düzenlenebilir
          },
        });

        await prisma.payment.create({
          data: {
            order: { connect: { id: order.id } },
            amount: order.totalPrice,
            method: 'mock',
            status: 'COMPLETED',
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PROCESSING' }
        });

        res.status(201).json({ message: 'Payment successful and order created', order });
      } else {
        res.status(500).json({ error: 'Payment failed' });
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to process payment and create order', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to process payment and create order', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default authenticateToken(handler);
