import nodemailer from 'nodemailer';

/**
 * E-posta gönderme sistemi için konfigürasyon
 * Tüm ayarlar .env dosyasından alınır
 */

// Test modu kontrolü
const isTestMode = process.env.EMAIL_TEST_MODE === 'true';

// Nodemailer transport yapılandırması
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: Number(process.env.EMAIL_SERVER_PORT || '465'),
  secure: true, // Gmail için true olmalı
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
});

// SMTP bağlantısını test et
if (!isTestMode) {
  transporter.verify(function(error: Error | null, success: boolean) {
    if (error) {
      console.error('SMTP Bağlantı Hatası:', error);
    } else {
      console.log('SMTP Sunucu bağlantısı başarılı, e-posta gönderime hazır');
    }
  });
}

// Test modu için konsola yazdırma fonksiyonu
const logTestEmail = (options: any) => {
  console.log('\n==================== TEST E-POSTA ====================');
  console.log('Gönderen:', options.from);
  console.log('Alıcı:', options.to);
  console.log('Konu:', options.subject);
  console.log('İçerik (HTML):', options.html ? 'HTML içerik mevcut' : 'HTML içerik yok');
  console.log('=====================================================\n');
  
  return {
    messageId: `test-${Date.now()}@localhost`,
    envelope: {
      from: options.from,
      to: options.to
    }
  };
};

/**
 * Genel e-posta gönderme fonksiyonu
 * Tüm e-posta gönderme işlemleri bu fonksiyon üzerinden yapılır
 */
export const sendEmail = async ({ 
  to, 
  subject, 
  html, 
  text 
}: { 
  to: string; 
  subject: string; 
  html: string; 
  text?: string;
}) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Furnico'}" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
    to,
    subject,
    text: text || '',
    html,
  };

  // Test modundaysa, gerçekten göndermek yerine konsola yaz
  if (isTestMode) {
    console.log('TEST MODE: E-posta gönderildi (gerçekte gönderilmedi)');
    return logTestEmail(mailOptions);
  }

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('E-posta gönderildi:', result.messageId);
    return result;
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
    throw error;
  }
};

/**
 * Şifre sıfırlama e-postası gönderir
 * @param email Alıcı e-posta adresi
 * @param name Kullanıcı adı
 * @param token Şifre sıfırlama token'ı
 * @param host Host bilgisi (opsiyonel)
 */
