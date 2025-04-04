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

/**
 * Hesap silme talebi e-postası - Yöneticiye bildirim
 * @param userEmail Kullanıcının e-posta adresi
 * @param userName Kullanıcının adı
 * @param userId Kullanıcının ID'si
 * @param isOAuthUser OAuth hesabı mı
 * @param requestDate Talep tarihi
 */
export const sendAccountDeletionRequestToAdmin = async (
  userEmail: string,
  userName: string = '',
  userId: number,
  isOAuthUser: boolean = false,
  requestDate: Date = new Date()
) => {
  // Admin e-posta adresi - .env'den al
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;
  
  if (!adminEmail) {
    throw new Error('Admin e-posta adresi bulunamadı. Lütfen .env dosyasında ADMIN_EMAIL, EMAIL_FROM veya EMAIL_SERVER_USER tanımlayın.');
  }
  
  console.log(`Hesap silme talebi e-postası yöneticiye gönderiliyor: ${adminEmail}`);
  
  const formattedDate = requestDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const subject = `Hesap Silme Talebi - ${userName || userEmail}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Hesap Silme Talebi</h2>
      <p>Merhaba Yönetici,</p>
      <p>Aşağıdaki kullanıcı hesabının silinmesi için bir talep alındı:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <p><strong>Kullanıcı ID:</strong> ${userId}</p>
        <p><strong>E-posta:</strong> ${userEmail}</p>
        <p><strong>Ad Soyad:</strong> ${userName || 'Belirtilmemiş'}</p>
        <p><strong>Hesap Türü:</strong> ${isOAuthUser ? 'Google Hesabı' : 'Normal Hesap'}</p>
        <p><strong>Talep Tarihi:</strong> ${formattedDate}</p>
      </div>
      
      <p>Bu kullanıcının hesabını ve ilişkili tüm verilerini manuel olarak silmek için lütfen admin paneline gidin.</p>
      <p>Not: Kullanıcı bu talebin bir kopyasını da kendi e-posta adresine almıştır ve hesabının en kısa sürede silineceği konusunda bilgilendirilmiştir.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Hesap Silme Talebi\n\nMerhaba Yönetici,\n\nAşağıdaki kullanıcı hesabının silinmesi için bir talep alındı:\n\nKullanıcı ID: ${userId}\nE-posta: ${userEmail}\nAd Soyad: ${userName || 'Belirtilmemiş'}\nHesap Türü: ${isOAuthUser ? 'Google Hesabı' : 'Normal Hesap'}\nTalep Tarihi: ${formattedDate}\n\nBu kullanıcının hesabını ve ilişkili tüm verilerini manuel olarak silmek için lütfen admin paneline gidin.\n\nNot: Kullanıcı bu talebin bir kopyasını da kendi e-posta adresine almıştır ve hesabının en kısa sürede silineceği konusunda bilgilendirilmiştir.`;

  return sendEmail({ to: adminEmail, subject, html, text });
};

/**
 * Hesap silme talebi onay e-postası - Kullanıcıya bildirim
 * @param email Kullanıcının e-posta adresi
 * @param name Kullanıcının adı
 * @param requestDate Talep tarihi
 */
