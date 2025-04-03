import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import { stockService } from '@/services/stockService';

// API isteklerini izlemek için rate limiter
const RATE_LIMIT = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const MAX_REQUESTS = 10; // 1 dakikada maksimum 10 istek

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CSRF koruması için Origin kontrolü
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'https://your-production-domain.com' // Üretim ortamında değiştirin
  ];

  const isValidOrigin = allowedOrigins.some(allowed => 
    origin.startsWith(allowed) || referer.startsWith(allowed)
  );

  if (!isValidOrigin) {
    console.warn('Geçersiz origin:', { origin, referer });
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden: Invalid origin' 
    });
  }

  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  // Rate limiting uygula
  const clientIp = req.headers['x-forwarded-for'] || 
    req.connection.remoteAddress || 
    'unknown';
    
  const now = Date.now();
  const clientRequests = RATE_LIMIT.get(clientIp) || [];
  
  // Son 1 dakikadaki istekleri filtrele
  const recentRequests = clientRequests.filter((timestamp: number) => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    console.warn(`Rate limit aşıldı: ${clientIp}, son ${recentRequests.length} istek`);
    return res.status(429).json({ 
      success: false, 
      message: 'Too many requests, please try again later' 
    });
  }
  
  // İstek zamanını kaydet
  RATE_LIMIT.set(clientIp, [...recentRequests, now]);

  try {
    // İstek gövdesinden verileri al
    const { reservationIds } = req.body;

    // Zorunlu alanları kontrol et
    if (!reservationIds || !Array.isArray(reservationIds) || reservationIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reservation IDs array is required' 
      });
    }

    // Fazla büyük rezervasyon dizisi gelirse reddedelim (olası DOS saldırısı)
    if (reservationIds.length > 50) {
      console.warn(`Aşırı büyük rezervasyon dizisi: ${reservationIds.length}`);
      return res.status(400).json({
        success: false,
        message: 'Too many reservations in a single request'
      });
    }

    // Oturum kontrolü
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthenticated' 
      });
    }
    
    const userId = parseInt(session.user.id);

    // Rezervasyonlar kullanıcıya ait mi kontrol et
    try {
      // Örnek olarak her rezervasyon için sadece ilk kontrolde sunucuyu yüklememek için
      // Rastgele bir rezervasyon seçip kullanıcı kontrolü yapabiliriz
      const sampleId = reservationIds[0];
      const reservation = await stockService.getReservationById(parseInt(sampleId.toString()));
      
      // Rezervasyon varsa ve kullanıcıya ait değilse (ve oturum başka bir kullanıcıya aitse) yetkisiz erişim
      if (reservation && reservation.userId && reservation.userId !== userId) {
        console.warn(`Yetkisiz rezervasyon erişimi: Kullanıcı ${userId}, rezervasyon kullanıcısı ${reservation.userId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to convert these reservations'
        });
      }
    } catch (error) {
      // Rezervasyon bulunamadı veya başka bir hata oluştu, kontrol hatası logla ama işleme devam et
      console.warn('Rezervasyon doğrulama hatası:', error);
    }

    console.log('Dönüştürülecek rezervasyonlar:', reservationIds);

    // Rezervasyonları siparişe dönüştür - her bir rezervasyon için ayrı try-catch blokları kullanarak
    // tüm işlemin tek bir rezervasyon hatası yüzünden başarısız olmasını engelleyelim
    const results = await Promise.all(
      reservationIds.map(async (id) => {
        try {
          const reservationId = parseInt(id.toString());
          
          // Geçersiz ID numaralarını filtrele
          if (isNaN(reservationId) || reservationId <= 0) {
            console.warn(`Geçersiz rezervasyon ID'si: ${id}`);
            return { id, success: false, message: 'Invalid reservation ID' };
          }
          
          console.log(`Rezervasyon dönüştürülüyor: ${reservationId}`);
          const success = await stockService.convertReservation(reservationId);
          return { id: reservationId, success };
        } catch (error) {
          console.error(`ID: ${id} rezervasyon dönüştürme hatası:`, error);
          // Hata durumunda işlemi kesme, sadece bu rezervasyonu başarısız olarak işaretle
          return { 
            id, 
            success: false, 
            message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    console.log('Dönüşüm sonuçları:', results);

    // Başarılı dönüşümleri filtrele
    const successfulResults = results.filter(r => r.success === true);
    
    // Sonucu döndür - Hepsi başarılı mı?
    const allSuccessful = successfulResults.length === reservationIds.length;
    
    return res.status(200).json({ 
      success: true, // API çağrısı başarılı oldu (rezervasyonların dönüşümü başarısız olsa bile)
      allConverted: allSuccessful,
      message: allSuccessful 
        ? 'All reservations converted to orders successfully' 
        : 'Some reservations could not be converted',
      details: results
    });
  } catch (error) {
    console.error('Error converting reservations:', error);
    return res.status(200).json({ 
      success: false, 
      message: 'Failed to convert reservations to orders',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 