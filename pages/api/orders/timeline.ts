import { NextApiRequest, NextApiResponse } from 'next';
import { OrderStatus } from '@prisma/client';
import { withUser, withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import { createSuccessResponse, createErrorResponse } from '@/types/api-response';
import { ErrorType } from '@/lib/errorHandler';
import { orderTimelineService } from '@/services/orderTimelineService';

// Timeline API'si - Sadece admin kullanabilir
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        const { orderId } = req.query;

        if (!orderId || typeof orderId !== 'string') {
          return res.status(400).json(
            createErrorResponse('Geçersiz sipariş ID', ErrorType.VALIDATION)
          );
        }

        const timeline = await orderTimelineService.getTimelineByOrderId(parseInt(orderId, 10));

        return res.status(200).json(
          createSuccessResponse(timeline)
        );
      } catch (error) {
        console.error('GET /api/orders/timeline hatası:', error);
        return res.status(500).json(
          createErrorResponse('Sunucu hatası', ErrorType.INTERNAL)
        );
      }

    case 'POST':
      try {
        const { orderId, status, description } = req.body;

        if (!orderId || !status || !description) {
          return res.status(400).json(
            createErrorResponse('Sipariş ID, durum ve açıklama alanları gerekli', ErrorType.VALIDATION)
          );
        }

        const timeline = await orderTimelineService.createTimelineEntry({
          orderId,
          status: status as OrderStatus,
          description
        });

        return res.status(201).json(
          createSuccessResponse(timeline, 'Timeline girdisi oluşturuldu')
        );
      } catch (error) {
        console.error('POST /api/orders/timeline hatası:', error);
        return res.status(500).json(
          createErrorResponse('Sunucu hatası', ErrorType.INTERNAL)
        );
      }

    case 'PUT':
      try {
        const { id, status, description } = req.body;

        if (!id || (!status && !description)) {
          return res.status(400).json(
            createErrorResponse('Timeline ID ve en az bir alan (durum veya açıklama) gerekli', ErrorType.VALIDATION)
          );
        }

        const updatedTimeline = await orderTimelineService.updateTimelineEntry(id, {
          ...(status && { status: status as OrderStatus }),
          ...(description && { description }),
        });

        return res.status(200).json(
          createSuccessResponse(updatedTimeline, 'Timeline girdisi güncellendi')
        );
      } catch (error: any) {
        console.error('PUT /api/orders/timeline hatası:', error);
        
        // Error objesi ApiError mi kontrol et
        const statusCode = error.statusCode || 500;
        const errorType = error.errorType || ErrorType.INTERNAL;
        const message = error.message || 'Sunucu hatası';
        
        return res.status(statusCode).json(
          createErrorResponse(message, errorType)
        );
      }

    case 'DELETE':
      try {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json(
            createErrorResponse('Geçersiz timeline ID', ErrorType.VALIDATION)
          );
        }

        await orderTimelineService.deleteTimelineEntry(parseInt(id, 10));

        return res.status(200).json(
          createSuccessResponse({ id: parseInt(id, 10) }, 'Timeline girdisi başarıyla silindi')
        );
      } catch (error: any) {
        console.error('DELETE /api/orders/timeline hatası:', error);
        
        // Error objesi ApiError mi kontrol et
        const statusCode = error.statusCode || 500;
        const errorType = error.errorType || ErrorType.INTERNAL;
        const message = error.message || 'Sunucu hatası';
        
        return res.status(statusCode).json(
          createErrorResponse(message, errorType)
        );
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json(
        createErrorResponse(`Yöntem ${req.method} izin verilmez`, ErrorType.VALIDATION, {
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
        })
      );
  }
};

// Sadece admin kullanabilir
export default withUser(withAdmin(withErrorHandler(handler))); 