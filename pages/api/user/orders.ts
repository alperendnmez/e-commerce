import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import { OrderStatus } from '@prisma/client';
import { orderService } from '@/services/orderService';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '@/types/api-response';
import { ErrorType } from '@/lib/errorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json(
        createErrorResponse('Unauthorized', ErrorType.UNAUTHORIZED)
      );
    }

    if (req.method !== 'GET') {
      return res.status(405).json(
        createErrorResponse('Method not allowed', ErrorType.VALIDATION, {
          allowedMethods: ['GET']
        })
      );
    }

    const userId = parseInt((session.user as any).id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const returnable = req.query.returnable === 'true';

    console.log('[Orders API] Request params:', {
      userId,
      page,
      limit,
      status,
      search,
      returnable
    });

    try {
      // For returnable orders, we'll filter after fetching
      const result = await orderService.getOrders({
        page,
        limit,
        userId, // Always filter by the user's ID since this is the user-specific API
        status: returnable ? undefined : status, // Don't apply status filter if returnable is true
        search,
        sortField: 'createdAt',
        sortOrder: 'desc'
      });

      console.log('[Orders API] Order service result:', {
        ordersCount: result.orders.length,
        pagination: result.pagination,
        // İlk siparişi detaylı logla (eğer varsa)
        firstOrder: result.orders.length > 0 ? {
          id: result.orders[0].id,
          orderNumber: result.orders[0].orderNumber,
          status: result.orders[0].status,
          total: result.orders[0].total,
          itemCount: result.orders[0].items.length
        } : null,
        // Siparişlerin sadece ID'lerini loglamak için
        orderIds: result.orders.map(order => order.id)
      });

      // For returnable orders, filter the results to include only DELIVERED and SHIPPED
      if (returnable && result.orders.length > 0) {
        // Create a new filtered array
        const filteredOrders = result.orders.filter(order => {
          // Explicitly check against the expected statuses
          return order.status === OrderStatus.DELIVERED || order.status === OrderStatus.SHIPPED;
        });
        
        // Update the orders array
        result.orders = filteredOrders;
      }

      return res.status(200).json(
        createPaginatedResponse(
          result.orders,
          result.pagination.total,
          result.pagination.page,
          result.pagination.limit
        )
      );
    } catch (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json(
        createPaginatedResponse(
          [], // Return empty orders array
          0,  // No total orders
          1,  // Default to page 1
          10  // Default limit
        )
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json(
      createPaginatedResponse(
        [], // Return empty orders array
        0,  // No total orders
        1,  // Default to page 1
        10  // Default limit
      )
    );
  }
} 