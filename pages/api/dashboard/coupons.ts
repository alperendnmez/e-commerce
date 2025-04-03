import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { createSystemLog } from '@/lib/systemLogger';
import { rateLimit } from '@/lib/rateLimit';

// Doğrudan PrismaClient'ı her endpoint'de yeniden oluştur
const prisma = new PrismaClient();

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 10,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if Prisma is initialized
  if (!prisma) {
    console.error('Prisma client is not initialized');
    return res.status(500).json({ error: 'Database connection error' });
  }
  
  // Rate limit
  try {
    await limiter.check(res, 10, 'COUPONS_API');
  } catch (error) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Authorization check
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }

  const userId = parseInt(session.user.id as string);
  const userRole = session.user.role;

  if (userRole !== 'ADMIN') {
    await createSystemLog({
      action: 'AUTH_FAILED',
      userId,
      description: 'Coupons API için yetkisiz erişim denemesi',
      ip: req.socket.remoteAddress
    });
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  // Handle different HTTP methods
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const coupons = await prisma.coupon.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        });
        return res.status(200).json(coupons);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kuponlar yüklenirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kuponlar yüklenirken bir hata oluştu' });
      }

    case 'POST':
      try {
        const { 
          code, 
          type, 
          value, 
          validFrom, 
          validUntil, 
          maxUsage, 
          maxUsagePerUser,
          minOrderAmount, 
          maxDiscount, 
          description, 
          isActive 
        } = req.body;

        // Validate required fields
        if (!code || !type || !value || !validFrom || !validUntil) {
          return res.status(400).json({ error: 'Gerekli alanlar eksik' });
        }

        // Check if code already exists
        const existingCoupon = await prisma.coupon.findUnique({
          where: { code },
        });

        if (existingCoupon) {
          return res.status(400).json({ error: 'Bu kupon kodu zaten kullanılıyor' });
        }

        // Validate dates
        const parsedValidFrom = new Date(validFrom);
        const parsedValidUntil = new Date(validUntil);

        if (isNaN(parsedValidFrom.getTime()) || isNaN(parsedValidUntil.getTime())) {
          return res.status(400).json({ error: 'Geçersiz tarih formatı' });
        }

        if (parsedValidUntil <= parsedValidFrom) {
          return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
        }

        // Create coupon
        const coupon = await prisma.coupon.create({
          data: {
            code: code.toUpperCase(),
            type,
            value: Number(value),
            validFrom: parsedValidFrom,
            validUntil: parsedValidUntil,
            maxUsage: maxUsage ? Number(maxUsage) : null,
            maxUsagePerUser: maxUsagePerUser ? Number(maxUsagePerUser) : null,
            minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            description,
            isActive: Boolean(isActive),
          },
        });

        await createSystemLog({
          action: 'COUPON_CREATED',
          userId,
          description: `Yeni kupon oluşturuldu: ${code}`,
          ip: req.socket.remoteAddress,
          metadata: { couponId: coupon.id }
        });

        return res.status(201).json(coupon);
      } catch (error) {
        console.error('Error creating coupon:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kupon oluşturulurken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kupon oluşturulurken bir hata oluştu' });
      }

    case 'PUT':
      try {
        const { id } = req.query;
        
        if (!id || isNaN(Number(id))) {
          return res.status(400).json({ error: 'Geçerli bir kupon ID gerekli' });
        }
        
        const { 
          code, 
          type, 
          value, 
          validFrom, 
          validUntil, 
          maxUsage, 
          maxUsagePerUser,
          minOrderAmount, 
          maxDiscount, 
          description, 
          isActive 
        } = req.body;

        // Validate required fields
        if (!code || !type || !value) {
          return res.status(400).json({ error: 'Gerekli alanlar eksik' });
        }

        // Check if code already exists (excluding the current coupon)
        const existingCoupon = await prisma.coupon.findFirst({
          where: {
            code,
            id: {
              not: Number(id),
            },
          },
        });

        if (existingCoupon) {
          return res.status(400).json({ error: 'Bu kupon kodu zaten kullanılıyor' });
        }

        // Validate dates if provided
        let updateData: any = {
          code: code.toUpperCase(),
          type,
          value: Number(value),
          maxUsage: maxUsage ? Number(maxUsage) : null,
          maxUsagePerUser: maxUsagePerUser ? Number(maxUsagePerUser) : null,
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
          maxDiscount: maxDiscount ? Number(maxDiscount) : null,
          description,
          isActive: Boolean(isActive),
        };

        if (validFrom && validUntil) {
          const parsedValidFrom = new Date(validFrom);
          const parsedValidUntil = new Date(validUntil);

          if (isNaN(parsedValidFrom.getTime()) || isNaN(parsedValidUntil.getTime())) {
            return res.status(400).json({ error: 'Geçersiz tarih formatı' });
          }

          if (parsedValidUntil <= parsedValidFrom) {
            return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
          }

          updateData.validFrom = parsedValidFrom;
          updateData.validUntil = parsedValidUntil;
        }

        // Update coupon
        const coupon = await prisma.coupon.update({
          where: {
            id: Number(id),
          },
          data: updateData,
        });

        await createSystemLog({
          action: 'COUPON_UPDATED',
          userId,
          description: `Kupon güncellendi: ${code}`,
          ip: req.socket.remoteAddress,
          metadata: { couponId: coupon.id }
        });

        return res.status(200).json(coupon);
      } catch (error) {
        console.error('Error updating coupon:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kupon güncellenirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kupon güncellenirken bir hata oluştu' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;
        
        if (!id || isNaN(Number(id))) {
          return res.status(400).json({ error: 'Geçerli bir kupon ID gerekli' });
        }
        
        // Check if coupon exists
        const existingCoupon = await prisma.coupon.findUnique({
          where: {
            id: Number(id),
          },
        });

        if (!existingCoupon) {
          return res.status(404).json({ error: 'Kupon bulunamadı' });
        }

        // Delete coupon
        await prisma.coupon.delete({
          where: {
            id: Number(id),
          },
        });

        await createSystemLog({
          action: 'COUPON_DELETED',
          userId,
          description: `Kupon silindi: ${existingCoupon.code}`,
          ip: req.socket.remoteAddress,
          metadata: { couponId: Number(id) }
        });

        return res.status(200).json({ message: 'Kupon başarıyla silindi' });
      } catch (error) {
        console.error('Error deleting coupon:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kupon silinirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kupon silinirken bir hata oluştu' });
      }

    default:
      return res.status(405).json({ error: 'Desteklenmeyen istek yöntemi' });
  }
} 