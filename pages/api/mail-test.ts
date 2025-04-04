import { NextApiRequest, NextApiResponse } from 'next'
import { sendWelcomeEmail } from '@/utils/mail'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("E-posta test isteği alındı");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'E-posta ve isim alanları zorunludur' });
  }

  try {
    console.log(`Test e-postası gönderiliyor: ${email}, ${name}`);
    
    const result = await sendWelcomeEmail(email, name);
    
    console.log(`E-posta gönderim sonucu: ${result ? 'Başarılı' : 'Başarısız'}`);
    
    return res.status(200).json({
      success: result,
      message: result 
        ? 'E-posta başarıyla gönderildi' 
        : 'E-posta gönderilemedi, lütfen konsol loglarını kontrol edin'
    });
  } catch (error) {
    console.error('Test e-postası gönderim hatası:', error);
    return res.status(500).json({ 
      error: 'E-posta gönderilirken bir hata oluştu',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
} 