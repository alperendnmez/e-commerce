import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { systemLog } from '@/lib/systemLogger';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // İdempotency key kontrol - tekrarlanan işlemleri önlemek için
  const idempotencyKey = req.headers['x-idempotency-key'] as string || uuidv4();
  const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');

  try {
    // Daha önce aynı key ile yapılmış işlem var mı kontrol et
    const existingTransaction = await prisma.systemLog.findFirst({
      where: {
        action: 'PAYMENT_PROCESSING',
        description: {
          contains: `idempotencyKey:${idempotencyKey}`
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Eğer bu key ile daha önce başarılı bir işlem yapılmışsa, aynı cevabı döndür
    if (existingTransaction) {
      const successMatch = existingTransaction.description.match(/orderId:(\d+),orderNumber:([A-Za-z0-9]+)/);
      if (successMatch && successMatch.length >= 3) {
        const orderId = parseInt(successMatch[1]);
        const orderNumber = successMatch[2];
        
        // İşlem log'u oluştur
        await systemLog({
          type: 'INFO',
          action: 'PAYMENT_DUPLICATE_REQUEST',
          description: `Daha önce işlenmiş ödeme isteği tekrar gönderildi. idempotencyKey:${idempotencyKey}, orderId:${orderId}`,
          ipAddress
        });
        
        return res.status(200).json({
          success: true,
          orderId,
          orderNumber,
          idempotent: true
        });
      }
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt((session.user as any).id);
    const { 
      cartId,
      shippingAddressId, 
      billingAddressId,
      paymentMethod,
      couponCode,
      giftCardCode,
      shippingMethod
    } = req.body;

    if (!cartId || !shippingAddressId || !billingAddressId || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // İşleme başlıyor olduğumuzu loglayalım
    await systemLog({
      type: 'INFO',
      action: 'PAYMENT_PROCESSING_STARTED',
      description: `Ödeme işlemi başlatıldı. idempotencyKey:${idempotencyKey}, userId:${userId}, cartId:${cartId}`,
      ipAddress,
      userId
    });

    // Sepeti getir ve geçerli olduğunu kontrol et
    const cart = await prisma.cart.findUnique({
      where: { id: cartId, userId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!cart) {
      await systemLog({
        type: 'WARNING',
        action: 'PAYMENT_CART_NOT_FOUND',
        description: `Sepet bulunamadı. idempotencyKey:${idempotencyKey}, userId:${userId}, cartId:${cartId}`,
        ipAddress,
        userId
      });
      return res.status(404).json({ error: 'Cart not found' });
    }

    if (cart.items.length === 0) {
      await systemLog({
        type: 'WARNING',
        action: 'PAYMENT_EMPTY_CART',
        description: `Boş sepet ile ödeme denemesi. idempotencyKey:${idempotencyKey}, userId:${userId}, cartId:${cartId}`,
        ipAddress,
        userId
      });
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Adreslerin varlığını ve kullanıcıya ait olduğunu kontrol et
    const shippingAddress = await prisma.address.findUnique({
      where: { id: shippingAddressId, userId },
    });

    const billingAddress = await prisma.address.findUnique({
      where: { id: billingAddressId, userId },
    });

    if (!shippingAddress || !billingAddress) {
      await systemLog({
        type: 'WARNING',
        action: 'PAYMENT_ADDRESS_NOT_FOUND',
        description: `Adres bulunamadı. idempotencyKey:${idempotencyKey}, userId:${userId}, shippingAddressId:${shippingAddressId}, billingAddressId:${billingAddressId}`,
        ipAddress,
        userId
      });
      return res.status(404).json({ error: 'Address not found' });
    }

    // Siparişin toplam tutarını hesapla
    let subtotal = 0;
    for (const item of cart.items) {
      const price = item.variant ? item.variant.price : item.product.price;
      subtotal += price * item.quantity;
    }

    // Kargo ücreti (örnek bir değer veya hesaplama)
    const shippingCost = 30.0; // TL

    // Kupon indirimi (varsa)
    let discountAmount = 0;
    let couponId = null;
    let couponReservationId = null;

    if (couponCode) {
      // Kupon güvenlik kontrolü - rezervasyon aşaması
      const { isValid, discount, id, reservationId, error } = await reserveCouponSafely(couponCode, userId, subtotal, idempotencyKey);
      
      if (error) {
        await systemLog({
          type: 'WARNING',
          action: 'PAYMENT_COUPON_ERROR',
          description: `Kupon hatası: ${error}. idempotencyKey:${idempotencyKey}, userId:${userId}, couponCode:${couponCode}`,
          ipAddress,
          userId
        });
        return res.status(400).json({ error });
      }
      
      if (!isValid) {
        await systemLog({
          type: 'WARNING',
          action: 'PAYMENT_INVALID_COUPON',
          description: `Geçersiz kupon. idempotencyKey:${idempotencyKey}, userId:${userId}, couponCode:${couponCode}`,
          ipAddress,
          userId
        });
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
      
      discountAmount = discount;
      couponId = id;
      couponReservationId = reservationId;
      
      await systemLog({
        type: 'INFO',
        action: 'PAYMENT_COUPON_RESERVED',
        description: `Kupon rezerve edildi. idempotencyKey:${idempotencyKey}, userId:${userId}, couponCode:${couponCode}, discount:${discount}`,
        ipAddress,
        userId
      });
    }

    // Hediye kartı kontrolü ve kullanımı (varsa)
    let giftCardAmount = 0;
    let giftCardReservationId = null;

    if (giftCardCode) {
      // Hediye kartı güvenlik kontrolü - rezervasyon aşaması
      const { isValid, amount, reservationId, error } = await reserveGiftCardSafely(giftCardCode, userId, idempotencyKey);
      
      if (error) {
        await systemLog({
          type: 'WARNING',
          action: 'PAYMENT_GIFT_CARD_ERROR',
          description: `Hediye kartı hatası: ${error}. idempotencyKey:${idempotencyKey}, userId:${userId}, giftCardCode:${giftCardCode}`,
          ipAddress,
          userId
        });
        return res.status(400).json({ error });
      }
      
      if (!isValid) {
        await systemLog({
          type: 'WARNING',
          action: 'PAYMENT_INVALID_GIFT_CARD',
          description: `Geçersiz hediye kartı. idempotencyKey:${idempotencyKey}, userId:${userId}, giftCardCode:${giftCardCode}`,
          ipAddress,
          userId
        });
        return res.status(400).json({ error: 'Invalid gift card code' });
      }
      
      giftCardAmount = amount;
      giftCardReservationId = reservationId;
      
      await systemLog({
        type: 'INFO',
        action: 'PAYMENT_GIFT_CARD_RESERVED',
        description: `Hediye kartı rezerve edildi. idempotencyKey:${idempotencyKey}, userId:${userId}, giftCardCode:${giftCardCode}, amount:${amount}`,
        ipAddress,
        userId
      });
    }

    // Toplam tutarı hesapla
    const taxAmount = (subtotal - discountAmount) * 0.18; // %18 KDV (örnek)
    const total = subtotal + shippingCost + taxAmount - discountAmount - giftCardAmount;

    if (total < 0) {
      await systemLog({
        type: 'WARNING',
        action: 'PAYMENT_NEGATIVE_TOTAL',
        description: `Negatif toplam tutar. idempotencyKey:${idempotencyKey}, userId:${userId}, total:${total}`,
        ipAddress,
        userId
      });
      
      // Rezervasyonları iptal et
      if (couponReservationId) {
        await cancelCouponReservation(couponReservationId);
      }
      
      if (giftCardReservationId) {
        await cancelGiftCardReservation(giftCardReservationId);
      }
      
      return res.status(400).json({ error: 'Total amount cannot be negative' });
    }

    // İşlem başarılı ise transaction içinde sipariş oluştur
    const order = await prisma.$transaction(async (tx) => {
      // Sipariş numarası oluşturma
      const timestamp = Date.now().toString();
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `ORD${timestamp.substring(timestamp.length - 9)}${randomPart}`;

      // Siparişi oluştur
      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          orderNumber, // Benzersiz sipariş numarası
          totalPrice: total,
          subtotal,
          taxAmount,
          shippingCost,
          discountAmount,
          paymentMethod,
          shippingMethod: shippingMethod || 'Standart Kargo',
          shippingAddressId,
          billingAddressId,
          couponId,
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              variantId: item.variantId
            }))
          },
          timeline: {
            create: {
              status: OrderStatus.PENDING,
              description: 'Sipariş oluşturuldu, ödeme bekleniyor.'
            }
          }
        }
      });

      // Kuponu kullanıldı olarak işaretle
      if (couponId && couponReservationId) {
        await finalizeCouponUsage(tx, couponReservationId, order.id);
      }

      // Hediye kartı bakiyesini düş
      if (giftCardCode && giftCardAmount > 0 && giftCardReservationId) {
        await finalizeGiftCardUsage(tx, giftCardReservationId, order.id);
      }

      // Sepeti temizle
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return order;
    }, {
      // Kilitleme stratejisi - eş zamanlı işlemler için
      isolationLevel: 'Serializable', 
      maxWait: 5000, // ms
      timeout: 10000 // ms
    });

    // Ödeme kaydı oluştur
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalPrice,
        method: order.paymentMethod || 'Kredi Kartı', // Varsayılan ödeme yöntemi
        status: 'COMPLETED', // Ödemenin başarılı olduğunu varsayıyoruz
        providerTransactionId: `TR${Date.now()}`,
      }
    });

    // İşlem başarılı oldu - kaydet
    await systemLog({
      type: 'INFO',
      action: 'PAYMENT_PROCESSING',
      description: `Ödeme işlemi başarılı. idempotencyKey:${idempotencyKey}, orderId:${order.id},orderNumber:${order.orderNumber}`,
      ipAddress,
      userId
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber
    });
  } catch (error: any) {
    console.error('Processing payment error:', error);

    // Hata logunu kaydet
    try {
      await systemLog({
        type: 'ERROR',
        action: 'PAYMENT_PROCESSING',
        description: `Ödeme işlemi sırasında hata: ${error.message || 'Bilinmeyen hata'}. idempotencyKey:${idempotencyKey}`,
        ipAddress
      });
    } catch (logError) {
      // Log hatası süreci durdurmasın
      console.error('Log error:', logError);
    }

    return res.status(500).json({ error: error.message || 'Payment processing failed' });
  }
}

