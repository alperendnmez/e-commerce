import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
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

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz kupon ID\'si' });
  }

  const couponId = parseInt(id);

  if (isNaN(couponId)) {
    return res.status(400).json({ error: 'Geçersiz kupon ID formatı' });
  }

  // Kuponun var olup olmadığını kontrol et
  const existingCoupon = await prisma.coupon.findUnique({
    where: { id: couponId }
  });

  if (!existingCoupon) {
    return res.status(404).json({ error: 'Kupon bulunamadı' });
  }

  if (req.method === 'GET') {
    try {
      const coupon = await prisma.coupon.findUnique({
        where: { id: couponId }
      });

      return res.status(200).json(coupon);
    } catch (error) {
      console.error('Kupon alınırken hata:', error);
      return res.status(500).json({ error: 'Kupon alınırken bir hata oluştu.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { code, type, value, validFrom, validUntil, maxUsage, isActive, description, minOrderAmount, maxDiscount, products, categories } = req.body;

      // Aynı koda sahip başka bir kupon var mı kontrol et
      if (code) {
        const duplicateCoupon = await prisma.coupon.findFirst({
          where: { 
            code, 
            id: { not: couponId } 
          }
        });

        if (duplicateCoupon) {
          return res.status(400).json({ error: 'Bu kupon kodu başka bir kupon tarafından kullanılıyor.' });
        }
      }

      const updatedCoupon = await prisma.coupon.update({
        where: { id: couponId },
        data: {
          code,
          type: type || undefined,
          value: value !== undefined ? parseFloat(value) : undefined,
          validFrom: validFrom ? new Date(validFrom) : undefined,
          validUntil: validUntil ? new Date(validUntil) : undefined,
          maxUsage: maxUsage !== undefined ? parseInt(maxUsage, 10) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
          description,
          minOrderAmount: minOrderAmount !== undefined ? parseFloat(minOrderAmount) : undefined,
          maxDiscount: maxDiscount !== undefined ? parseFloat(maxDiscount) : undefined,
          products,
          categories
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
      // Kullanılmış kuponların silinmesini engelle
      if (existingCoupon.usageCount > 0) {
        const userCount = await prisma.userCoupon.count({
          where: {
            couponId,
            isUsed: true
          }
        });
        
        if (userCount > 0) {
          return res.status(400).json({ 
            error: 'Bu kupon en az bir kez kullanılmış. Kullanılmış kuponları silemezsiniz.' 
          });
        }
      }

      // Kupon ile ilişkili userCoupon kayıtlarını sil
      await prisma.userCoupon.deleteMany({
        where: { couponId }
      });

      // Kuponu sil
      await prisma.coupon.delete({
        where: { id: couponId }
      });

      return res.status(200).json({ message: 'Kupon başarıyla silindi.' });
    } catch (error) {
      console.error('Kupon silinirken hata:', error);
      return res.status(500).json({ error: 'Kupon silinirken bir hata oluştu.' });
    }
  }

  return res.status(405).json({ error: 'Desteklenmeyen HTTP metodu.' });
} 