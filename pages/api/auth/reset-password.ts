import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Girdi doğrulama şeması
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  confirmPassword: z.string().min(1, 'Şifre tekrarı gereklidir'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Metod izni yok: ${req.method}` });
  }

  try {
    // Girdi doğrulama
    const validatedData = resetPasswordSchema.parse(req.body);
    const { token, password } = validatedData;

    // Tokeni hash'le
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Token ile kullanıcıyı bul
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(), // Token süresi dolmamış olmalı
        },
      },
    });

    // Kullanıcı bulunamazsa veya token geçersizse hata dön
    if (!user) {
      return res.status(400).json({
        error: 'Geçersiz veya süresi dolmuş token. Lütfen yeni bir şifre sıfırlama isteği gönderin.',
      });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcının şifresini güncelle ve token bilgilerini sıfırla
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Başarılı yanıt dön
    return res.status(200).json({
      message: 'Şifreniz başarıyla sıfırlandı. Şimdi giriş yapabilirsiniz.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Şifre sıfırlama hatası:', error);
    return res.status(500).json({ error: 'Şifre sıfırlama işlemi sırasında bir hata oluştu.' });
  }
} 