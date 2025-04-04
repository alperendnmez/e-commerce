import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

/**
 * Test API - Hesap silme testi
 * Bu API, verilen ID'ye sahip kullanıcıyı siler ve ilişkili verilerin durumunu raporlar
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

  // Kullanıcı ID'si gereklidir
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Kullanıcı ID\'si gereklidir' });
  }

  const userIdNum = Number(userId);

  try {
    // İlgili verilerin sayısını topla
    const addressCount = await prisma.address.count({
      where: { userId: userIdNum }
    });

    const cartData = await prisma.cart.findUnique({
      where: { userId: userIdNum },
      include: { items: true }
    });
    
    const notificationCount = await prisma.notification.count({
      where: { userId: userIdNum }
    });

    // NextAuth modelleri için try-catch kullanıyoruz
    let accountCount = 0;
    let sessionCount = 0;

    try {
      // Eğer NextAuth kurulumunda bir sorun varsa hata almamak için try-catch içine alıyoruz
      const rawAccountCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM "Account" WHERE "userId" = ${userIdNum}`;
      const rawSessionCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM "Session" WHERE "userId" = ${userIdNum}`;
      
      // BigInt değerlerini normal sayılara çevirelim
      accountCount = Number(rawAccountCount[0]?.count || 0);
      sessionCount = Number(rawSessionCount[0]?.count || 0);
    } catch (e) {
      console.warn("NextAuth modelleri sorgulanamadı:", e);
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNum }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const beforeState = {
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      relatedData: {
        addressCount,
        hasCart: !!cartData,
        cartItemCount: cartData?.items.length || 0,
        notificationCount,
        accountCount,
        sessionCount
      }
    };

    // Kullanıcıyı sil (cascade ile ilişkili veriler de silinecek)
    await prisma.user.delete({
      where: { id: userIdNum }
    });

    // Silme işlemi sonrası kontrol et
    const afterAddressCount = await prisma.address.count({
      where: { userId: userIdNum }
    });

    const afterCartData = await prisma.cart.findUnique({
      where: { userId: userIdNum }
    });

    const afterNotificationCount = await prisma.notification.count({
      where: { userId: userIdNum }
    });

    // NextAuth modelleri için tekrar kontrol edelim
    let afterAccountCount = 0;
    let afterSessionCount = 0;

    try {
      const rawAfterAccountCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM "Account" WHERE "userId" = ${userIdNum}`;
      const rawAfterSessionCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM "Session" WHERE "userId" = ${userIdNum}`;
      
      // BigInt değerlerini normal sayılara çevirelim
      afterAccountCount = Number(rawAfterAccountCount[0]?.count || 0);
      afterSessionCount = Number(rawAfterSessionCount[0]?.count || 0);
    } catch (e) {
      console.warn("NextAuth modelleri sorgulanamadı:", e);
    }

    const afterUserCheck = await prisma.user.findUnique({
      where: { id: userIdNum }
    });

    return res.status(200).json({
      success: true,
      message: `Kullanıcı ID ${userId} başarıyla silindi`,
      beforeState,
      afterState: {
        userExists: !!afterUserCheck,
        relatedData: {
          addressCount: afterAddressCount,
          hasCart: !!afterCartData,
          notificationCount: afterNotificationCount, 
          accountCount: afterAccountCount,
          sessionCount: afterSessionCount
        }
      }
    });
  } catch (error) {
    console.error('Hesap silme testi hatası:', error);

    // BigInt değerler için özel bir hata yönetimi
    let errorDetails: any = 'Bilinmeyen hata';
    
    if (error instanceof Error) {
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    return res.status(500).json({ 
      error: 'Hesap silme testi sırasında bir hata oluştu', 
      details: errorDetails
    });
  }
} 