import prisma from "@/lib/prisma";

export type ApiErrorCode = 
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "CART_EMPTY"
  | "PRODUCT_OUT_OF_STOCK"
  | "PAYMENT_FAILED"
  | "INVALID_COUPON"
  | "COUPON_EXPIRED"
  | "GIFT_CARD_INVALID"
  | "GIFT_CARD_DEPLETED"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_ORDER_STATUS"
  | "ORDER_NUMBER_ALREADY_EXISTS";

export interface ApiErrorData {
  [key: string]: any;
}

export class ApiError extends Error {
  statusCode: number;
  code: ApiErrorCode;
  data?: ApiErrorData;

  constructor(message: string, statusCode: number, code: ApiErrorCode, data?: ApiErrorData) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

/**
 * Creates a system log entry
 */
export interface SystemLogData {
  type: 'ERROR' | 'WARNING' | 'INFO';
  action: string;
  description: string;
  ipAddress?: string;
  userId?: number;
}

/**
 * Sistem günlüğü oluşturma yardımcı fonksiyonu
 * 
 * @param logData Günlük kaydı verisi
 * @returns Promise<void>
 */
export async function createSystemLog(logData: SystemLogData): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        type: logData.type,
        action: logData.action,
        description: logData.description,
        ipAddress: logData.ipAddress,
        userId: logData.userId
      }
    });
  } catch (error) {
    // Günlükleme başarısız olursa, bu hatayı sessizce yönet
    // Günlükleme hatası nedeniyle uygulamayı bozmak istemiyoruz
    console.error('Günlük oluşturma hatası:', error);
  }
}

/**
 * IP adresini talep nesnesinden çıkarır
 * 
 * @param req HTTP isteği
 * @returns IP adresi veya bilinmiyorsa null
 */
export function getIpFromRequest(req: any): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0];
  }
  
  return req.socket?.remoteAddress || null;
} 