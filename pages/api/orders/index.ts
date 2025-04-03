// pages/api/orders/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import { OrderStatus } from '@prisma/client';
import { orderService } from '@/services/orderService';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '@/types/api-response';
import { ErrorType, withErrorHandler, ApiError } from '@/lib/errorHandler';
import { OrderErrorType } from '@/types/error';

// Siparişleri getir - GET
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  
  // Oturum kontrolü
  if (!session) {
    throw new ApiError(
      ErrorType.UNAUTHORIZED,
      'Bu endpoint\'e erişmek için giriş yapmalısınız'
    );
  }
  
  console.log('API/orders: Session user:', {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role
  });
  
  // GET - siparişleri listele
  if (req.method === 'GET') {
    // Search parametrelerini al
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortField = (req.query.sortField as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    
    // Admin için tüm siparişler, normal kullanıcılar için sadece kendi siparişleri
    const isAdmin = session.user.role === 'ADMIN';
    console.log('API/orders: User role:', session.user.role);
    console.log('API/orders: Is admin?', isAdmin);
    
    // Admin ise tüm siparişleri göster, değilse sadece kullanıcının kendi siparişlerini göster
    let userId = undefined;
    if (!isAdmin) {
      userId = parseInt(session.user.id);
    }
    
    console.log(`API/orders: İstek ${isAdmin ? 'admin' : 'kullanıcı'} tarafından yapıldı.`);
    console.log('API/orders: User ID:', isAdmin ? 'Admin - tüm siparişler' : session.user.id);
    console.log('API/orders: Query parametreleri:', req.query);
    
    // Service layer'ı kullanarak siparişleri getir
    try {
      const result = await orderService.getOrders({
        page,
        limit,
        userId,
        search: req.query.search as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        minTotal: req.query.minTotal as string,
        maxTotal: req.query.maxTotal as string,
        sortField,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      console.log('API/orders: Bulunan siparişler:', {
        count: result.orders.length,
        pagination: result.pagination
      });
      
      if (result.orders.length > 0) {
        console.log('API/orders: İlk sipariş örneği:', {
          id: result.orders[0].id,
          orderNumber: result.orders[0].orderNumber,
          status: result.orders[0].status,
          total: result.orders[0].total,
          items: result.orders[0].items?.length || 0
        });
      }
      
      console.log('API/orders: Tüm sipariş IDleri:', result.orders.map(order => order.id));
      
      const response = createPaginatedResponse(
        result.orders, 
        result.pagination.total, 
        result.pagination.page, 
        result.pagination.limit
      );
      
      console.log('API/orders: Yanıt formatı:', {
        success: true,
        ordersCount: result.orders.length,
        pagination: {
          total: result.pagination.total,
          page: result.pagination.page,
          limit: result.pagination.limit,
          totalPages: Math.ceil(result.pagination.total / result.pagination.limit)
        }
      });
      
      return res.status(200).json(response);
    } catch (error) {
      console.error('API/orders: Sipariş getirme hatası:', error);
      throw new ApiError(
        ErrorType.INTERNAL,
        'Siparişler yüklenirken bir hata oluştu'
      );
    }
  }
  
  // POST - yeni sipariş oluştur
  if (req.method === 'POST') {
    const { items, shippingAddressId, billingAddressId, couponId, paymentMethod } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(
        ErrorType.VALIDATION,
        'Sipariş öğeleri gerekli',
        { errorType: OrderErrorType.STOCK_UNAVAILABLE }
      );
    }
    
    const userId = parseInt(session.user.id);
    
    // Service layer ile sipariş oluştur
    const order = await orderService.createOrder({
      userId,
      items,
      shippingAddressId,
      billingAddressId,
      couponId,
      paymentMethod
    });
    
    return res.status(201).json(
      createSuccessResponse({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total
      }, 'Sipariş başarıyla oluşturuldu')
    );
  }
  
  // Desteklenmeyen metot
  res.setHeader('Allow', ['GET', 'POST']);
  throw new ApiError(
    ErrorType.VALIDATION,
    `Metot ${req.method} desteklenmiyor`,
    { allowedMethods: ['GET', 'POST'] }
  );
};

export default withErrorHandler(handler);
