import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * Test API - Test kullanıcısı oluşturur
 * Bu API, test için bir kullanıcı oluşturur ve bazı örnek veriler ekler
 * UYARI: Bu sadece test amaçlıdır. Herhangi bir gerçek ortamda kullanılmamalıdır.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece geliştirme ortamında çalıştır
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'Bu API yalnızca geliştirme ortamında kullanılabilir.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Test kullanıcısı oluştur
    const hashedPassword = await bcrypt.hash('Test1234', 10);
    
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Kullanıcı',
        email: `test-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'USER',
      }
    });

    console.log(`Test kullanıcısı oluşturuldu: ID=${testUser.id}, Email=${testUser.email}`);
    
    // Kullanıcı için bazı örnek veriler oluşturalım
    // 1. Adres ekle
    const address = await prisma.address.create({
      data: {
        userId: testUser.id,
        street: 'Test Sokak No: 123',
        city: 'İstanbul',
        state: 'Kadıköy',
        zipCode: '34000',
        country: 'Türkiye',
        phone: '05551234567',
        firstName: 'Test',
        lastName: 'Kullanıcı',
        title: 'Ev Adresi',
      }
    });
    
    // 2. Sepet oluştur
    const cart = await prisma.cart.create({
      data: {
        userId: testUser.id,
      }
    });
    
    // 3. Kullanıcıya bildirim ekle
    const notification = await prisma.notification.create({
      data: {
        userId: testUser.id,
        message: 'Test kullanıcısı olarak başarıyla kaydoldunuz.',
        isRead: false,
        type: 'INFO',
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Test kullanıcısı oluşturuldu',
      user: {
        id: testUser.id,
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`
      },
      relatedData: {
        address: address.id,
        cart: cart.id,
        notification: notification.id
      }
    });
  } catch (error) {
    console.error('Test kullanıcısı oluşturma hatası:', error);
    return res.status(500).json({ 
      error: 'Test kullanıcısı oluşturulurken bir hata oluştu', 
      details: error
    });
  }
} 