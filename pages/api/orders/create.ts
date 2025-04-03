import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Rate limiter için basit bir uygulama
const REQUESTS = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika
const MAX_REQUESTS_PER_WINDOW = 5; // 1 dakikada maksimum 5 istek

// Fiyat hesaplama fonksiyonu - frontend'den gelen fiyatların doğruluğunu kontrol eder
const validatePrice = async (items: any[], subtotal: number, shippingCost: number, total: number) => {
  // Ürünlerin ve varyantların fiyatlarını veritabanından al
  const productIds = items.map((item: any) => item.productId);
  const variantIds = items
    .filter((item: any) => item.variantId)
    .map((item: any) => Number(item.variantId));
  
  // Veritabanından ürünleri al - Product modelinde basePrice alanı ile
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, basePrice: true }
  });
  
  // Veritabanından varyantları al - fiyat bilgisi variantlarda olduğu için
  const variants = variantIds.length > 0 
    ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, price: true, productId: true }
      })
    : [];
  
  // Her ürün için doğru fiyatı hesapla
  let calculatedSubtotal = 0;
  
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      throw new Error(`Ürün bulunamadı: ${item.productId}`);
    }
    
    // Varyant varsa varyant fiyatını kullan
    if (item.variantId) {
      const variant = variants.find(v => v.id === Number(item.variantId));
      if (!variant) {
        throw new Error(`Varyant bulunamadı: ${item.variantId}`);
      }
      
      if (variant.productId !== item.productId) {
        throw new Error(`Varyant (${item.variantId}) bu ürüne ait değil: ${item.productId}`);
      }
      
      calculatedSubtotal += variant.price * item.quantity;
    } else {
      // Varyant yoksa ürünün basePrice alanını kullan
      if (product.basePrice === null) {
        throw new Error(`Ürün (${item.productId}) için fiyat bilgisi bulunamadı`);
      }
      
      calculatedSubtotal += product.basePrice * item.quantity;
    }
  }
  
  // Hesaplanan ara toplam frontend'den gelen ara toplam ile eşleşiyor mu kontrol et
  // Yuvarlatma hataları için %1 tolerans uygula
  const tolerance = calculatedSubtotal * 0.01;
  if (Math.abs(calculatedSubtotal - subtotal) > tolerance) {
    throw new Error(`Geçersiz ara toplam: Hesaplanan ${calculatedSubtotal}, gönderilen ${subtotal}`);
  }
  
  // Toplam fiyat doğru mu kontrol et (teslimat ücreti + ara toplam)
  const calculatedTotal = calculatedSubtotal + shippingCost;
  if (Math.abs(calculatedTotal - total) > tolerance) {
    throw new Error(`Geçersiz toplam fiyat: Hesaplanan ${calculatedTotal}, gönderilen ${total}`);
  }
  
  return true;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CSRF koruması için Origin kontrolü
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'https://your-production-domain.com' // Üretim ortamı domain'ini ekleyin
  ];
  
  const isValidOrigin = allowedOrigins.some(allowed => 
    origin.startsWith(allowed) || referer.startsWith(allowed)
  );
  
  if (!isValidOrigin) {
    console.warn('Geçersiz origin:', { origin, referer });
    return res.status(403).json({ error: 'Forbidden: Invalid origin' });
  }
  
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  // Rate limiting uygula
  const clientIp = req.headers['x-forwarded-for'] || 
    req.connection.remoteAddress || 
    'unknown';
    
  const now = Date.now();
  const clientRequests = REQUESTS.get(clientIp) || [];
  
  // Son 1 dakikadaki istekleri filtrele
  const recentRequests = clientRequests.filter((timestamp: number) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`Rate limit aşıldı: ${clientIp}, son ${recentRequests.length} istek`);
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }
  
  // İstek zamanını kaydet
  REQUESTS.set(clientIp, [...recentRequests, now]);

  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.id) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const userId = parseInt(session.user.id);
    
    // 2 saat içinde çok fazla sipariş var mı kontrol et (olası dolandırıcılık tespiti)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const recentOrdersCount = await prisma.order.count({
      where: {
        userId,
        createdAt: {
          gte: twoHoursAgo
        }
      }
    });
    
    if (recentOrdersCount >= 5) {
      console.warn(`Kullanıcı ${userId} için 2 saat içinde çok fazla sipariş: ${recentOrdersCount}`);
      // Uyarı logla ama işleme devam et, gerekirse admin panelinde göster
    }
    
    // Request body'den gerekli alanları al
    const { 
      items, 
      shippingAddressId, 
      billingAddressId, 
      shippingMethod, 
      paymentMethod,
      notes,
      subtotal,
      shippingCost,
      total
    } = req.body;
    
    // Zorunlu alanları kontrol et
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sipariş ürünleri geçerli değil' });
    }

    if (!shippingAddressId) {
      return res.status(400).json({ error: 'Teslimat adresi belirtilmedi' });
    }
    
    if (!billingAddressId) {
      return res.status(400).json({ error: 'Fatura adresi belirtilmedi' });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Ödeme yöntemi belirtilmedi' });
    }
    
    // Bu kullanıcıya ait adresleri kontrol et
    const userAddresses = await prisma.address.findMany({
      where: { userId }
    });
    
    const userAddressIds = userAddresses.map(addr => addr.id);
    
    // Adresler bu kullanıcıya ait mi kontrol et
    if (!userAddressIds.includes(shippingAddressId)) {
      return res.status(403).json({ error: 'Belirtilen teslimat adresi bu kullanıcıya ait değil' });
    }
    
    if (!userAddressIds.includes(billingAddressId)) {
      return res.status(403).json({ error: 'Belirtilen fatura adresi bu kullanıcıya ait değil' });
    }

    // Ürünlerin fiyatlarını ve stok durumunu kontrol edelim
    const productVariantsMap = new Map();
    for (const item of items) {
      const productVariant = await prisma.productVariant.findUnique({
        where: { id: item.variantId || 0 },
        include: {
          product: true,
        },
      });

      if (!productVariant) {
        // Eğer varyant yoksa, normal ürünü kontrol et (varyantı olmayan ürünler için)
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return res.status(404).json({ 
            error: 'Ürün bulunamadı', 
            productId: item.productId 
          });
        }

        // Ürünün fiyatı varsa ve frontend'den gelen fiyattan farklıysa uyarı ver
        if (product.basePrice !== item.price) {
          return res.status(400).json({
            error: 'Ürün fiyatı geçersiz',
            expected: product.basePrice,
            received: item.price,
            productId: item.productId
          });
        }

        // Varyantı olmayan ürün için stok kontrolünü atla
        continue;
      }

      // Ürün fiyatını kontrol et
      if (productVariant.price !== item.price) {
        return res.status(400).json({
          error: 'Ürün fiyatı geçersiz',
          expected: productVariant.price,
          received: item.price,
          productId: item.productId,
          variantId: item.variantId
        });
      }
    }

    // Fiyatları doğrula
    try {
      await validatePrice(items, subtotal, shippingCost, total);
    } catch (priceError) {
      console.error('Fiyat doğrulama hatası:', priceError);
      return res.status(400).json({ 
        error: 'Fiyat doğrulama hatası', 
        message: priceError instanceof Error ? priceError.message : String(priceError)
      });
    }

    // Sipariş numarası oluştur - daha güvenli ve tekrarlanamaz
    const idempotencyKey = uuidv4();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = idempotencyKey.split('-')[0];
    
    const orderNumber = `${year}${month}${day}-${random}`;
    
    // Aynı idempotencyKey ile daha önce işlem yapılmış mı kontrol et
    const existingTransaction = await prisma.transactionLog.findFirst({
      where: {
        idempotencyKey,
        transactionType: 'ORDER_CREATION'
      }
    });

    if (existingTransaction) {
      // Daha önce aynı işlem yapılmış, var olan sipariş bilgilerini döndür
      return res.status(200).json({
        success: true,
        orderId: existingTransaction.entityId,
        orderNumber: existingTransaction.entityCode || orderNumber,
        message: 'Order already exists'
      });
    }
    
    // Sipariş oluştur
    const order = await prisma.order.create({
      data: {
        orderNumber,
        user: {
          connect: {
            id: userId
          }
        },
        status: 'PROCESSING', // Demo için direkt işleme alınıyor
        shippingAddress: {
          connect: {
            id: shippingAddressId
          }
        },
        billingAddress: {
          connect: {
            id: billingAddressId
          }
        },
        shippingMethod: shippingMethod || 'standard',
        shippingCost,
        subtotal,
        totalPrice: total,
        adminNotes: notes ? String(notes).slice(0, 500) : '', // Notların uzunluğunu sınırla
        paymentMethod,
        orderItems: {
          create: items.map((item: any) => ({
            product: {
              connect: {
                id: item.productId
              }
            },
            ...(item.variantId && {
              variant: {
                connect: {
                  id: item.variantId
                }
              }
            }),
            quantity: Math.max(1, Math.min(item.quantity, 10)), // Maksimum 10 ürün
            price: item.price
          }))
        },
        payment: {
          create: {
            method: paymentMethod,
            amount: total,
            status: 'COMPLETED', // Demo için ödeme tamamlandı olarak işaretleniyor
            providerTransactionId: idempotencyKey // PayTR entegrasyonu olduğunda gerçek transaction ID ile değiştirilecek
          }
        }
      }
    });

    // İşlem kaydını oluştur
    await prisma.transactionLog.create({
      data: {
        transactionType: 'ORDER_CREATION',
        entityId: order.id,
        entityCode: order.orderNumber,
        status: 'SUCCESS',
        userId,
        amount: total,
        idempotencyKey,
        description: `Order ${order.orderNumber} created successfully`,
        details: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentMethod,
          total,
          items: items.length
        }
      }
    });

    // Başarılı cevap döndür
    return res.status(200).json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while creating the order',
      message: 'Sipariş oluşturulurken bir hata meydana geldi'
    });
  }
} 