/**
 * Kuponu güvenli bir şekilde rezerve et
 * Tüm işlemleri bir transaction içinde gerçekleştirir ve rezervasyon ID'si döndürür
 */
async function reserveCouponSafely(couponCode: string, userId: number, subtotal: number, idempotencyKey: string) {
  try {
    // Kuponu transaction içinde doğrula - kilitleme ile race condition'ları önle
    const result = await prisma.$transaction(async (tx) => {
      // Önce kullanıcının kuponunu getir
      const userCoupon = await tx.userCoupon.findFirst({
        where: {
          userId,
          coupon: {
            code: couponCode,
            isActive: true
          }
        },
        include: {
          coupon: true
        }
      });

      if (!userCoupon) {
        return { isValid: false, error: 'Kupon bulunamadı veya size ait değil' };
      }

      // Kupon kullanılmış mı kontrol et
      if (userCoupon.isUsed) {
        return { isValid: false, error: 'Bu kupon daha önce kullanılmış' };
      }

      const { coupon } = userCoupon;

      // Geçerlilik süresi kontrolü
      const now = new Date();
      if (coupon.validUntil && coupon.validUntil.getTime() < now.getTime()) {
        return { isValid: false, error: 'Kuponun süresi dolmuş' };
      }

      if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) {
        return { isValid: false, error: 'Kupon henüz aktif değil' };
      }

      // Minimum sipariş tutarı kontrolü
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return { 
          isValid: false, 
          error: `Kupon için minimum sipariş tutarı: ${coupon.minOrderAmount.toFixed(2)} TL` 
        };
      }

      // İndirim tutarını hesapla
      let discount = 0;
      if (coupon.type === 'PERCENTAGE') {
        discount = subtotal * (coupon.value / 100);
        // Maksimum indirim sınırlaması
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.value;
        // İndirim tutarı sepet tutarından fazla olamaz
        if (discount > subtotal) {
          discount = subtotal;
        }
      }

      // Rezervasyon kaydı oluştur
      const reservation = await tx.systemLog.create({
        data: {
          type: 'INFO',
          action: 'COUPON_RESERVED',
          description: JSON.stringify({
            userCouponId: userCoupon.id,
            couponId: coupon.id, 
            discount,
            idempotencyKey
          }),
          userId
        }
      });

      return { 
        isValid: true, 
        discount, 
        id: coupon.id,
        reservationId: reservation.id
      };
    }, {
      isolationLevel: 'Serializable'
    });

    return result;
  } catch (error: any) {
    console.error('Kupon rezervasyon hatası:', error);
    return { isValid: false, discount: 0, error: 'Kupon rezerve edilirken bir hata oluştu' };
  }
}

