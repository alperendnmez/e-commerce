import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '@/lib/authMiddleware';

const prisma = new PrismaClient();

type Data = {
  productId: number;
  variantId?: number;
  quantity: number;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { productId, variantId, quantity }: Data = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let cart = await prisma.cart.findUnique({
        where: { userId: parseInt(userId) },
        include: { items: true },
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: {
            user: { connect: { id: parseInt(userId) } },
          },
          include: { items: true },
        });
      }

      const existingCartItem = cart.items.find(
        item => item.productId === productId && item.variantId === variantId
      );

      if (existingCartItem) {
        await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + quantity },
        });
      } else {
        let price = 0;
        
        if (variantId) {
          const variant = await prisma.productVariant.findUnique({ 
            where: { id: variantId } 
          });
          
          if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
          }
          
          price = variant.price;
        } else {
          const product = await prisma.product.findUnique({
            where: { id: productId }
          });
          
          if (!product) {
            return res.status(404).json({ error: 'Product not found' });
          }
          
          if (product.basePrice === null || product.basePrice === 0) {
            const variants = await prisma.productVariant.findMany({
              where: { productId }
            });
            
            price = variants.length > 0
              ? Math.min(...variants.map(v => v.price))
              : 0;
          } else {
            price = product.basePrice;
          }
        }
        
        await prisma.cartItem.create({
          data: {
            cart: { connect: { id: cart.id } },
            product: { connect: { id: productId } },
            variant: variantId ? { connect: { id: variantId } } : undefined,
            quantity: quantity,
            price: price,
          },
        });
      }

      res.status(200).json({ message: 'Product added to cart successfully' });
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to add product to cart', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to add product to cart', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default authenticateToken(handler);
