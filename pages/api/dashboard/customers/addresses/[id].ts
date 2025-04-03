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
  // Adres ID'sini al
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Geçerli bir adres ID gereklidir.' });
  }

  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'ADDRESS_DETAIL_API');
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
    // Adresi kontrol et
    const address = await prisma.address.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!address) {
      return res.status(404).json({ error: 'Adres bulunamadı.' });
    }

    // GET: Adres detayını getir
    if (req.method === 'GET') {
      return res.status(200).json(address);
    }

    // PUT: Adres güncelle
    if (req.method === 'PUT') {
      const { 
        title, 
        firstName, 
        lastName, 
        street, 
        district, 
        city, 
        state, 
        zipCode, 
        country, 
        phone, 
        isDefault,
        isDefaultBilling
      } = req.body;

      // Gerekli alanları kontrol et
      if (!title || !firstName || !lastName || !street || !city || !state || !zipCode || !country || !phone) {
        return res.status(400).json({ 
          error: 'Lütfen tüm gerekli alanları doldurun.' 
        });
      }

      // Adresi güncelle
      const updatedAddress = await prisma.address.update({
        where: { id: parseInt(id) },
        data: {
          title,
          firstName,
          lastName,
          street,
          district: district || null,
          city,
          state,
          zipCode,
          country,
          phone,
          isDefault: isDefault || false,
          isDefaultBilling: isDefaultBilling || false,
        },
      });

      // Varsayılan adres ise diğer adresleri güncelle
      if (updatedAddress.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId: address.userId,
            id: { not: updatedAddress.id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Varsayılan fatura adresi ise diğer adresleri güncelle
      if (updatedAddress.isDefaultBilling) {
        await prisma.address.updateMany({
          where: {
            userId: address.userId,
            id: { not: updatedAddress.id },
          },
          data: {
            isDefaultBilling: false,
          },
        });
      }

      // Log oluştur
      await systemLog({
        action: 'ADDRESS_UPDATED',
        description: `Adres güncellendi. Kullanıcı: ${address.user.email}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Adres başarıyla güncellendi.' 
      });
    }

    // DELETE: Adresi sil
    if (req.method === 'DELETE') {
      // Adresi sil
      await prisma.address.delete({
        where: { id: parseInt(id) },
      });

      // Log oluştur
      await systemLog({
        action: 'ADDRESS_DELETED',
        description: `Adres silindi. Kullanıcı: ${address.user.email}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Adres başarıyla silindi.' 
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