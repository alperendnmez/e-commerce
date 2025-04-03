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
  // Customer ID'sini al
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz müşteri ID' });
  }

  // Rate limit kontrolü
  try {
    await limiter.check(res, 20, 'CUSTOMER_DETAIL_API');
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
    // GET: Müşteri detaylarını getir
    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          createdAt: true,
          lastLogin: true,
          phone: true,
          birthDate: true,
          gender: true,
          newsletter: true,
          role: true,
          orders: {
            select: {
              id: true,
              totalPrice: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Müşteri bulunamadı.' });
      }

      // Kullanıcı verisini formatla
      const orderCount = user.orders.length;
      const totalSpent = user.orders.reduce((sum, order) => sum + order.totalPrice, 0);

      const formattedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
        phone: user.phone,
        birthDate: user.birthDate ? user.birthDate.toISOString() : null,
        gender: user.gender,
        newsletter: user.newsletter,
        role: user.role,
        orderCount,
        totalSpent,
      };

      return res.status(200).json(formattedUser);
    }
    
    // PUT: Müşteri bilgilerini güncelle
    if (req.method === 'PUT') {
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        gender, 
        newsletter, 
        role, 
        password 
      } = req.body;
      
      // Kullanıcının var olup olmadığını kontrol et
      const existingUser = await prisma.user.findUnique({
        where: { id: parseInt(id) },
      });
      
      if (!existingUser) {
        return res.status(404).json({ error: 'Müşteri bulunamadı.' });
      }
      
      // E-posta adresinin benzersiz olduğunu kontrol et
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email },
        });
        
        if (emailExists) {
          return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
        }
      }
      
      // Güncelleme verilerini hazırla
      const updateData: any = {
        firstName,
        lastName,
        email,
        newsletter,
        role,
        updatedAt: new Date(),
      };
      
      // Opsiyonel alanları ekle
      if (phone !== undefined) updateData.phone = phone;
      if (gender !== undefined) updateData.gender = gender;
      if (password) {
        // Gerçek uygulamada şifreyi hash'leme işlemi yapılmalı
        // updateData.password = await hashPassword(password);
        updateData.password = password; // Örnek amaçlı, gerçek uygulamada hash kullanılmalı!
      }
      
      // Kullanıcıyı güncelle
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
      });
      
      // Güncelleme logunu kaydet
      await systemLog({
        action: 'CUSTOMER_UPDATED',
        description: `Müşteri bilgileri güncellendi: ${firstName} ${lastName} (ID: ${id})`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
        metadata: { customerId: parseInt(id) },
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Müşteri bilgileri başarıyla güncellendi',
      });
    }
    
    // DELETE: Müşteriyi sil
    if (req.method === 'DELETE') {
      // Kullanıcının var olup olmadığını kontrol et
      const existingUser = await prisma.user.findUnique({
        where: { id: parseInt(id) },
      });
      
      if (!existingUser) {
        return res.status(404).json({ error: 'Müşteri bulunamadı.' });
      }
      
      // İlişkili verilerin silinmesi veya yönetilmesi daha karmaşık olabilir
      // Pratik bir uygulamada soft delete kullanılabilir veya ilişkili veriler arşivlenebilir
      // Bu örnekte basitlik için doğrudan silme işlemi gerçekleştiriyoruz
      
      // Kullanıcıyı sil
      await prisma.user.delete({
        where: { id: parseInt(id) },
      });
      
      // Silme logunu kaydet
      await systemLog({
        action: 'CUSTOMER_DELETED',
        description: `Müşteri silindi: ${existingUser.firstName} ${existingUser.lastName} (ID: ${id})`,
        ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
        userId: Number(session.user.id),
        metadata: { customerId: parseInt(id) },
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Müşteri başarıyla silindi',
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