export const sendAccountDeletionRequestToUser = async (
  email: string,
  name: string = '',
  requestDate: Date = new Date()
) => {
  console.log(`Hesap silme talebi onay e-postası kullanıcıya gönderiliyor: ${email}`);
  
  const formattedDate = requestDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const subject = "Hesap Silme Talebiniz Alındı";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Hesap Silme Talebiniz Alındı</h2>
      <p>Merhaba${name ? ' ' + name : ''},</p>
      <p><strong>${formattedDate}</strong> tarihinde yaptığınız hesap silme talebiniz alındı.</p>
      <p>Talebiniz yönetici ekibimize iletildi ve en kısa sürede işleme alınacaktır. Hesabınız silindikten sonra tarafınıza bilgilendirme e-postası gönderilecektir.</p>
      <p>Bu süreçte herhangi bir sorunuz olursa, lütfen müşteri hizmetlerimiz ile iletişime geçin.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
        <p>Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;

  const text = `Merhaba${name ? ' ' + name : ''},\n\n${formattedDate} tarihinde yaptığınız hesap silme talebiniz alındı.\n\nTalebiniz yönetici ekibimize iletildi ve en kısa sürede işleme alınacaktır. Hesabınız silindikten sonra tarafınıza bilgilendirme e-postası gönderilecektir.\n\nBu süreçte herhangi bir sorunuz olursa, lütfen müşteri hizmetlerimiz ile iletişime geçin.`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Sipariş durumu değiştiğinde müşteriye e-posta gönderir
 * @param email Alıcı e-posta adresi
 * @param name Müşteri adı
 * @param order Sipariş bilgileri
 * @param previousStatus Önceki durum
 * @param newStatus Yeni durum
 */
export const sendOrderStatusUpdateEmail = async (
  email: string, 
  name: string = '', 
  order: any, 
  previousStatus: string, 
  newStatus: string
) => {
  console.log(`Sipariş durumu değişim e-postası gönderiliyor: ${email} (${previousStatus} -> ${newStatus})`);
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const orderUrl = `${baseUrl}/profile/orders/${order.id}`;
  
  let subject, title, statusMessage, additionalInfo, callToAction, callToActionUrl, callToActionText;
  
  // Tahmini teslimat süresi hesaplama (örnek)
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3); // Varsayılan olarak 3 gün
  
  // Kargo firması bilgisi
  const shippingCarrier = order.shippingCarrier || 'Standart Kargo Hizmeti';
  
  // Durum değişikliğine göre içerik belirleme
  switch(newStatus) {
    case 'PAID':
      subject = `Ödemeniz Alındı - ${order.orderNumber}`;
      title = "Ödemeniz Başarıyla Alındı";
      statusMessage = "Ödemeniz başarıyla alındı ve siparişiniz onaylandı.";
      additionalInfo = "Siparişiniz en kısa sürede hazırlanmaya başlanacaktır. Sipariş durumunuzdaki değişiklikleri size e-posta ile bildireceğiz.";
      callToActionText = "Siparişimi Görüntüle";
      callToActionUrl = orderUrl;
      break;
    case 'PROCESSING':
      subject = `Siparişiniz İşleme Alındı - ${order.orderNumber}`;
      title = "Siparişiniz İşleme Alındı";
      statusMessage = "Siparişiniz işleme alındı ve hazırlanıyor.";
      additionalInfo = "Ürünleriniz depomuzda hazırlanmakta ve en kısa sürede kargoya verilecektir.";
      callToActionText = "Siparişimi Görüntüle";
      callToActionUrl = orderUrl;
      break;
    case 'SHIPPED':
      const trackingUrl = order.trackingUrl || `https://www.kargotakip.net/?${order.trackingNumber}`;
      subject = `Siparişiniz Kargoya Verildi - ${order.orderNumber}`;
      title = "Siparişiniz Kargoya Verildi";
      statusMessage = "Siparişiniz kargoya verildi ve yola çıktı.";
      additionalInfo = `
        <p>Siparişiniz <strong>${shippingCarrier}</strong> ile gönderilmiştir.</p>
        <p>Kargo takip numaranız: <strong>${order.trackingNumber || 'Henüz belirlenmedi'}</strong></p>
        <p>Tahmini teslimat tarihi: <strong>${estimatedDeliveryDate.toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'})}</strong></p>
        <p>Kargo firması, teslimat gününde size 1-2 saat aralığında teslimat zamanı bildirecektir. Teslimat sırasında evde bulunmadığınız durumda, kargo görevlisi tarafından bir bildirim bırakılacak ve yeniden teslimat planlanabilecektir.</p>
        <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <p style="margin: 5px 0;"><strong>Teslimat İpuçları:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Teslimat sırasında kargoyu kontrol etmeyi unutmayın.</li>
            <li>Herhangi bir hasar durumunda, teslim almadan önce tutanak tutturabilirsiniz.</li>
            <li>Teslimat için kimlik bilgileriniz istenebilir.</li>
          </ul>
        </div>
      `;
      callToActionText = "Kargonuzu Takip Edin";
      callToActionUrl = trackingUrl;
      break;
    case 'DELIVERED':
      subject = `Siparişiniz Teslim Edildi - ${order.orderNumber}`;
      title = "Siparişiniz Teslim Edildi";
      statusMessage = "Siparişiniz başarıyla teslim edildi.";
      additionalInfo = `
        <p>Alışverişiniz için teşekkür ederiz. Ürünlerimizle ilgili deneyiminizi paylaşmak için ürün değerlendirmesi yapabilirsiniz.</p>
        <p>Siparişinizle ilgili herhangi bir sorun yaşarsanız, lütfen müşteri hizmetlerimizle iletişime geçmekten çekinmeyin.</p>
      `;
      callToActionText = "Ürünleri Değerlendir";
      callToActionUrl = `${baseUrl}/profile/orders/${order.id}/review`;
      break;
    case 'COMPLETED':
      subject = `Siparişiniz Tamamlandı - ${order.orderNumber}`;
      title = "Siparişiniz Tamamlandı";
      statusMessage = "Siparişiniz başarıyla tamamlandı.";
      additionalInfo = "Alışverişiniz için teşekkür ederiz. Bizi tekrar tercih etmenizi umuyoruz.";
      callToActionText = "Yeni Ürünleri Keşfedin";
      callToActionUrl = `${baseUrl}/urunler`;
      break;
    case 'CANCELLED':
      subject = `Siparişiniz İptal Edildi - ${order.orderNumber}`;
      title = "Siparişiniz İptal Edildi";
      statusMessage = "Siparişiniz iptal edildi.";
      additionalInfo = "Siparişinizin iptal işlemi tamamlanmıştır. Ödeme yaptıysanız, iade işleminiz en kısa sürede tamamlanacaktır.";
      callToActionText = "Yeni Sipariş Ver";
      callToActionUrl = `${baseUrl}/urunler`;
      break;
    case 'REFUNDED':
      const refundMethod = order.paymentMethod === 'CREDIT_CARD' ? 
        'kredi kartınıza' : 
        (order.paymentMethod === 'BANK_TRANSFER' ? 'banka hesabınıza' : 'ödeme yönteminize');
      
      const refundTime = order.paymentMethod === 'CREDIT_CARD' ? 
        '3-14 iş günü' : 
        (order.paymentMethod === 'BANK_TRANSFER' ? '3-5 iş günü' : '5-14 iş günü');
      
      subject = `Siparişinizin İadesi Yapıldı - ${order.orderNumber}`;
      title = "Siparişinizin İadesi Yapıldı";
      statusMessage = "Siparişinizin iade işlemi tamamlandı.";
      additionalInfo = `
        <p>İade tutarı ${refundMethod} ${refundTime} içerisinde yansıyacaktır.</p>
        <p><strong>İade Detayları:</strong></p>
        <ul>
          <li>İade Edilen Tutar: ${(order.totalPrice || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</li>
          <li>İade Yöntemi: ${order.paymentMethod || 'Ödeme yönteminiz'}</li>
          <li>İşlem Numarası: ${order.refundTransactionId || order.orderNumber}</li>
          <li>İade Tarihi: ${new Date().toLocaleDateString('tr-TR')}</li>
        </ul>
        <p>İade işleminizle ilgili aşağıdaki bilgileri göz önünde bulundurunuz:</p>
        <ul>
          <li>Kredi kartı iadeleri, bankanıza bağlı olarak hesap ekstrenize 1-2 dönem içinde yansıyabilir.</li>
          <li>Bankanız tarafından kesilen komisyonlar iade kapsamına girmemektedir.</li>
          <li>İade işleminizle ilgili herhangi bir sorunuz olursa, lütfen müşteri hizmetlerimizle iletişime geçiniz.</li>
        </ul>
      `;
      callToActionText = "Yardım Merkezi";
      callToActionUrl = `${baseUrl}/yardim/iade-islemleri`;
      break;
    case 'RETURNED':
      subject = `Siparişinizin İade Talebi Alındı - ${order.orderNumber}`;
      title = "Siparişinizin İade Talebi Alındı";
      statusMessage = "İade talebiniz işleme alınmıştır.";
      additionalInfo = `
        <p>İade talebiniz incelendikten sonra tarafınıza bilgi verilecektir.</p>
        <p><strong>İade Prosedürü:</strong></p>
        <ol>
          <li>
            <strong>İade Barkodu Yazdırın:</strong> 
            ${order.returnLabel ? `<a href="${order.returnLabel}" target="_blank" style="color: #4A55A2;">İade barkodunuzu buradan indirebilirsiniz</a>` : 'İade barkodunuz e-postanıza ayrıca gönderilecektir.'}
          </li>
          <li>
            <strong>Ürünü Paketleyin:</strong> 
            Lütfen ürünü orijinal kutusunda veya uygun bir pakette, tüm aksesuarları ve faturasıyla birlikte gönderin.
          </li>
          <li>
            <strong>İade Barkodunu Yapıştırın:</strong> 
            Yazdırdığınız barkodu paketin üzerine yapıştırın.
          </li>
          <li>
            <strong>Kargo Teslimi:</strong> 
            Paketi en yakın ${order.returnCarrier || 'anlaşmalı kargo'} şubesine teslim edin. İade gönderimi ücretsizdir.
          </li>
        </ol>
        <p>İade işleminizin tamamlanması, ürünün depomuzda incelenmesi ve onaylanmasının ardından gerçekleşecektir. Bu süreç genellikle ürünün bize ulaşmasından sonra 3-5 iş günü sürmektedir.</p>
        <p>İade işleminiz onaylandıktan sonra, ödeme iade işleminiz başlatılacak ve size bildirilecektir.</p>
      `;
      callToActionText = "İade Takibi";
      callToActionUrl = `${baseUrl}/profile/orders/${order.id}/return`;
      break;
    default:
      subject = `Siparişinizin Durumu Güncellendi - ${order.orderNumber}`;
      title = "Sipariş Durumu Güncellendi";
      statusMessage = `Siparişinizin durumu "${previousStatus}" durumundan "${newStatus}" durumuna güncellendi.`;
      additionalInfo = "Siparişinizle ilgili herhangi bir sorunuz olursa müşteri hizmetlerimizle iletişime geçebilirsiniz.";
      callToActionText = "Siparişimi Görüntüle";
      callToActionUrl = orderUrl;
  }
  
  // Sipariş öğelerini HTML olarak oluştur
  let orderItemsHtml = '';
  if (order.items && Array.isArray(order.items)) {
    orderItemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
          <div style="display: flex; align-items: center;">
            ${item.productImage ? 
              `<img src="${item.productImage}" alt="${item.productName || 'Ürün'}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; border-radius: 4px;">` : 
              `<div style="width: 50px; height: 50px; background-color: #f2f2f2; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #aaa;">Görsel yok</span>
              </div>`
            }
            <div>
              <div style="font-weight: 500;">${item.productName || 'Ürün'}</div>
              ${item.variantDetails ? `<div style="font-size: 12px; color: #666;">${item.variantDetails}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">${(item.price || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">${((item.price || 0) * (item.quantity || 0)).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
      </tr>
    `).join('');
  }
  
  // Teslimat adresi formatla
  let deliveryAddress = 'Adres bilgisi bulunamadı.';
  if (order.shippingAddress) {
    const addr = order.shippingAddress;
    deliveryAddress = `${addr.street}, ${addr.zipCode} ${addr.city}/${addr.state}, ${addr.country}`;
  }
  
  // E-posta HTML içeriği
  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            padding: 10px !important;
          }
          .header {
            padding: 15px !important;
          }
          .content {
            padding: 15px !important;
          }
          .product-image {
            width: 40px !important;
            height: 40px !important;
          }
          .table-responsive {
            overflow-x: auto !important;
            width: 100% !important;
            display: block !important;
          }
          .mobile-full {
            width: 100% !important;
            display: block !important;
          }
          .mobile-center {
            text-align: center !important;
          }
          .mobile-padding {
            padding: 10px 5px !important;
          }
          .button {
            width: 100% !important;
            text-align: center !important;
            display: block !important;
          }
        }
      </style>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7; color: #333333;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7f7f7; padding: 20px;">
        <tr>
          <td align="center">
            <table class="email-container" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <!-- HEADER -->
              <tr>
                <td class="header" style="background-color: #4A55A2; padding: 25px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
                </td>
              </tr>
              
              <!-- CONTENT -->
              <tr>
                <td class="content" style="padding: 30px; background-color: #ffffff;">
                  <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Merhaba${name ? ' ' + name : ''},</p>
                  <p style="margin-bottom: 20px; font-size: 16px; font-weight: 600; color: #333;">${statusMessage}</p>
                  
                  <div style="margin-bottom: 25px; font-size: 15px; line-height: 1.5; color: #555;">
                    ${additionalInfo}
                  </div>
                  
                  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #4A55A2;">
                    <h3 style="margin-top: 0; margin-bottom: 15px; color: #333; font-size: 18px;">Sipariş Bilgileri</h3>
                    <p style="margin: 5px 0; font-size: 15px;"><strong>Sipariş Numarası:</strong> ${order.orderNumber}</p>
                    <p style="margin: 5px 0; font-size: 15px;"><strong>Sipariş Tarihi:</strong> ${new Date(order.createdAt).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    <p style="margin: 5px 0; font-size: 15px;"><strong>Sipariş Durumu:</strong> <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; background-color: #e6f7ff; color: #0070f3;">${newStatus}</span></p>
                    ${order.trackingNumber ? `<p style="margin: 5px 0; font-size: 15px;"><strong>Kargo Takip No:</strong> ${order.trackingNumber}</p>` : ''}
                  </div>
                  
                  <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333; font-size: 18px;">Sipariş Özeti</h3>
                  <div class="table-responsive" style="overflow-x: auto; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 100%;">
                      <thead>
                        <tr style="background-color: #f2f2f2;">
                          <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e0e0e0; font-size: 14px;">Ürün</th>
                          <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e0e0e0; font-size: 14px;">Adet</th>
                          <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #e0e0e0; font-size: 14px;">Birim Fiyat</th>
                          <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #e0e0e0; font-size: 14px;">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${orderItemsHtml}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 15px;"><strong>Ara Toplam:</strong></td>
                          <td style="padding: 12px 10px; text-align: right; font-size: 15px;">${(order.subtotal || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
                        </tr>
                        ${order.shippingCost ? `
                        <tr>
                          <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 15px;">Kargo Ücreti:</td>
                          <td style="padding: 12px 10px; text-align: right; font-size: 15px;">${(order.shippingCost || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
                        </tr>` : ''}
                        ${order.taxAmount ? `
                        <tr>
                          <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 15px;">KDV:</td>
                          <td style="padding: 12px 10px; text-align: right; font-size: 15px;">${(order.taxAmount || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
                        </tr>` : ''}
                        ${order.discountAmount ? `
                        <tr>
                          <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 15px;">İndirim:</td>
                          <td style="padding: 12px 10px; text-align: right; font-size: 15px; color: #e53e3e;">-${(order.discountAmount || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
                        </tr>` : ''}
                        <tr>
                          <td colspan="3" style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #e0e0e0;">TOPLAM:</td>
                          <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #e0e0e0;">${(order.totalPrice || 0).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <div style="margin-top: 25px;">
                    <h3 style="margin-bottom: 10px; color: #333; font-size: 18px;">Teslimat Adresi:</h3>
                    <p style="margin: 5px 0; padding: 10px; background-color: #f9f9f9; border-radius: 5px; font-size: 15px;">${deliveryAddress}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${callToActionUrl}" class="button" style="background-color: #4A55A2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">${callToActionText}</a>
                  </div>
                  
                  <p style="margin: 25px 0; font-size: 15px; color: #555;">Siparişinizle ilgili herhangi bir sorunuz varsa, lütfen müşteri hizmetlerimizle iletişime geçmekten çekinmeyin.</p>
                </td>
              </tr>
              
              <!-- FOOTER -->
              <tr>
                <td style="background-color: #f2f2f2; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 5px 0; font-size: 14px; color: #666;">© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
                  <p style="margin: 5px 0; font-size: 13px; color: #666;">Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
                  <div style="margin-top: 15px;">
                    <a href="${baseUrl}/yardim" style="color: #4A55A2; text-decoration: none; margin: 0 10px; font-size: 14px;">Yardım Merkezi</a>
                    <a href="${baseUrl}/iletisim" style="color: #4A55A2; text-decoration: none; margin: 0 10px; font-size: 14px;">İletişim</a>
                    <a href="${baseUrl}/kvkk" style="color: #4A55A2; text-decoration: none; margin: 0 10px; font-size: 14px;">Gizlilik Politikası</a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Düz metin sürümü
  const text = `Merhaba${name ? ' ' + name : ''},

${statusMessage}

${additionalInfo.replace(/<[^>]*>?/gm, '')}

SİPARİŞ BİLGİLERİ
Sipariş Numarası: ${order.orderNumber}
Sipariş Tarihi: ${new Date(order.createdAt).toLocaleDateString('tr-TR')}
Sipariş Durumu: ${newStatus}
${order.trackingNumber ? `Kargo Takip No: ${order.trackingNumber}` : ''}

${newStatus === 'SHIPPED' ? `Kargo Firması: ${shippingCarrier}
Tahmini Teslimat: ${estimatedDeliveryDate.toLocaleDateString('tr-TR')}` : ''}

Sipariş detaylarınızı görüntülemek için: ${orderUrl}

Teslimat Adresi:
${deliveryAddress}

Siparişinizle ilgili herhangi bir sorunuz varsa, lütfen müşteri hizmetlerimizle iletişime geçmekten çekinmeyin.

© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.`;

  return sendEmail({ to: email, subject, html, text });
}; 