/**
 * Kupon rezervasyonunu iptal et
 */
async function cancelCouponReservation(reservationId: number) {
  try {
    // Rezervasyon kaydını güncelle
    await prisma.systemLog.create({
      data: {
        type: 'INFO',
        action: 'COUPON_RESERVATION_CANCELLED',
        description: `Kupon rezervasyonu iptal edildi. Rezervasyon ID: ${reservationId}`
      }
    });
    return true;
  } catch (error) {
    console.error('Kupon rezervasyon iptali hatası:', error);
    return false;
  }
}

/**
 * Hediye kartını güvenli bir şekilde rezerve et
 * Tüm işlemleri bir transaction içinde gerçekleştirir ve rezervasyon ID'si döndürür
 */
async function reserveGiftCardSafely(giftCardCode: string, userId: number, idempotencyKey: string) {
  try {
    // Hediye kartını transaction içinde doğrula - kilitleme ile race condition'ları önle
    const result = await prisma.$transaction(async (tx) => {
      // Hediye kartını getir
      const giftCard = await tx.giftCard.findUnique({
        where: {
          code: giftCardCode,
          status: 'ACTIVE'
        }
      });

      if (!giftCard) {
        return { isValid: false, error: 'Hediye kartı bulunamadı veya aktif değil' };
      }

      // Hediye kartı bu kullanıcıya mı ait?
      if (giftCard.userId !== null && giftCard.userId !== userId) {
        return { isValid: false, error: 'Bu hediye kartı size ait değil' };
      }

      // Geçerlilik süresi kontrolü
      const now = new Date();
      if (giftCard.validUntil.getTime() < now.getTime()) {
        return { isValid: false, error: 'Hediye kartının süresi dolmuş' };
      }

      // Bakiye kontrolü
      if (giftCard.currentBalance <= 0) {
        return { isValid: false, error: 'Hediye kartında bakiye kalmamış' };
      }

      // Rezervasyon kaydı oluştur
      const reservation = await tx.systemLog.create({
        data: {
          type: 'INFO',
          action: 'GIFT_CARD_RESERVED',
          description: JSON.stringify({
            giftCardId: giftCard.id,
            amount: giftCard.currentBalance,
            idempotencyKey
          }),
          userId: giftCard.userId
        }
      });

      return { 
        isValid: true, 
        amount: giftCard.currentBalance,
        reservationId: reservation.id
      };
    }, {
      isolationLevel: 'Serializable'
    });

    return result;
  } catch (error: any) {
    console.error('Hediye kartı rezervasyon hatası:', error);
    return { isValid: false, amount: 0, error: 'Hediye kartı rezerve edilirken bir hata oluştu' };
  }
}

