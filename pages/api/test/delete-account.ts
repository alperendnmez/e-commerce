import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

/**
 * Test API - Hesap silme işlemini test eder
 * Bu API, belirtilen ID'ye sahip kullanıcıyı ve ilişkili verilerini siler
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
    // Kullanıcı ID'sini al
    const userId = parseInt(req.body.userId, 10);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Geçerli bir kullanıcı ID'si belirtilmelidir." });
    }

    // Silme öncesi kullanıcı durumunu kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true, 
        lastName: true,
        _count: {
          select: {
            addresses: true,
            accounts: true,
            orders: true,
            sessions: true,
            favoriteProducts: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Silme öncesi kullanıcının durumunu kaydet
    const beforeDeletion = {
      user,
      cart: await prisma.cart.findUnique({
        where: { userId },
        include: { items: true }
      }),
      notifications: await prisma.notification.count({
        where: { userId }
      }),
      userCoupons: await prisma.userCoupon.count({
        where: { userId }
      }),
    };

    // Kullanıcıyı ve ilişkili tüm verileri sil (Cascade Delete)
    await prisma.$transaction(async (tx) => {
      // Kullanıcı oturumlarını sil
      await tx.session.deleteMany({
        where: { userId }
      });

      // Kullanıcının adreslerini sil
      await tx.address.deleteMany({
        where: { userId }
      });

      // Kullanıcının favorilerini sil
      await tx.userFavoriteProducts.deleteMany({
        where: { userId }
      });

      // Kullanıcının sepetini sil
      const cart = await tx.cart.findUnique({
        where: { userId }
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

      // Kullanıcının bildirimlerini sil
      await tx.notification.deleteMany({
        where: { userId }
      });

      // Kullanıcının kuponlarını sil
      await tx.userCoupon.deleteMany({
        where: { userId }
      });

      // Kullanıcının hesabını sil
      await tx.account.deleteMany({
        where: { userId }
      });

      // Son olarak kullanıcıyı sil
      await tx.user.delete({
        where: { id: userId }
      });
    });

    // Silme işlemi sonrası kullanıcının artık var olup olmadığını kontrol et
    const afterDeletion = {
      user: await prisma.user.findUnique({
        where: { id: userId }
      }),
      sessions: await prisma.session.count({
        where: { userId }
      }),
      addresses: await prisma.address.count({
        where: { userId }
      }),
      favoriteProducts: await prisma.userFavoriteProducts.count({
        where: { userId }
      }),
      cart: await prisma.cart.findUnique({
        where: { userId }
      }),
      notifications: await prisma.notification.count({
        where: { userId }
      }),
      userCoupons: await prisma.userCoupon.count({
        where: { userId }
      }),
      accounts: await prisma.account.count({
        where: { userId }
      })
    };

    return res.status(200).json({
      success: true,
      message: 'Hesap silme testi tamamlandı',
      beforeDeletion,
      afterDeletion,
    });
  } catch (error) {
    console.error('Hesap silme test hatası:', error);
    return res.status(500).json({ error: 'Hesap silme testi sırasında bir hata oluştu', details: error });
  }
} 