import bcrypt from 'bcrypt'
import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/mail'

// Girdi doğrulama şeması
const SignupSchema = z.object({
  firstName: z.string().min(1, 'Ad boş olamaz'),
  lastName: z.string().min(1, 'Soyad boş olamaz'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Received request:", req.method, req.body);

  if (req.method !== 'POST') {
    console.log("Method not allowed");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Girdi doğrulaması yap
    const validatedData = SignupSchema.parse(req.body)
    
    // E-posta adresi var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      console.log(`Kayıt hatası: ${validatedData.email} adresi zaten kullanımda`);
      return res
        .status(400)
        .json({ error: 'Bu e-posta adresi zaten kullanılıyor.' })
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    console.log(`Yeni kullanıcı oluşturuluyor: ${validatedData.email}`);
    
    // Kullanıcıyı veritabanına kaydet
    const newUser = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone || '',
        role: 'USER', // Varsayılan rol kullanıcı
      },
    })

    console.log(`Kullanıcı başarıyla oluşturuldu, ID: ${newUser.id}`);
    console.log(`${newUser.email} adresine hoş geldiniz e-postası gönderiliyor...`);

    // Hoş geldiniz e-postası gönder
    const emailResult = await sendWelcomeEmail(newUser.email, newUser.firstName);
    console.log(`E-posta gönderim sonucu: ${emailResult ? 'Başarılı' : 'Başarısız'}`);

    // Hassas alanları kaldır
    const { password, ...userWithoutPassword } = newUser

    console.log(`Kayıt işlemi tamamlandı: ${newUser.email}`);
    
    return res.status(201).json({
      user: userWithoutPassword,
      message: 'Kullanıcı oluşturuldu. Şimdi giriş yapabilirsiniz.',
      emailSent: emailResult
    })
  } catch (error) {
    console.error('Kayıt hatası:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Geçersiz veri', 
        details: error.errors 
      })
    }
    
    return res.status(500).json({ error: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.' })
  }
}
