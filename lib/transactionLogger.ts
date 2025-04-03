import prisma from '@/lib/prisma';

/**
 * İşlem kaydı oluşturma fonksiyonu
 * @param data İşlem kaydı verileri
 * @returns Oluşturulan işlem kaydı
 */
export async function transactionLog(data: {
  transactionType: 'COUPON_USAGE' | 'GIFT_CARD_USAGE' | 'CAMPAIGN_USAGE';
  entityId: number; 
  entityCode?: string;
  status: 'INITIATED' | 'RESERVED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  orderId?: number;
  userId?: number;
  amount?: number;
  idempotencyKey?: string;
  description?: string;
  details?: Record<string, any>;
}) {
  try {
    const log = await prisma.transactionLog.create({
      data
    });
    return log;
  } catch (error) {
    console.error('Transaction log creation error:', error);
    return null;
  }
}

/**
 * İşlem durumu güncelleme fonksiyonu
 * @param id İşlem kaydı ID
 * @param status Yeni durum
 * @param additionalData Eklenecek ek veriler
 * @returns Güncellenmiş işlem kaydı
 */
export async function updateTransactionStatus(
  id: number,
  status: 'INITIATED' | 'RESERVED' | 'COMPLETED' | 'CANCELLED' | 'FAILED',
  additionalData?: {
    description?: string;
    details?: Record<string, any>;
    orderId?: number;
    amount?: number;
  }
) {
  try {
    const updatedLog = await prisma.transactionLog.update({
      where: { id },
      data: {
        status,
        ...(additionalData || {})
      }
    });
    return updatedLog;
  } catch (error) {
    console.error('Transaction log update error:', error);
    return null;
  }
}

/**
 * İdempotency anahtarına göre işlem kaydı arama
 * @param idempotencyKey İdempotency anahtarı
 * @returns Bulunan işlem kaydı
 */
export async function findTransactionByIdempotencyKey(idempotencyKey: string) {
  try {
    const log = await prisma.transactionLog.findFirst({
      where: { idempotencyKey },
      orderBy: { createdAt: 'desc' }
    });
    return log;
  } catch (error) {
    console.error('Transaction log find error:', error);
    return null;
  }
}

/**
 * Belirli bir varlık için son işlem kaydını bulma
 * @param entityId Varlık ID
 * @param transactionType İşlem tipi
 * @returns Bulunan son işlem kaydı
 */
export async function findLatestTransactionForEntity(
  entityId: number,
  transactionType: 'COUPON_USAGE' | 'GIFT_CARD_USAGE' | 'CAMPAIGN_USAGE'
) {
  try {
    const log = await prisma.transactionLog.findFirst({
      where: { 
        entityId,
        transactionType
      },
      orderBy: { createdAt: 'desc' }
    });
    return log;
  } catch (error) {
    console.error('Transaction log find error:', error);
    return null;
  }
}

/**
 * Sipariş ile ilişkili tüm işlemleri bulma
 * @param orderId Sipariş ID
 * @returns Bulunan işlem kayıtları
 */
export async function findTransactionsByOrder(orderId: number) {
  try {
    const logs = await prisma.transactionLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });
    return logs;
  } catch (error) {
    console.error('Transaction logs find error:', error);
    return [];
  }
}

/**
 * Kullanıcı ile ilişkili tüm işlemleri bulma
 * @param userId Kullanıcı ID
 * @returns Bulunan işlem kayıtları
 */
export async function findTransactionsByUser(userId: number) {
  try {
    const logs = await prisma.transactionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return logs;
  } catch (error) {
    console.error('Transaction logs find error:', error);
    return [];
  }
} 