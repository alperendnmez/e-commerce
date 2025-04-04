import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/mail';
import crypto from 'crypto';
import { z } from 'zod';

// Girdi doğrulama şeması
const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir email adresi gereklidir'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Forgot password API çağrıldı:', req.method);
  
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Metod izni yok: ${req.method}` });
  }

  try {
    console.log('Request body:', req.body);
    
    // Girdi doğrulama
    const validatedData = forgotPasswordSchema.parse(req.body);
    const { email } = validatedData;
    
    console.log('Geçerli e-posta adresi:', email);

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log('Kullanıcı bulundu:', !!user);

    // Güvenlik için, kullanıcı bulunamazsa bile başarılı yanıt ver
    if (!user) {
      return res.status(200).json({
        message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi (eğer bu adres kayıtlıysa).',
      });
    }

    // Google ile giriş yapan kullanıcıları kontrol et
    try {
      const isGoogleUser = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: 'google',
        }
      });
      
      console.log('Google hesabı kontrolü:', !!isGoogleUser);

      if (isGoogleUser) {
        return res.status(400).json({
          error: 'Bu e-posta adresi Google hesabı ile bağlantılıdır. Lütfen Google ile giriş yapın.',
          isOAuthUser: true
        });
      }
    } catch (accountError) {
      console.error('Google hesabı kontrolü sırasında hata:', accountError);
      // Hata durumunda bile işleme devam et, kritik değil
    }

    // Sıfırlama tokeni oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token süresi: 30 dakika
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    
    console.log('Token oluşturuldu', { hashedToken: hashedToken.substring(0, 10) + '...', expiry: tokenExpiry });

    // Kullanıcı kaydını güncelle
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: tokenExpiry,
        },
      });
      
      console.log('Kullanıcı bilgileri güncellendi');
    } catch (updateError) {
      console.error('Kullanıcı güncellenirken hata:', updateError);
      throw new Error('Kullanıcı güncellenirken bir hata oluştu.');
    }

    // Şifre sıfırlama e-postası gönder
    try {
      console.log('E-posta gönderme işlemi başlatılıyor...');
      const emailSent = await sendPasswordResetEmail(
        user.email, 
        user.firstName || '', 
        resetToken
      );
      console.log('E-posta gönderim sonucu:', emailSent);
      
      if (!emailSent) {
        throw new Error('E-posta gönderilemedi.');
      }
    } catch (emailError) {
      console.error('E-posta gönderilirken hata:', emailError);
      throw new Error('Şifre sıfırlama e-postası gönderilirken bir hata oluştu.');
    }

    // Güvenlik nedeniyle ayrıntılı bilgi verme
    return res.status(200).json({
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod doğrulama hatası:', error.errors);
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Şifre sıfırlama hatası:', error);
    
    // Hata mesajını döndür
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return res.status(500).json({ 
      error: 'Şifre sıfırlama işlemi sırasında bir hata oluştu.',
      details: errorMessage 
    });
  }
} 