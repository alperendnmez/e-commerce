import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { options } from '@/pages/api/auth/[...nextauth]';
import { 
  sendAccountDeletionEmail, 
  sendAccountDeletionRequestToAdmin,
  sendAccountDeletionRequestToUser 
} from '@/lib/mail';

/**
 * Kullanıcı hesabını silme API'si
 * Bu API, kullanıcı hesabını ve ilişkili tüm verileri kalıcı olarak siler
 * veya requestOnly parametresi true ise, hesap silme talebini yöneticiye iletir
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece DELETE isteklerini kabul et
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Kullanıcı oturumunu al
  const session = await getServerSession(req, res, options);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Bu işlem için giriş yapmanız gerekmektedir' });
  }

  try {
    // Kullanıcıyı e-posta ile bul
    const userEmail = session.user.email;
    const user = await prisma.user.findUnique({
      where: { email: userEmail as string },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // OAuth hesabı mı kontrol et - raw query kullanarak
    const oauthAccounts = await prisma.$queryRaw`
      SELECT * FROM "Account" WHERE "userId" = ${user.id} AND "provider" = 'google' LIMIT 1
    `;
    
    const isOAuthUser = Array.isArray(oauthAccounts) && oauthAccounts.length > 0;
    
    // Google hesabı değilse şifre kontrolü yap (requestOnly durumunda da)
    if (!isOAuthUser && req.body.password) {
      // Şifre doğrulama
      const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Geçersiz şifre' });
      }
    }

    // Hesap silme talebi mi yoksa direkt silme mi kontrol et
    const isRequestOnly = req.body.requestOnly === true;

    // Kullanıcı bilgilerini kaydet
    const userInfo = {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    };

    if (isRequestOnly) {
      // ===== HESAP SİLME TALEBİ =====
      // Yöneticiye talep e-postası gönder
      await sendAccountDeletionRequestToAdmin(
        userInfo.email,
        userInfo.name,
        userInfo.id,
        isOAuthUser,
        new Date()
      );

      // Kullanıcıya onay e-postası gönder
      await sendAccountDeletionRequestToUser(
        userInfo.email,
        userInfo.name,
        new Date()
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Hesap silme talebiniz alındı',
        requestOnly: true
      });
    } 
    else {
      // ===== DİREKT HESAP SİLME İŞLEMİ =====
      // Kullanıcı ve ilişkili verileri transaction ile sil
      await prisma.$transaction(async (tx) => {
        // İlişkili verileri sil
        
        // Kullanıcının sepetini ve içindeki öğeleri sil
        const cart = await tx.cart.findUnique({
          where: { userId: user.id }
        });

        if (cart) {
          // Önce sepet öğelerini sil
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id }
          });

          // Sonra sepeti sil
          await tx.cart.delete({
            where: { id: cart.id }
          });
        }

        // Kullanıcının adreslerini sil
        await tx.address.deleteMany({
          where: { userId: user.id }
        });

        // Kullanıcının favorilerini sil
        await tx.userFavoriteProducts.deleteMany({
          where: { userId: user.id }
        });

        // Kullanıcının bildirimlerini sil
        await tx.notification.deleteMany({
          where: { userId: user.id }
        });

        // Kullanıcının kuponlarını sil
        await tx.userCoupon.deleteMany({
          where: { userId: user.id }
        });
        
        // Stok rezervasyonlarını sil
        await tx.stockReservation.deleteMany({
          where: { userId: user.id }
        });

        // NextAuth ile ilgili verileri raw SQL sorguları ile sil
        await tx.$executeRaw`DELETE FROM "Session" WHERE "userId" = ${user.id}`;
        await tx.$executeRaw`DELETE FROM "Account" WHERE "userId" = ${user.id}`;

        // Son olarak kullanıcıyı sil
        await tx.user.delete({
          where: { id: user.id }
        });
      });

      // Hesap silme e-postası gönder
      try {
        await sendAccountDeletionEmail(
          userInfo.email,
          userInfo.name,
          new Date()
        );
      } catch (emailError) {
        console.error('Hesap silme e-postası gönderilirken hata oluştu:', emailError);
        // E-posta gönderiminde hata olsa bile işleme devam et
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Hesabınız başarıyla silindi',
        requestOnly: false
      });
    }
    
  } catch (error) {
    console.error('Hesap silme hatası:', error);
    return res.status(500).json({ 
      error: 'Hesap işlemi sırasında bir hata oluştu',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
} 