import prisma from '@/lib/prisma';
import { ApiError, ErrorType } from '@/lib/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { ReservationStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Rezervasyon durumu için sabit değerler - String olarak belirtme yöntemi değil, 
// doğrudan enum değerleri kullan
const RESERVATION_STATUS: Record<string, ReservationStatus> = {
  ACTIVE: 'ACTIVE',
  CONVERTED: 'CONVERTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

// Rezervasyon süresi için varsayılan değer: 30 dakika
const DEFAULT_RESERVATION_TIME_MINUTES = 30;

/**
 * Stok yönetimi servisi - Ürün stoklarıyla ilgili işlemleri yönetir
 */
export class StockService {
  /**
   * Belirli bir varyantın stok durumunu kontrol eder
   */
  async checkVariantStock(variantId: number, requestedQuantity: number): Promise<boolean> {
    try {
      // Sayısal değer kontrolü
      const numericVariantId = Number(variantId);
      const numericQuantity = Number(requestedQuantity);
      
      if (isNaN(numericVariantId) || numericVariantId <= 0) {
        console.error(`[StockService] Invalid variantId: ${variantId}, parsed: ${numericVariantId}`);
        throw new ApiError(ErrorType.VALIDATION, `Invalid variant ID: ${variantId}`);
      }
      
      if (isNaN(numericQuantity) || numericQuantity <= 0) {
        console.error(`[StockService] Invalid quantity: ${requestedQuantity}, parsed: ${numericQuantity}`);
        throw new ApiError(ErrorType.VALIDATION, `Invalid quantity: ${requestedQuantity}`);
      }
      
      console.log(`[StockService] Checking stock for variant ${numericVariantId}, requested quantity: ${numericQuantity}`);
      
      const variant = await prisma.productVariant.findUnique({
        where: { id: numericVariantId },
        select: { stock: true }
      });

      if (!variant) {
        console.error(`[StockService] Variant with ID ${numericVariantId} not found`);
        throw new ApiError(ErrorType.NOT_FOUND, `Variant with ID ${numericVariantId} not found`);
      }

      console.log(`[StockService] Variant found, stock: ${variant.stock}`);

      // Aktif rezervasyonları hesapla
      const activeReservations = await this.getActiveReservationsCount(numericVariantId);
      const availableStock = variant.stock - activeReservations;
      
      console.log(`[StockService] Active reservations: ${activeReservations}, available stock: ${availableStock}, requested: ${numericQuantity}`);

      return availableStock >= numericQuantity;
    } catch (error) {
      console.error('[StockService] Error checking variant stock:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to check variant stock');
    }
  }

  /**
   * Varyant için aktif rezervasyonların toplam miktarını hesaplar
   */
  private async getActiveReservationsCount(variantId: number): Promise<number> {
    const now = new Date();
    
    const activeReservations = await prisma.stockReservation.findMany({
      where: {
        variantId: variantId,
        status: RESERVATION_STATUS.ACTIVE,
        expiresAt: {
          gt: now
        }
      },
      select: {
        quantity: true
      }
    });
    
    return activeReservations.reduce((total: number, reservation: { quantity: number }) => total + reservation.quantity, 0);
  }

  /**
   * Varyant için stok rezervasyonu yapar
   */
  async createReservation(
    variantId: number, 
    quantity: number, 
    sessionId?: string, 
    userId?: number, 
    minutes: number = DEFAULT_RESERVATION_TIME_MINUTES
  ): Promise<{ success: boolean, reservationId?: number, message?: string }> {
    try {
      // Sayısal değer kontrolü
      const numericVariantId = Number(variantId);
      const numericQuantity = Number(quantity);
      let numericUserId = userId ? Number(userId) : undefined;
      
      console.log(`[StockService] createReservation - Giriş parametreleri:`, {
        variantId: variantId, 
        variantIdType: typeof variantId,
        parsedVariantId: numericVariantId,
        parsedVariantIdType: typeof numericVariantId,
        quantity: quantity,
        quantityType: typeof quantity,
        parsedQuantity: numericQuantity,
        parsedQuantityType: typeof numericQuantity,
        sessionId: sessionId?.slice(0, 8) + '...',
        sessionIdType: typeof sessionId,
        userId: userId,
        userIdType: typeof userId,
        parsedUserId: numericUserId,
        parsedUserIdType: typeof numericUserId
      });
      
      if (isNaN(numericVariantId) || numericVariantId <= 0) {
        console.error(`[StockService] Invalid variantId in createReservation: ${variantId}`);
        return {
          success: false,
          message: `Geçersiz varyant ID: ${variantId}`
        };
      }
      
      if (isNaN(numericQuantity) || numericQuantity <= 0) {
        console.error(`[StockService] Invalid quantity in createReservation: ${quantity}`);
        return {
          success: false,
          message: `Geçersiz miktar: ${quantity}`
        };
      }
      
      if (numericUserId !== undefined && (isNaN(numericUserId) || numericUserId <= 0)) {
        console.error(`[StockService] Invalid userId in createReservation: ${userId}`);
        // UserId opsiyonel olduğu için hata yerine log basıp devam ediyoruz
        console.log(`[StockService] Continuing with userId as undefined`);
        numericUserId = undefined;
      }
      
      if (!sessionId) {
        console.error('[StockService] Missing sessionId in createReservation, this is required');
        return {
          success: false,
          message: 'Geçersiz oturum ID'
        };
      }
      
      console.log(`[StockService] Creating reservation for variant ${numericVariantId}, quantity: ${numericQuantity}, userId: ${numericUserId || 'guest'}`);
      
      // Varyant varlığını doğrula
      const variantExists = await prisma.productVariant.findUnique({
        where: { id: numericVariantId }
      });
      
      if (!variantExists) {
        console.error(`[StockService] Variant with ID ${numericVariantId} does not exist in the database`);
        return {
          success: false,
          message: `Varyant bulunamadı: ID ${numericVariantId}`
        };
      }
      
      console.log(`[StockService] Variant confirmed to exist with ID ${numericVariantId}, stock: ${variantExists.stock}`);
      
      // Yeterli stok var mı kontrol et
      let hasStock = false;
      hasStock = await this.checkVariantStock(numericVariantId, numericQuantity);
      console.log(`[StockService] Stock check result: ${hasStock ? 'Available' : 'Not available'}`);
      
      if (!hasStock) {
        console.log(`[StockService] Insufficient stock for variant ID ${numericVariantId}. Requested: ${numericQuantity}`);
        return {
          success: false,
          message: `Yetersiz stok. Varyant ID: ${numericVariantId}, Talep edilen: ${numericQuantity}`
        };
      }
      
      // Oturum ID'si belirtilmemişse oluştur
      const reservationSessionId = sessionId || uuidv4();
      
      // Rezervasyon için son kullanma tarihi (30 dakika)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
      
      // Prisma'ya gönderilecek tam veriyi hazırla
      let finalUserId = null;
      if (numericUserId !== undefined && !isNaN(numericUserId) && numericUserId > 0) {
        finalUserId = numericUserId;
      }
      
      console.log(`[StockService] finalUserId değeri:`, finalUserId, typeof finalUserId);
      console.log(`[StockService] finalUserId null mu?:`, finalUserId === null);
      console.log(`[StockService] finalUserId undefined mı?:`, finalUserId === undefined);
      
      // Tüm verileri konsola ayrı ayrı logla
      console.log(`[StockService] variantId:`, numericVariantId, typeof numericVariantId);
      console.log(`[StockService] quantity:`, numericQuantity, typeof numericQuantity);
      console.log(`[StockService] sessionId:`, reservationSessionId.slice(0, 8) + '...', typeof reservationSessionId);
      console.log(`[StockService] userId:`, finalUserId, typeof finalUserId);
      console.log(`[StockService] expiresAt:`, expiresAt, typeof expiresAt);
      console.log(`[StockService] status: Enum ACTIVE`);
      
      // Raw SQL sorgusu ile veri oluştur
      try {
        console.log(`[StockService] Trying final direct query approach`);
        
        try {
          // Raw SQL sorgusu ile veritabanına doğrudan ekleme yap
          const rawInsertResult = await prisma.$queryRaw`
            INSERT INTO "StockReservation" 
            ("variantId", "quantity", "sessionId", "expiresAt", "status")
            VALUES 
            (${numericVariantId}, ${numericQuantity}, ${reservationSessionId}, ${expiresAt}, 'ACTIVE')
          `;
          
          console.log(`[StockService] Raw insert completed:`, rawInsertResult);
          
          // En son eklenen rezervasyonu getir
          const lastReservation = await prisma.stockReservation.findFirst({
            where: {
              variantId: numericVariantId,
              sessionId: reservationSessionId
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          if (!lastReservation) {
            throw new Error('Reservation created but could not be retrieved');
          }
          
          console.log(`[StockService] Reservation retrieved, ID:`, lastReservation.id);
          return {
            success: true,
            reservationId: lastReservation.id
          };
        } catch (innerError) {
          console.error('[StockService] Inner error during SQL execution:', innerError);
          
          if (innerError instanceof Error) {
            console.error('[StockService] Inner error name:', innerError.name);
            console.error('[StockService] Inner error message:', innerError.message);
            console.error('[StockService] Inner error stack:', innerError.stack);
            
            // @ts-ignore - Bu kısım özel Prisma hata özelliklerine erişiyor
            if (innerError.code) {
              console.error('[StockService] Prisma error code:', innerError.code);
            }
            
            // @ts-ignore
            if (innerError.meta) {
              console.error('[StockService] Prisma error meta:', innerError.meta);
            }
          }
          
          throw innerError;
        }
      } catch (sqlError) {
        console.error('[StockService] SQL Error:', sqlError);
        throw sqlError; // Hata rethrow edilsin
      }
    } catch (error) {
      console.error('[StockService] Error creating stock reservation:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Ayrıntılı hata bilgisini görelim
      if (error instanceof Error) {
        console.error('[StockService] Error type:', error.constructor.name);
        console.error('[StockService] Error name:', error.name);
        console.error('[StockService] Error message:', error.message);
        console.error('[StockService] Error stack:', error.stack);
        
        // Prisma hatası mı kontrol et ve hata kodlarını göster
        if (
          error.name === 'PrismaClientKnownRequestError' || 
          error.name === 'PrismaClientUnknownRequestError' ||
          error.name === 'PrismaClientValidationError' ||
          error.name.startsWith('Prisma')
        ) {
          console.error('[StockService] Prisma error detected!');
          // @ts-ignore - Bu kısım Prisma hata nesnesinin özel alanlarına erişiyor
          if (error.code) console.error('[StockService] Prisma error code:', error.code);
          // @ts-ignore
          if (error.clientVersion) console.error('[StockService] Prisma client version:', error.clientVersion);
          // @ts-ignore
          if (error.meta) console.error('[StockService] Prisma error meta:', error.meta);
        }
      }
      
      // Genel bir hata fırlat
      throw new ApiError(ErrorType.INTERNAL, 'Failed to create stock reservation');
    }
  }

  /**
   * Rezervasyonu siparişe dönüştür ve stoktan düş
   */
  async convertReservation(reservationId: number): Promise<boolean> {
    try {
      const reservation = await prisma.stockReservation.findUnique({
        where: { id: reservationId }
      });
      
      if (!reservation) {
        throw new ApiError(ErrorType.NOT_FOUND, `Reservation with ID ${reservationId} not found`);
      }
      
      if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
        throw new ApiError(
          ErrorType.CONFLICT, 
          `Reservation with ID ${reservationId} is not active. Current status: ${reservation.status}`
        );
      }
      
      // Rezervasyon süresi dolmuş mu kontrol et
      const now = new Date();
      if (reservation.expiresAt < now) {
        await prisma.stockReservation.update({
          where: { id: reservationId },
          data: { status: RESERVATION_STATUS.EXPIRED }
        });
        
        throw new ApiError(
          ErrorType.CONFLICT, 
          `Reservation with ID ${reservationId} has expired`
        );
      }
      
      // Stok güncelleme ve rezervasyon durumunu değiştirme işlemini transaction içinde yap
      await prisma.$transaction([
        // Stok güncelleme
        prisma.productVariant.update({
          where: { id: reservation.variantId },
          data: {
            stock: {
              decrement: reservation.quantity
            }
          }
        }),
        
        // Rezervasyon durumunu güncelle
        prisma.stockReservation.update({
          where: { id: reservationId },
          data: { status: RESERVATION_STATUS.CONVERTED }
        })
      ]);
      
      return true;
    } catch (error) {
      console.error('Error converting reservation:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to convert reservation');
    }
  }

  /**
   * Rezervasyonu iptal et
   */
  async cancelReservation(reservationId: number): Promise<boolean> {
    try {
      const reservation = await prisma.stockReservation.findUnique({
        where: { id: reservationId }
      });
      
      if (!reservation) {
        throw new ApiError(ErrorType.NOT_FOUND, `Reservation with ID ${reservationId} not found`);
      }
      
      if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
        // Zaten iptal edilmiş veya dönüştürülmüş ise başarılı kabul et
        return true;
      }
      
      // Rezervasyon durumunu güncelle
      await prisma.stockReservation.update({
        where: { id: reservationId },
        data: { status: RESERVATION_STATUS.CANCELLED }
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to cancel reservation');
    }
  }

  /**
   * Kullanıcının veya oturumun tüm rezervasyonlarını iptal et
   */
  async cancelAllReservations(userId?: number, sessionId?: string): Promise<boolean> {
    if (!userId && !sessionId) {
      throw new ApiError(ErrorType.NOT_FOUND, 'Either userId or sessionId must be provided');
    }
    
    try {
      // Filtreleme koşulunu oluştur
      const whereCondition: any = {
        status: RESERVATION_STATUS.ACTIVE
      };
      
      if (userId) {
        whereCondition.userId = userId;
      }
      
      if (sessionId) {
        whereCondition.sessionId = sessionId;
      }
      
      // Tüm rezervasyonları güncelle
      await prisma.stockReservation.updateMany({
        where: whereCondition,
        data: {
          status: RESERVATION_STATUS.CANCELLED
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling all reservations:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to cancel reservations');
    }
  }

  /**
   * Süresi dolmuş tüm rezervasyonları temizler
   * @returns Temizlenen rezervasyon sayısı
   */
  async cleanupExpiredReservations(): Promise<number> {
    try {
      const now = new Date();
      
      // Süresi dolmuş rezervasyonları bul
      const expiredReservations = await prisma.stockReservation.findMany({
        where: {
          status: RESERVATION_STATUS.ACTIVE,
          expiresAt: {
            lt: now
          }
        }
      });
      
      if (expiredReservations.length === 0) {
        return 0;
      }
      
      // Rezervasyonları iptal et - SQL sorgusu kullanarak
      const idList = expiredReservations.map(r => r.id);
      
      if (idList.length > 0) {
        const updateResult = await prisma.$executeRaw`
          UPDATE "StockReservation"
          SET "status" = 'CANCELLED'::\"ReservationStatus\"
          WHERE "id" IN (${Prisma.join(idList)})
        `;
        
        return updateResult;
      }
      
      return 0; // Hiç güncelleme yapılmadıysa 0 dön
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
      throw new ApiError(ErrorType.INTERNAL, 'Failed to clean up expired reservations');
    }
  }

  /**
   * Bir ürünün toplam stok durumunu kontrol eder (tüm varyantlar)
   */
  async checkProductTotalStock(productId: number, requestedQuantity: number): Promise<boolean> {
    try {
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        select: { id: true, stock: true }
      });

      if (variants.length === 0) {
        throw new ApiError(ErrorType.NOT_FOUND, `No variants found for product ID ${productId}`);
      }

      // Her varyant için aktif rezervasyonları hesapla
      let totalAvailableStock = 0;
      
      for (const variant of variants) {
        const activeReservations = await this.getActiveReservationsCount(variant.id);
        totalAvailableStock += Math.max(0, variant.stock - activeReservations);
      }
      
      return totalAvailableStock >= requestedQuantity;
    } catch (error) {
      console.error('Error checking product total stock:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to check product stock');
    }
  }

  /**
   * Varyant stoğunu günceller
   */
  async updateVariantStock(variantId: number, quantity: number, isIncrement: boolean = false): Promise<boolean> {
    try {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true }
      });

      if (!variant) {
        throw new ApiError(ErrorType.NOT_FOUND, `Variant with ID ${variantId} not found`);
      }

      // Stok azaltma durumunda yeterli stok kontrolü
      if (!isIncrement && variant.stock < quantity) {
        throw new ApiError(
          ErrorType.CONFLICT, 
          `Insufficient stock for variant ID ${variantId}. Available: ${variant.stock}, Requested: ${quantity}`
        );
      }

      // Stok güncelleme
      const newStock = isIncrement 
        ? variant.stock + quantity 
        : Math.max(0, variant.stock - quantity);

      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock }
      });

      return true;
    } catch (error) {
      console.error('Error updating variant stock:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, 'Failed to update variant stock');
    }
  }

  /**
   * Düşük stok ürünlerini getirir
   */
  async getLowStockProducts(threshold: number = 5) {
    try {
      const lowStockVariants = await prisma.productVariant.findMany({
        where: {
          stock: { lte: threshold }
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrls: true
            }
          }
        },
        orderBy: {
          stock: 'asc'
        }
      });

      return lowStockVariants;
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw new ApiError(ErrorType.INTERNAL, 'Failed to fetch low stock products');
    }
  }

  /**
   * Tükenen ürünleri getirir
   */
  async getOutOfStockProducts() {
    try {
      const outOfStockVariants = await prisma.productVariant.findMany({
        where: {
          stock: 0
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrls: true
            }
          }
        }
      });

      return outOfStockVariants;
    } catch (error) {
      console.error('Error fetching out of stock products:', error);
      throw new ApiError(ErrorType.INTERNAL, 'Failed to fetch out of stock products');
    }
  }

  /**
   * Rezervasyon ID'sine göre rezervasyon detaylarını getir
   */
  async getReservationById(reservationId: number) {
    try {
      const reservation = await prisma.stockReservation.findUnique({
        where: { id: reservationId }
      });
      
      return reservation;
    } catch (error) {
      console.error(`Error getting reservation ${reservationId}:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ErrorType.INTERNAL, `Failed to get reservation details for ID: ${reservationId}`);
    }
  }
}

// Singleton olarak bir örnek oluştur ve dışa aktar
export const stockService = new StockService(); 