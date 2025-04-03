import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  // Yetkilendirme kontrolü
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
  }

  if (req.method === 'GET') {
    try {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(coupons);
    } catch (error) {
      console.error('Kuponlar alınırken hata:', error);
      return res.status(500).json({ error: 'Kuponlar alınırken bir hata oluştu.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { code, discountPct, discountAmt, validFrom, validUntil, maxUsage, isActive } = req.body;

      // Aynı koda sahip kupon var mı kontrol et
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code }
      });

      if (existingCoupon) {
        return res.status(400).json({ error: 'Bu kupon kodu zaten kullanılıyor.' });
      }

      const newCoupon = await prisma.coupon.create({
        data: {
          code,
          discountPct: discountPct ? Number(discountPct) : null,
          discountAmt: discountAmt ? Number(discountAmt) : null,
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          maxUsage: maxUsage ? Number(maxUsage) : null,
          isActive: Boolean(isActive),
          usageCount: 0
        }
      });

      return res.status(201).json(newCoupon);
    } catch (error) {
      console.error('Kupon oluşturulurken hata:', error);
      return res.status(500).json({ error: 'Kupon oluşturulurken bir hata oluştu.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, code, discountPct, discountAmt, validFrom, validUntil, maxUsage, isActive } = req.body;

      // Aynı koda sahip başka bir kupon var mı kontrol et
      const existingCoupon = await prisma.coupon.findFirst({
        where: { 
          code,
          id: { not: Number(id) }
        }
      });

      if (existingCoupon) {
        return res.status(400).json({ error: 'Bu kupon kodu başka bir kupon tarafından kullanılıyor.' });
      }

      const updatedCoupon = await prisma.coupon.update({
        where: { id: Number(id) },
        data: {
          code,
          discountPct: discountPct ? Number(discountPct) : null,
          discountAmt: discountAmt ? Number(discountAmt) : null,
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          maxUsage: maxUsage ? Number(maxUsage) : null,
          isActive: Boolean(isActive)
        }
      });

      return res.status(200).json(updatedCoupon);
    } catch (error) {
      console.error('Kupon güncellenirken hata:', error);
      return res.status(500).json({ error: 'Kupon güncellenirken bir hata oluştu.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Kupon ID belirtilmedi.' });
      }

      await prisma.coupon.delete({
        where: { id: Number(id) }
      });

      return res.status(200).json({ message: 'Kupon başarıyla silindi.' });
    } catch (error) {
      console.error('Kupon silinirken hata:', error);
      return res.status(500).json({ error: 'Kupon silinirken bir hata oluştu.' });
    }
  }

  return res.status(405).json({ error: 'Desteklenmeyen HTTP metodu.' });
} 