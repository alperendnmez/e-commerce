import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Kullanıcı oturumunu doğrula
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { orderId, emailContent, subject } = req.body;

    if (!orderId || !emailContent) {
      return res.status(400).json({ error: 'Sipariş ID ve e-posta içeriği zorunludur.' });
    }

    // Siparişi ve kullanıcı bilgilerini al
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrls: true,
              }
            }
          }
        },
        shippingAddress: true,
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    if (!order.user || !order.user.email) {
      return res.status(400).json({ error: 'Siparişe ait kullanıcı e-posta adresi bulunamadı.' });
    }

    const customerName = `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim();
    
    // Sipariş içeriğini oluştur - ürün adları ve adetleri
    const orderItemsList = order.orderItems.map(item => {
      const productName = item.product?.name || 'İsimsiz Ürün';
      return `${productName} (${item.quantity} Adet)`;
    }).join(', ');
    
    // E-posta HTML şablonu
    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject || 'Siparişiniz Hakkında'}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              padding: 10px !important;
            }
            .content {
              padding: 15px !important;
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
                  <td style="background-color: #4A55A2; padding: 25px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${subject || 'Siparişiniz Hakkında'}</h1>
                  </td>
                </tr>
                
                <!-- CONTENT -->
                <tr>
                  <td class="content" style="padding: 30px; background-color: #ffffff;">
                    <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Merhaba Sayın ${customerName || 'Değerli Müşterimiz'},</p>
                    
                    <p style="margin-bottom: 20px; font-size: 16px; color: #333;">
                      <strong>${orderItemsList}</strong> ürünlerini içeren <strong>#${order.orderNumber}</strong> numaralı siparişiniz için sizlere ulaşıyorum.
                    </p>
                    
                    <div style="margin-bottom: 25px; font-size: 15px; line-height: 1.5; color: #555;">
                      ${emailContent}
                    </div>
                    
                    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #4A55A2;">
                      <h3 style="margin-top: 0; margin-bottom: 15px; color: #333; font-size: 18px;">Sipariş Bilgileri</h3>
                      <p style="margin: 5px 0; font-size: 15px;"><strong>Sipariş Numarası:</strong> ${order.orderNumber}</p>
                      <p style="margin: 5px 0; font-size: 15px;"><strong>Sipariş Tarihi:</strong> ${new Date(order.createdAt).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                      <p style="margin: 5px 0; font-size: 15px;"><strong>Sipariş Durumu:</strong> <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; background-color: #e6f7ff; color: #0070f3;">${order.status}</span></p>
                    </div>
                    
                    <!-- Sipariş Ürünleri Tablosu -->
                    <h3 style="margin-top: 25px; margin-bottom: 15px; color: #333; font-size: 18px;">Sipariş Detayları</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; margin-bottom: 20px;">
                      <thead>
                        <tr style="background-color: #f2f2f2;">
                          <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">Ürün</th>
                          <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">Adet</th>
                          <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">Fiyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${order.orderItems.map(item => `
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                              ${item.product?.name || 'İsimsiz Ürün'}
                            </td>
                            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                              ${item.quantity}
                            </td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                              ${(item.price * item.quantity).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                      <tfoot>
                        <tr style="background-color: #f9f9f9;">
                          <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">
                            Toplam:
                          </td>
                          <td style="padding: 10px; text-align: right; font-weight: bold;">
                            ${order.totalPrice.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    
                    <p style="margin: 25px 0; font-size: 15px; color: #555;">Herhangi bir sorunuz olursa, lütfen bu e-posta yanıtlayarak veya müşteri hizmetlerimize ulaşarak bizimle iletişime geçebilirsiniz.</p>
                    
                    <p style="margin: 0; font-size: 15px; color: #555;">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
                    <p style="margin-top: 5px; font-size: 15px; font-weight: 600; color: #333;">Furnico Müşteri Hizmetleri</p>
                  </td>
                </tr>
                
                <!-- FOOTER -->
                <tr>
                  <td style="background-color: #f2f2f2; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 5px 0; font-size: 14px; color: #666;">© ${new Date().getFullYear()} Furnico. Tüm hakları saklıdır.</p>
                    <p style="margin: 5px 0; font-size: 13px; color: #666;">Gönderim saati: ${new Date().toLocaleString('tr-TR')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // E-posta gönder
    await sendEmail({
      to: order.user.email,
      subject: subject || `Siparişiniz #${order.orderNumber} Hakkında Bilgilendirme`,
      html,
      text: `Merhaba Sayın ${customerName || 'Değerli Müşterimiz'},\n\n${orderItemsList} ürünlerini içeren #${order.orderNumber} numaralı siparişiniz için sizlere ulaşıyorum.\n\n${emailContent.replace(/<[^>]*>?/gm, '')}\n\nSipariş Bilgileri:\nSipariş Numarası: ${order.orderNumber}\nSipariş Tarihi: ${new Date(order.createdAt).toLocaleDateString('tr-TR')}\nSipariş Durumu: ${order.status}\n\nSiparişinizin ürünleri:\n${order.orderItems.map(item => `- ${item.product?.name || 'İsimsiz Ürün'} (${item.quantity} Adet): ${(item.price * item.quantity).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}`).join('\n')}\n\nToplam: ${order.totalPrice.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}\n\nHerhangi bir sorunuz olursa, lütfen bizimle iletişime geçebilirsiniz.\n\nBizi tercih ettiğiniz için teşekkür ederiz.\nFurnico Müşteri Hizmetleri`
    });

    // Başarılı yanıt dön
    return res.status(200).json({ success: true, message: 'E-posta başarıyla gönderildi.' });
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return res.status(500).json({ error: 'E-posta gönderilirken bir hata oluştu.' });
  }
} 