/**
 * Hediye kartı rezervasyonunu iptal et
 */
async function cancelGiftCardReservation(reservationId: number) {
  try {
    // Rezervasyon kaydını güncelle
    await prisma.systemLog.create({
      data: {
        type: 'INFO',
        action: 'GIFT_CARD_RESERVATION_CANCELLED',
        description: `Hediye kartı rezervasyonu iptal edildi. Rezervasyon ID: ${reservationId}`
      }
    });
    return true;
  } catch (error) {
    console.error('Hediye kartı rezervasyon iptali hatası:', error);
    return false;
  }
}

/**
 * Kupon kullanımını sipariş oluşturulduktan sonra finalize et
 */
async function finalizeCouponUsage(tx: any, reservationId: number, orderId: number) {
  try {
    // Rezervasyon bilgilerini getir
    const reservation = await tx.systemLog.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) {
      throw new Error('Kupon rezervasyonu bulunamadı');
    }

    // Rezervasyon verilerini parse et
    const reservationData = JSON.parse(reservation.description);
    const { userCouponId, couponId } = reservationData;

    // Kuponu kullanıldı olarak işaretle
    await tx.userCoupon.update({
      where: { id: userCouponId },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    });

    // Kuponun kullanım sayısını artır
    await tx.coupon.update({
      where: { id: couponId },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    // Kullanım logunu kaydet
    await tx.systemLog.create({
      data: {
        type: 'INFO',
        action: 'COUPON_USED',
        description: `Kupon kullanıldı: ID=${couponId}, UserCouponID=${userCouponId}, Sipariş=${orderId}, Rezervasyon=${reservationId}`,
        userId: reservation.userId
      }
    });

    return true;
  } catch (error) {
    console.error('Kupon kullanım finalizasyon hatası:', error);
    throw error; // Transaction içinde olduğu için hata fırlatarak işlemi geri alıyoruz
  }
}

/**
 * Hediye kartı kullanımını sipariş oluşturulduktan sonra finalize et
 */
async function finalizeGiftCardUsage(tx: any, reservationId: number, orderId: number) {
  try {
    // Rezervasyon bilgilerini getir
    const reservation = await tx.systemLog.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) {
      throw new Error('Hediye kartı rezervasyonu bulunamadı');
    }

    // Rezervasyon verilerini parse et
    const reservationData = JSON.parse(reservation.description);
    const { giftCardId, amount } = reservationData;

    // Hediye kartını tekrar kontrol et
    const giftCard = await tx.giftCard.findUnique({
      where: { id: giftCardId }
    });

    if (!giftCard) {
      throw new Error('Hediye kartı bulunamadı');
    }

    // Bakiyeyi tekrar kontrol et - race condition'a karşı önlem
    if (giftCard.currentBalance <= 0 || giftCard.currentBalance < amount) {
      throw new Error('Hediye kartında yeterli bakiye kalmamış');
    }

    // Kullanılacak miktar (tüm bakiye veya sipariş tutarına göre)
    const useAmount = Math.min(amount, giftCard.currentBalance);

    // Yeni bakiye
    const newBalance = giftCard.currentBalance - useAmount;
    const newStatus = newBalance > 0 ? 'ACTIVE' : 'USED';

    // Bakiyeyi güncelle
    await tx.giftCard.update({
      where: { id: giftCard.id },
      data: {
        currentBalance: newBalance,
        lastUsed: new Date(),
        status: newStatus
      }
    });

    // İşlem kaydı oluştur
    await tx.giftCardTransaction.create({
      data: {
        giftCardId: giftCard.id,
        amount: -useAmount, // Eksi değer, bakiyenin kullanıldığını gösterir
        orderId,
        description: `Sipariş ödemesi: #${orderId}, Rezervasyon: ${reservationId}`
      }
    });

    // Kullanım logunu kaydet
    await tx.systemLog.create({
      data: {
        type: 'INFO',
        action: 'GIFT_CARD_USED',
        description: `Hediye kartı kullanıldı: ID=${giftCardId}, Tutar: ${useAmount}, Sipariş: ${orderId}, Rezervasyon: ${reservationId}`,
        userId: reservation.userId
      }
    });

    // Kullanıcıya bildirim gönder
    if (giftCard.userId) {
      await tx.notification.create({
        data: {
          userId: giftCard.userId,
          type: 'GIFT_CARD_USAGE',
          message: `Hediye kartınız ${useAmount} TL tutarında kullanıldı. Kalan bakiye: ${newBalance} TL.`,
          isRead: false
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Hediye kartı kullanım finalizasyon hatası:', error);
    throw error; // Transaction içinde olduğu için hata fırlatarak işlemi geri alıyoruz
  }
} 