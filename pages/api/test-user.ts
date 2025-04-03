import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Mevcut kullanıcıları kontrol et
    const userCount = await prisma.user.count();
    console.log(`Mevcut kullanıcı sayısı: ${userCount}`);

    // Şifreyi hashle
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Hashlenen şifre: ${hashedPassword}`);

    // Test kullanıcısı varsa sil
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
      console.log('Mevcut test kullanıcısı silindi');
    }

    // Yeni test kullanıcısı oluştur
    const newUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN'
      }
    });

    return res.status(200).json({
      message: 'Test kullanıcısı oluşturuldu',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Test kullanıcısı oluşturma hatası:', error);
    return res.status(500).json({ error: 'Test kullanıcısı oluşturulamadı', details: error });
  }
} 