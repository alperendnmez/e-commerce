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
  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'ADDRESSES_API');
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
    // GET: Tüm adresleri getir
    if (req.method === 'GET') {
      const addresses = await prisma.address.findMany({
        orderBy: { createdAt: 'desc' },
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

      return res.status(200).json(addresses);
    }

    // POST: Yeni adres ekle
    if (req.method === 'POST') {
      const { 
        userId, 
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
      if (!userId || !title || !firstName || !lastName || !street || !city || !state || !zipCode || !country || !phone) {
        return res.status(400).json({ 
          error: 'Lütfen tüm gerekli alanları doldurun.' 
        });
      }

      // Kullanıcıyı kontrol et
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userExists) {
        return res.status(404).json({ 
          error: 'Kullanıcı bulunamadı.' 
        });
      }

      // Adresi oluştur
      const address = await prisma.address.create({
        data: {
          user: { connect: { id: userId } },
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
      if (address.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId: userId,
            id: { not: address.id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Varsayılan fatura adresi ise diğer adresleri güncelle
      if (address.isDefaultBilling) {
        await prisma.address.updateMany({
          where: {
            userId: userId,
            id: { not: address.id },
          },
          data: {
            isDefaultBilling: false,
          },
        });
      }

      // Log oluştur
      await systemLog({
        action: 'ADDRESS_CREATED',
        description: `Adres oluşturuldu. Kullanıcı: ${userExists.email}`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Adres başarıyla oluşturuldu.',
        id: address.id 
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