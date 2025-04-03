import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../../auth/[...nextauth]';
import { OrderStatus } from '@prisma/client';
import { orderService } from '@/services/orderService';
import { createSuccessResponse, createErrorResponse } from '@/types/api-response';
import { ErrorType, withErrorHandler, ApiError } from '@/lib/errorHandler';
import { OrderErrorType } from '@/types/error';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);

  // Kullanıcı oturumunu kontrol et
  if (!session) {
    return res.status(401).json(
      createErrorResponse('You must be logged in to access this endpoint', ErrorType.UNAUTHORIZED)
    );
  }

  const userId = parseInt(session.user.id);
  const { id } = req.query;
  const orderId = parseInt(id as string);

  // Geçersiz sipariş ID kontrolü
  if (isNaN(orderId)) {
    throw new ApiError(
      ErrorType.VALIDATION,
      'Invalid order ID',
      { orderId: id }
    );
  }

  // GET - sipariş detaylarını getir
  if (req.method === 'GET') {
    // Use the service layer to get the order, passing userId for authorization
    const order = await orderService.getOrderById(orderId, userId);

    // Order will be null if it doesn't exist or if the user doesn't have access to it
    if (!order) {
      throw new ApiError(
        ErrorType.NOT_FOUND,
        'Order not found',
        { orderId }
      );
    }

    return res.status(200).json(
      createSuccessResponse(order)
    );
  }

  // POST - siparişi iptal et
  if (req.method === 'POST') {
    const { action, reason } = req.body;

    if (action === 'cancel') {
      // Check if the order exists and belongs to the user
      const order = await orderService.getOrderById(orderId, userId);
      
      if (!order) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          'Order not found',
          { orderId }
        );
      }

      // Check if the order can be canceled based on its status
      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
        throw new ApiError(
          ErrorType.CONFLICT,
          'Order cannot be cancelled at this stage',
          { 
            currentStatus: order.status,
            errorType: OrderErrorType.INVALID_STATUS_TRANSITION
          }
        );
      }

      // Update the order status to CANCELLED
      const updatedOrder = await orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED);
      
      if (!updatedOrder) {
        throw new ApiError(
          ErrorType.INTERNAL,
          'Failed to update order status',
          { orderId }
        );
      }
      
      return res.status(200).json(
        createSuccessResponse({
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          total: updatedOrder.total
        }, 'Order cancelled successfully')
      );
    }

    throw new ApiError(
      ErrorType.VALIDATION,
      'Invalid action',
      { action }
    );
  }

  // Desteklenmeyen method
  res.setHeader('Allow', ['GET', 'POST']);
  throw new ApiError(
    ErrorType.VALIDATION,
    'Method not allowed',
    { allowedMethods: ['GET', 'POST'] }
  );
};

export default withErrorHandler(handler); 