import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt((session.user as any).id);

    // GET - Kuponları ve hediye kartlarını getir
    if (req.method === 'GET') {
      try {
        // Kullanıcının kuponlarını getir
        const userCoupons = await prisma.userCoupon.findMany({
          where: {
            userId: userId
          },
          include: {
            coupon: true
          }
        });

        // Kuponları formatla
        const coupons = userCoupons.map(userCoupon => {
          const { coupon } = userCoupon;
          const now = new Date();
          const isExpired = coupon.validUntil ? new Date(coupon.validUntil) < now : false;

          return {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minOrderAmount: coupon.minOrderAmount || 0,
            maxDiscount: coupon.maxDiscount || null,
            description: coupon.description || '',
            expiryDate: coupon.validUntil,
            isUsed: userCoupon.isUsed,
            isExpired: isExpired,
            categories: coupon.categories ? JSON.parse(coupon.categories) : [],
            products: coupon.products ? JSON.parse(coupon.products) : []
          };
        });

        // Kullanıcının hediye kartlarını getir
        const giftCards = await prisma.giftCard.findMany({
          where: {
            userId: userId
          }
        });

        // Hediye kartlarını formatla
        const formattedGiftCards = giftCards.map(giftCard => {
          const now = new Date();
          const isExpired = new Date(giftCard.validUntil) < now;

          return {
            id: giftCard.id,
            code: giftCard.code,
            balance: giftCard.currentBalance,
            originalBalance: giftCard.initialBalance,
            expiryDate: giftCard.validUntil,
            isActive: giftCard.status === 'ACTIVE',
            isExpired: isExpired,
            lastUsed: giftCard.lastUsed
          };
        });

        return res.status(200).json({
          coupons,
          giftCards: formattedGiftCards
        });
      } catch (error) {
        console.error('Coupons and gift cards fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch coupons and gift cards' });
      }
    }
    // POST - Kupon veya hediye kartı ekle
    else if (req.method === 'POST') {
      try {
        const { code } = req.body;

        if (!code) {
          return res.status(400).json({ error: 'Code is required' });
        }

        // Önce kupon olarak kontrol et
        const coupon = await prisma.coupon.findUnique({
          where: {
            code: code
          }
        });

        if (coupon) {
          // Kupon geçerli mi kontrol et
          const now = new Date();
          if (coupon.validUntil && new Date(coupon.validUntil) < now) {
            return res.status(400).json({ error: 'Coupon has expired' });
          }

          if (!coupon.isActive) {
            return res.status(400).json({ error: 'Coupon is not active' });
          }

          if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
            return res.status(400).json({ error: 'Coupon usage limit has been reached' });
          }

          // Kullanıcı bu kuponu daha önce almış mı kontrol et
          const existingUserCoupon = await prisma.userCoupon.findFirst({
            where: {
              userId: userId,
              couponId: coupon.id
            }
          });

          if (existingUserCoupon) {
            return res.status(400).json({ error: 'You have already added this coupon' });
          }

          // Kullanıcıya kuponu ekle
          const userCoupon = await prisma.userCoupon.create({
            data: {
              userId: userId,
              couponId: coupon.id
            },
            include: {
              coupon: true
            }
          });

          return res.status(201).json({
            type: 'coupon',
            coupon: {
              id: coupon.id,
              code: coupon.code,
              type: coupon.type,
              value: coupon.value,
              minOrderAmount: coupon.minOrderAmount || 0,
              maxDiscount: coupon.maxDiscount || null,
              description: coupon.description || '',
              expiryDate: coupon.validUntil,
              isUsed: false,
              isExpired: false
            }
          });
        }

        // Hediye kartı olarak kontrol et
        const giftCard = await prisma.giftCard.findUnique({
          where: {
            code: code
          }
        });

        if (giftCard) {
          // Hediye kartı geçerli mi kontrol et
          const now = new Date();
          if (new Date(giftCard.validUntil) < now) {
            return res.status(400).json({ error: 'Gift card has expired' });
          }

          if (giftCard.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Gift card is not active' });
          }

          if (giftCard.userId) {
            return res.status(400).json({ error: 'Gift card is already assigned to another user' });
          }

          // Hediye kartını kullanıcıya ata
          const updatedGiftCard = await prisma.giftCard.update({
            where: {
              id: giftCard.id
            },
            data: {
              userId: userId
            }
          });

          return res.status(201).json({
            type: 'giftCard',
            giftCard: {
              id: updatedGiftCard.id,
              code: updatedGiftCard.code,
              balance: updatedGiftCard.currentBalance,
              originalBalance: updatedGiftCard.initialBalance,
              expiryDate: updatedGiftCard.validUntil,
              isActive: updatedGiftCard.status === 'ACTIVE',
              isExpired: false
            }
          });
        }

        return res.status(404).json({ error: 'Invalid code. No coupon or gift card found with this code.' });
      } catch (error) {
        console.error('Add coupon/gift card error:', error);
        return res.status(500).json({ error: 'Failed to add coupon or gift card' });
      }
    } else {
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 