export const sendPasswordResetEmail = async (email: string, name: string = '', token: string, host: string = '') => {
  const baseUrl = process.env.NEXTAUTH_URL || `http://${host || 'localhost:3000'}`;
  const resetUrl = `${baseUrl}/sifremi-sifirla?token=${token}`;
  
  console.log(`Şifre sıfırlama e-postası gönderiliyor: ${email}`);
  
  const subject = "Şifre Sıfırlama İsteği";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Şifre Sıfırlama İsteği</h2>
      <p>Merhaba${name ? ' ' + name : ''},</p>
      <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki düğmeye tıklayarak şifrenizi sıfırlayabilirsiniz:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4A55A2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Şifremi Sıfırla</a>
      </div>
      <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayabilirsiniz:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p>Bu bağlantı 30 dakika içinde geçerlidir.</p>
      <p>Eğer böyle bir talepte bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz ve şifreniz değiştirilmeyecektir.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:\n\n${resetUrl}\n\nBu bağlantı 30 dakika süreyle geçerlidir.\n\nEğer siz şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz.`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Hoş geldiniz e-postası gönderir
 * @param email Alıcı e-posta adresi
 * @param name Kullanıcı adı
 */
export const sendWelcomeEmail = async (email: string, name: string = '') => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/giris`;
  
  console.log(`Hoş geldiniz e-postası gönderiliyor: ${email}`);
  
  const subject = "Hoş Geldiniz! Hesabınız Başarıyla Oluşturuldu";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Hoş Geldiniz!</h2>
      <p>Merhaba${name ? ' ' + name : ''},</p>
      <p>Hesabınız başarıyla oluşturuldu. Artık alışverişe başlayabilir, sipariş geçmişinizi takip edebilir ve daha fazlasını yapabilirsiniz.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #4A55A2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Giriş Yap</a>
      </div>
      <p>Herhangi bir sorunuz olursa, lütfen bizimle iletişime geçmekten çekinmeyin.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Merhaba${name ? ' ' + name : ''},\n\nHesabınız başarıyla oluşturuldu. Artık alışverişe başlayabilirsiniz.\n\nGiriş yapmak için: ${loginUrl}\n\nHerhangi bir sorunuz olursa, lütfen bizimle iletişime geçmekten çekinmeyin.`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Sipariş onay e-postası gönderir
 * @param email Alıcı e-posta adresi
 * @param name Kullanıcı adı
 * @param orderDetails Sipariş detayları
 */
export const sendOrderConfirmationEmail = async (email: string, name: string = '', orderDetails: any) => {
  console.log(`Sipariş onay e-postası gönderiliyor: ${email}`);
  
  // Sipariş öğelerini HTML formatında oluştur
  const itemsHtml = orderDetails.items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.price} TL</td>
    </tr>
  `).join('');

  const subject = "Sipariş Onayı";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Sipariş Onayı</h2>
      <p>Merhaba${name ? ' ' + name : ''},</p>
      <p>Siparişiniz için teşekkür ederiz! Siparişiniz alınmıştır.</p>
      
      <h3>Sipariş Detayları:</h3>
      <p><strong>Sipariş Numarası:</strong> ${orderDetails.orderNumber}</p>
      <p><strong>Sipariş Tarihi:</strong> ${new Date(orderDetails.orderDate).toLocaleDateString('tr-TR')}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f8f8f8;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Ürün</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Adet</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Fiyat</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Toplam:</strong></td>
            <td style="padding: 10px;"><strong>${orderDetails.totalAmount} TL</strong></td>
          </tr>
        </tfoot>
      </table>
      
      <h3>Teslimat Adresi:</h3>
      <p>${orderDetails.deliveryAddress}</p>
      
      <p>Siparişinizle ilgili herhangi bir sorunuz varsa, lütfen bizimle iletişime geçin.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Merhaba${name ? ' ' + name : ''},\n\nSiparişiniz için teşekkür ederiz! Siparişiniz alınmıştır.\n\nSipariş Numarası: ${orderDetails.orderNumber}\nSipariş Tarihi: ${new Date(orderDetails.orderDate).toLocaleDateString('tr-TR')}\nToplam: ${orderDetails.totalAmount} TL\n\nTeslimat Adresi:\n${orderDetails.deliveryAddress}\n\nSiparişinizle ilgili herhangi bir sorunuz varsa, lütfen bizimle iletişime geçin.`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Test e-posta gönderimi
 * @param email Test edilecek e-posta adresi
 */
export const sendTestEmail = async (email: string) => {
  console.log(`Test e-postası gönderiliyor: ${email}`);
  
  const subject = "Furnico E-posta Testi";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">E-posta Sistemi Test Maili</h2>
      <p>Merhaba,</p>
      <p>Bu e-posta, Furnico e-posta gönderim sisteminin test edilmesi için gönderilmiştir.</p>
      <p>Eğer bu e-postayı alıyorsanız, e-posta gönderim sistemi doğru çalışıyor demektir.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Merhaba,\n\nBu e-posta, Furnico e-posta gönderim sisteminin test edilmesi için gönderilmiştir.\n\nEğer bu e-postayı alıyorsanız, e-posta gönderim sistemi doğru çalışıyor demektir.`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Hesap silme onay e-postası
 * @param email Alıcı e-posta adresi
 * @param name Kullanıcı adı
 * @param deletionDate Silme tarihi
 */
export const sendAccountDeletionEmail = async (email: string, name: string = '', deletionDate: Date = new Date()) => {
  console.log(`Hesap silme e-postası gönderiliyor: ${email}`);
  
  const formattedDate = deletionDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const subject = "Hesabınız Silindi";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Hesabınız Silindi</h2>
      <p>Merhaba${name ? ' ' + name : ''},</p>
      <p>İsteğiniz üzerine hesabınız <strong>${formattedDate}</strong> tarihinde kalıcı olarak silinmiştir.</p>
      <p>Tüm kişisel verileriniz ve hesap bilgileriniz sistemimizden kaldırılmıştır. Bu işlem geri alınamaz.</p>
      <p>Eğer bu işlemi siz yapmadıysanız, lütfen derhal müşteri hizmetlerimiz ile iletişime geçin.</p>
      <p>Bizi tercih ettiğiniz için teşekkür ederiz. Umarız gelecekte tekrar sizinle çalışma fırsatı buluruz.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Merhaba${name ? ' ' + name : ''},\n\nİsteğiniz üzerine hesabınız ${formattedDate} tarihinde kalıcı olarak silinmiştir.\n\nTüm kişisel verileriniz ve hesap bilgileriniz sistemimizden kaldırılmıştır. Bu işlem geri alınamaz.\n\nEğer bu işlemi siz yapmadıysanız, lütfen derhal müşteri hizmetlerimiz ile iletişime geçin.\n\nBizi tercih ettiğiniz için teşekkür ederiz. Umarız gelecekte tekrar sizinle çalışma fırsatı buluruz.`;

  return sendEmail({ to: email, subject, html, text });
}; 