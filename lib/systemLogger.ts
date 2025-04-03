import prisma from '@/lib/prisma';
import { NextApiRequest } from 'next';

/**
 * Sistem log kayıt türleri
 */
type LogType = 'ERROR' | 'WARNING' | 'INFO';

/**
 * Sistem log verisi
 */
type LogAction = 
  | 'AUTH_FAILED' 
  | 'LOGIN_SUCCESS' 
  | 'LOGIN_FAILED' 
  | 'USER_CREATED' 
  | 'USER_UPDATED' 
  | 'ORDER_CREATED' 
  | 'ORDER_UPDATED' 
  | 'PAYMENT_SUCCESS' 
  | 'PAYMENT_FAILED' 
  | 'COUPON_CREATED' 
  | 'COUPON_UPDATED' 
  | 'COUPON_DELETED' 
  | 'COUPON_USED' 
  | 'GIFT_CARD_CREATED' 
  | 'GIFT_CARD_UPDATED' 
  | 'GIFT_CARD_DELETED' 
  | 'GIFT_CARD_USED'
  | 'GIFT_CARD_TRANSACTION'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_UPDATED'
  | 'CAMPAIGN_DELETED'
  | 'ERROR'
  | string;

export type SystemLogData = {
  type?: LogType;
  action: LogAction;
  description: string;
  userId?: number;
  ip?: string;
  ipAddress?: string;
  metadata?: any;
};

/**
 * Sistem günlüğüne kayıt ekleme (daha modern syntax ile)
 * @param logData Log data objesi
 */
export async function systemLog(logData: SystemLogData): Promise<void> {
  try {
    const payload: any = {
      type: logData.type || 'INFO',
      action: logData.action,
      description: logData.description,
      ipAddress: logData.ip || logData.ipAddress || null,
    };
    
    if (logData.userId) {
      payload.user = { 
        connect: { id: logData.userId } 
      };
    }
    
    if (logData.metadata) {
      payload.metadata = JSON.stringify(logData.metadata);
    }
    
    await prisma.systemLog.create({ data: payload });
  } catch (error) {
    console.error('Sistem log kaydı oluşturulurken hata: ', error);
  }
}

/**
 * Sistem günlüğüne kayıt ekleyen yardımcı fonksiyon
 * @param logData Log data objesi
 */
export async function createSystemLog(data: SystemLogData): Promise<boolean> {
  try {
    const { type = 'INFO', action, description, userId, ip, ipAddress, metadata } = data;
    
    const payload: any = {
      type,
      action,
      description,
      ipAddress: ip || ipAddress || null,
    };
    
    if (userId) {
      payload.user = { 
        connect: { id: userId } 
      };
    }
    
    if (metadata) {
      payload.metadata = JSON.stringify(metadata);
    }
    
    await prisma.systemLog.create({ data: payload });
    
    return true;
  } catch (error) {
    console.error('Sistem günlüğü oluşturulurken hata:', error);
    return false;
  }
}

/**
 * Hata türünde sistem log kaydı oluşturur
 * @param action Eylem adı
 * @param description Açıklama
 * @param ipAddress IP adresi
 * @param userId Kullanıcı ID
 */
export async function logError(action: string, description: string, ipAddress?: string, userId?: number): Promise<void> {
  await systemLog({
    type: 'ERROR',
    action,
    description,
    ipAddress,
    userId,
  });
}

/**
 * Bilgi türünde sistem log kaydı oluşturur
 * @param action Eylem adı
 * @param description Açıklama
 * @param ipAddress IP adresi
 * @param userId Kullanıcı ID
 */
export async function logInfo(action: string, description: string, ipAddress?: string, userId?: number): Promise<void> {
  await systemLog({
    type: 'INFO',
    action,
    description,
    ipAddress,
    userId,
  });
}

/**
 * Uyarı türünde sistem log kaydı oluşturur
 * @param action Eylem adı
 * @param description Açıklama
 * @param ipAddress IP adresi
 * @param userId Kullanıcı ID
 */
export async function logWarning(action: string, description: string, ipAddress?: string, userId?: number): Promise<void> {
  await systemLog({
    type: 'WARNING',
    action,
    description,
    ipAddress,
    userId,
  });
}

/**
 * İstek nesnesinden IP adresini getiren yardımcı fonksiyon
 * @param req İstek nesnesi
 * @returns IP adresi
 */
export function getIpFromRequest(req: any): string | null {
  return (
    (req.headers && req.headers['x-forwarded-for']?.split(',')[0]) ||
    req.connection?.remoteAddress ||
    null
  );
}

/**
 * İstek içinden IP adresini çıkarır
 */
export function extractIpFromRequest(req: NextApiRequest): string {
  return (
    ((req.headers['x-forwarded-for'] as string) || 
    req.socket.remoteAddress || 
    'unknown')
  );
}

/**
 * Hata günlüğü oluşturur
 */
export function createErrorLog(description: string, userId?: number, ip?: string, metadata?: any) {
  return createSystemLog({
    type: 'ERROR',
    action: 'ERROR',
    description,
    userId,
    ip,
    metadata,
  });
}

/**
 * Uyarı günlüğü oluşturur
 */
export function createWarningLog(action: LogAction, description: string, userId?: number, ip?: string, metadata?: any) {
  return createSystemLog({
    type: 'WARNING',
    action,
    description,
    userId,
    ip,
    metadata,
  });
}

/**
 * Bilgi günlüğü oluşturur
 */
export function createInfoLog(action: LogAction, description: string, userId?: number, ip?: string, metadata?: any) {
  return createSystemLog({
    type: 'INFO',
    action,
    description,
    userId,
    ip,
    metadata,
  });
} 