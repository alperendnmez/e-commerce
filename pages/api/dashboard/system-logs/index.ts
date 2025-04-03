import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { getIpFromRequest, logError } from '@/lib/systemLogger';

// Geçerli sıralama alanlarını tanımla
const VALID_SORT_FIELDS = ['createdAt', 'type', 'action'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Oturum kontrolü
  const session = await getServerSession(req, res, authOptions);
  
  // Sadece admin kullanıcılar erişebilir
  if (!session || (session.user as any).role !== 'ADMIN') {
    return res.status(401).json({ 
      success: false, 
      error: 'Yetkilendirme başarısız' 
    });
  }

  // HTTP metoduna göre işlem yap
  switch (req.method) {
    case 'GET':
      return await getSystemLogs(req, res, session);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ 
        success: false, 
        error: `Metod desteklenmiyor: ${req.method}` 
      });
  }
}

/**
 * Sistem günlüklerini getirir
 */
async function getSystemLogs(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    // Sayfalama parametreleri
    const page = Number(req.query.page) || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 100); // Maksimum 100 kayıt
    const skip = (page - 1) * pageSize;
    
    // Sıralama parametreleri
    const sortField = VALID_SORT_FIELDS.includes(String(req.query.sortBy))
      ? String(req.query.sortBy)
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    
    // Filtreleme parametreleri
    const filters: any = {};
    
    // Tür filtresi
    if (req.query.type && ['ERROR', 'WARNING', 'INFO'].includes(String(req.query.type))) {
      filters.type = String(req.query.type);
    }
    
    // İşlem filtresi
    if (req.query.action) {
      filters.action = {
        contains: String(req.query.action),
        mode: 'insensitive'
      };
    }

    // Tarih aralığı filtresi
    if (req.query.startDate) {
      filters.createdAt = {
        ...filters.createdAt,
        gte: new Date(String(req.query.startDate))
      };
    }
    
    if (req.query.endDate) {
      const endDate = new Date(String(req.query.endDate));
      endDate.setHours(23, 59, 59, 999); // Günün sonuna ayarla
      
      filters.createdAt = {
        ...filters.createdAt,
        lte: endDate
      };
    }
    
    // Kullanıcı filtresi
    if (req.query.userId) {
      filters.userId = Number(req.query.userId);
    }

    // Manuel olarak ham SQL sorgusu ile günlük kayıtlarını getir
    const whereClause = Object.keys(filters).length > 0 
      ? `WHERE ${Object.entries(filters)
          .map(([key, value]) => {
            if (key === 'createdAt') {
              const conditions = [];
              if ((value as any).gte) {
                conditions.push(`"createdAt" >= '${(value as any).gte.toISOString()}'`);
              }
              if ((value as any).lte) {
                conditions.push(`"createdAt" <= '${(value as any).lte.toISOString()}'`);
              }
              return conditions.join(' AND ');
            }
            if (key === 'action' && typeof value === 'object' && (value as any).contains) {
              return `"action" ILIKE '%${(value as any).contains}%'`;
            }
            return `"${key}" = '${value}'`;
          })
          .join(' AND ')}`
      : '';

    // Toplam kayıt sayısını al
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM "SystemLog" ${prisma.$raw(whereClause)}
    `;
    
    const totalCount = Number((countResult as any)[0].total);
    
    // Günlük kayıtlarını getir
    const logs = await prisma.$queryRaw`
      SELECT sl.*, u.name as "userName", u.email as "userEmail" 
      FROM "SystemLog" sl
      LEFT JOIN "User" u ON sl."userId" = u.id
      ${prisma.$raw(whereClause)}
      ORDER BY ${prisma.$raw(`sl."${sortField}" ${sortOrder}`)}
      LIMIT ${pageSize} OFFSET ${skip}
    `;
    
    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Yanıtı döndür
    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });
  } catch (error) {
    // Hata günlüğü oluştur
    const ipAddress = getIpFromRequest(req);
    await logError(
      'GET_SYSTEM_LOGS',
      `Sistem günlükleri getirilirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      ipAddress || undefined,
      session?.user?.id
    );
    
    // Hata yanıtı döndür
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Sistem günlükleri getirilirken bir hata oluştu'
    });
  }
} 