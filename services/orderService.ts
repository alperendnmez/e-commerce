import prisma from '@/lib/prisma';
import { OrderStatus, CouponType, Prisma } from '@prisma/client';
import { formatOrder, OrderWithRelations, getOrderIncludeObject, buildOrderSearchFilters } from '@/lib/orderHelpers';
import { FormattedOrder } from '@/types/order';
import { ApiError, ErrorType } from '@/lib/errorHandler';
import { orderTimelineService } from './orderTimelineService';
import { productService } from './productService';
import { stockService } from './stockService';
import { OrderErrorType } from '../types/error';

// OrderStatus değerlerini type-safe şekilde tanımlayalım
type StatusTransitionType = {
  [key in OrderStatus]?: OrderStatus[];
};

// OrderStatus geçiş kuralları
const VALID_STATUS_TRANSITIONS: StatusTransitionType = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.RETURNED],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Genişletilmiş OrderUpdateInput türü
interface OrderUpdateExtended extends Prisma.OrderUpdateInput {
  adminNotes?: string;
}

/**
 * Order Service - Handles all order-related business logic and data access
 */
export class OrderService {
  private timelineService: typeof orderTimelineService;
  private productService: typeof productService;
  private stockService: typeof stockService;

  constructor() {
    this.timelineService = orderTimelineService;
    this.productService = productService;
    this.stockService = stockService;
  }

  /**
   * Get a paginated list of orders with optional filtering
   */
  async getOrders({
    page = 1,
    limit = 10,
    userId,
    status,
    search,
    startDate,
    endDate,
    minTotal,
    maxTotal,
    sortField = 'createdAt',
    sortOrder = 'desc'
  }: {
    page?: number;
    limit?: number;
    userId?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    minTotal?: string;
    maxTotal?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    orders: FormattedOrder[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    console.log('[OrderService] getOrders called with:', {
      page,
      limit,
      userId: userId ? userId : 'ADMIN (tüm siparişler)',
      status,
      search,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      sortField,
      sortOrder
    });
    
    const skip = (page - 1) * limit;
    
    try {
      // Use helper function to build filters
      const where = buildOrderSearchFilters({
        searchTerm: search,
        status,
        userId,
        startDate,
        endDate,
        minTotal,
        maxTotal
      });
      
      console.log('[OrderService] Query filters:', JSON.stringify(where, null, 2));
      
      // Get total count
      const total = await prisma.order.count({ where });
      console.log('[OrderService] Total orders count:', total);
      
      if (total === 0) {
        console.log('[OrderService] Hiç sipariş bulunamadı, boş bir liste döndürülüyor');
        return {
          orders: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0
          }
        };
      }
      
      // Get orders with relations
      const includeOptions = getOrderIncludeObject();
      
      // Verileri getirmek için sorgu yap
      const orders = await prisma.order.findMany({
        where,
        include: includeOptions,
        orderBy: {
          [sortField]: sortOrder as Prisma.SortOrder
        },
        skip,
        take: limit
      });
      
      console.log('[OrderService] Raw orders found:', orders.length);
      
      if (orders.length === 0) {
        console.log('[OrderService] Siparişler bulunamadı (findMany sonucu sıfır), boş bir liste döndürülüyor');
        return {
          orders: [],
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        };
      }
      
      // Verileri örnek göster
      console.log('[OrderService] Bulunan siparişler:');
      orders.forEach((order, idx) => {
        console.log(`[OrderService] Sipariş ${idx+1}:`, {
          id: order.id,
          userId: order.userId,
          orderNumber: order.orderNumber,
          status: order.status,
          totalPrice: order.totalPrice
        });
      });
      
      // Format orders for API response - using an explicit cast with unknown as an intermediate step
      const formattedOrders = orders.map(order => {
        const orderWithRelations = order as unknown as OrderWithRelations;
        return formatOrder(orderWithRelations);
      });
      
      return {
        orders: formattedOrders,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[OrderService] Error in getOrders:', error);
      throw error;
    }
  }
  
  /**
   * Get a single order by ID
   */
  async getOrderById(id: number, userIdForAuth?: number): Promise<FormattedOrder | null> {
    const includeOptions = getOrderIncludeObject();
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: includeOptions
    });
    
    if (!order) return null;
    
    // If userId is provided, verify the user has access to this order
    if (userIdForAuth !== undefined && order.userId !== userIdForAuth) {
      return null;
    }
    
    // Use an explicit cast with unknown as an intermediate step
    return formatOrder(order as unknown as OrderWithRelations);
  }
  
  /**
   * Update order status with enhanced validation and error handling
   */
  async updateOrderStatus(orderId: number, newStatus: OrderStatus): Promise<FormattedOrder | null> {
    try {
      // İlk olarak sipariş varlığını ve ilişkili verileri kontrol et
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          orderItems: true,
          payment: true // Ödeme bilgisini dahil et
        }
      });
      
      if (!order) {
        throw new ApiError(
          ErrorType.NOT_FOUND, 
          `Order with ID ${orderId} not found`
        );
      }
      
      // Durum değişimi için özel validasyonlar
      
      // 1. Durum geçiş kurallarını kontrol et
      const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new ApiError(
          ErrorType.CONFLICT,
          `Cannot change order status from ${order.status} to ${newStatus}`,
          { 
            currentStatus: order.status, 
            requestedStatus: newStatus,
            errorType: OrderErrorType.INVALID_STATUS_TRANSITION 
          }
        );
      }
      
      // 2. PAID durumuna geçiş için ödeme kontrolü
      if (newStatus === OrderStatus.PAID) {
        if (!order.payment || order.payment.status !== 'COMPLETED') {
          throw new ApiError(
            ErrorType.CONFLICT,
            `Cannot mark order as PAID without a completed payment`,
            { errorType: OrderErrorType.PAYMENT_FAILED }
          );
        }
      }
      
      // 3. CANCELLED durumuna geçiş için tamamlanmış siparişlerde kontrol
      if (newStatus === OrderStatus.CANCELLED && 
         (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED)) {
        // Sipariş tamamlanmış veya teslim edilmiş ise iptal etmek yerine iade işlemi gerekebilir
        throw new ApiError(
          ErrorType.CONFLICT,
          `Completed or delivered orders cannot be directly cancelled. Consider a return request instead.`,
          { errorType: OrderErrorType.INVALID_STATUS_TRANSITION }
        );
      }
      
      // 4. SHIPPED ve DELIVERED statüleri için kargo numarası kontrolü
      if ((newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED) && 
          !order.trackingNumber) {
        // Uyarı olarak log kaydedelim (opsiyonel olarak bir hata da fırlatılabilir)
        console.warn(`Warning: Setting order ${orderId} to ${newStatus} without a tracking number`);
      }
      
      // OrderTimelineService kullanarak zaman çizelgesi girişi oluştur
      const timelineEntry = await this.timelineService.createTimelineEntry({
        orderId,
        status: newStatus,
        description: `Order status changed from ${order.status} to ${newStatus}`
      });
      
      if (!timelineEntry) {
        console.error(`Warning: Failed to create timeline entry for order ${orderId}`);
        // Timeline oluşturmanın başarısız olması siparişin güncellenmesini engellemez
      }
      
      // If the new status is CANCELLED, restore product stock
      if (newStatus === OrderStatus.CANCELLED && order.orderItems?.length) {
        try {
          await this.restoreProductStock(prisma, order.orderItems);
        } catch (stockError) {
          console.error('Error restoring product stock:', stockError);
          // Stok işlemlerinin başarısız olması siparişin güncellenmesini engellememeli
        }
      }
      
      // Audit log için ek bilgiler içeren bir veri nesnesi oluştur
      const auditData = {
        previousStatus: order.status,
        newStatus,
        updatedAt: new Date(),
        orderId
      };
      
      // Debug amaçlı loglama
      console.log('Updating order status:', auditData);
      
      // Update the order status with transaction
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Ana sipariş durumunu güncelle
        const result = await tx.order.update({
          where: { id: orderId },
          data: { 
            status: newStatus,
            updatedAt: new Date() // Son güncelleme zamanını açıkça ayarla
          },
          include: getOrderIncludeObject()
        });
        
        // Sipariş REFUNDED olarak işaretlenirse ödeme durumunu da güncelle
        if (newStatus === OrderStatus.REFUNDED && order.payment) {
          await tx.payment.update({
            where: { orderId },
            data: { status: 'REFUNDED' as any }
          });
        }
        
        return result;
      });
      
      // Use an explicit cast with unknown as an intermediate step
      return formatOrder(updatedOrder as unknown as OrderWithRelations);
    } catch (error) {
      console.error('Error updating order status:', error);
      
      // Eğer hata API hatası değilse, genel bir API hatası olarak sarmala
      if (!(error instanceof ApiError)) {
        throw new ApiError(
          ErrorType.INTERNAL,
          'Failed to update order status due to an internal error',
          { originalError: String(error) }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Create a new order
   */
  async createOrder({
    userId,
    items,
    shippingAddressId,
    billingAddressId,
    couponId,
    paymentMethod
  }: {
    userId: number;
    items: Array<{
      productId: number;
      variantId?: number;
      quantity: number;
    }>;
    shippingAddressId?: number;
    billingAddressId?: number;
    couponId?: number;
    paymentMethod?: string;
  }): Promise<FormattedOrder> {
    try {
      // Validate input
      if (!items || items.length === 0) {
        throw new ApiError(
          ErrorType.VALIDATION,
          'Order items are required',
          { errorType: OrderErrorType.STOCK_UNAVAILABLE }
        );
      }
      
      // Execute the order creation logic in a transaction
      const order = await prisma.$transaction(async (tx) => {
        let totalPrice = 0;
        let discountAmount = 0;
        let subtotalValue = 0;
        
        // Process each item
        const orderItems = [];
        for (const item of items) {
          const { price, itemTotal } = await this.processOrderItem(tx, item);
          subtotalValue += itemTotal;
          
          orderItems.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price
          });
        }
        
        totalPrice = subtotalValue;
        
        // Process coupon if provided
        if (couponId) {
          discountAmount = await this.processCoupon(tx, couponId, subtotalValue);
          totalPrice = subtotalValue - discountAmount;
        }
        
        // Generate order number (ensure it's unique)
        const timestamp = Date.now().toString();
        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${timestamp.slice(-6)}-${randomPart}`;
        
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            userId,
            status: OrderStatus.PENDING,
            totalPrice,
            subtotal: subtotalValue,
            discountAmount: discountAmount || null,
            orderNumber, // Now required field
            paymentMethod: paymentMethod || 'Not specified',
            shippingAddressId,
            billingAddressId,
            couponId,
            orderItems: {
              create: orderItems
            }
          },
          include: getOrderIncludeObject()
        });
        
        // Order timeline oluştur (transaction sonrasında yapmalıyız)
        return newOrder;
      });
      
      // Order timeline oluştur
      await this.timelineService.createTimelineEntry({
        orderId: order.id,
        status: OrderStatus.PENDING,
        description: 'Order created'
      });
      
      // Use an explicit cast with unknown as an intermediate step
      return formatOrder(order as unknown as OrderWithRelations);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
  
  /**
   * Process an individual order item, checking stock and calculating price
   * @private
   */
  private async processOrderItem(tx: Prisma.TransactionClient, item: { productId: number; variantId?: number; quantity: number }) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      include: { 
        variants: item.variantId ? {
          where: { id: item.variantId }
        } : undefined 
      }
    });
    
    if (!product) {
      throw new ApiError(
        ErrorType.NOT_FOUND,
        `Product not found: ID ${item.productId}`,
        { errorType: OrderErrorType.STOCK_UNAVAILABLE }
      );
    }
    
    let price = 0;
    
    // Check variant if specified
    if (item.variantId) {
      const variant = product.variants[0];
      if (!variant) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          `Variant not found: ID ${item.variantId}`,
          { errorType: OrderErrorType.STOCK_UNAVAILABLE }
        );
      }
      
      if (variant.stock < item.quantity) {
        throw new ApiError(
          ErrorType.CONFLICT,
          `Insufficient stock: ${product.name} (${variant.stock} remaining)`,
          { 
            errorType: OrderErrorType.STOCK_UNAVAILABLE,
            productName: product.name,
            availableStock: variant.stock,
            requestedQuantity: item.quantity 
          }
        );
      }
      
      // Update stock
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: variant.stock - item.quantity }
      });
      
      price = variant.price;
    } else {
      // Varyant yoksa, basePrice alanını kullan
      if (product.basePrice === null || product.basePrice === 0) {
        // Eğer basePrice ayarlanmamışsa, varyantlardan en düşük fiyatı bul
        const variants = await tx.productVariant.findMany({
          where: { productId: product.id }
        });
        
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        
        if (totalStock < item.quantity) {
          throw new ApiError(
            ErrorType.CONFLICT,
            `Insufficient stock: ${product.name} (${totalStock} remaining)`,
            { 
              errorType: OrderErrorType.STOCK_UNAVAILABLE,
              productName: product.name,
              availableStock: totalStock,
              requestedQuantity: item.quantity 
            }
          );
        }
        
        // Use lowest variant price if basePrice is not set
        price = variants.length > 0 
          ? Math.min(...variants.map(v => v.price))
          : 0;
      } else {
        // BasePrice ayarlanmışsa onu kullan
        price = product.basePrice;
      }
    }
    
    const itemTotal = price * item.quantity;
    return { price, itemTotal };
  }
  
  /**
   * Process a coupon for an order
   * @private
   */
  private async processCoupon(tx: Prisma.TransactionClient, couponId: number, subtotal: number): Promise<number> {
    const coupon = await tx.coupon.findUnique({
      where: { id: couponId }
    });
    
    if (!coupon) {
      throw new ApiError(
        ErrorType.NOT_FOUND,
        `Coupon with ID ${couponId} not found`,
        { errorType: OrderErrorType.COUPON_INVALID }
      );
    }
    
    // Kuponun geçerlilik süresi kontrolü
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      throw new ApiError(
        ErrorType.CONFLICT,
        `Coupon is not yet valid`,
        { 
          errorType: OrderErrorType.COUPON_INVALID,
          validFrom: coupon.validFrom 
        }
      );
    }
    
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      throw new ApiError(
        ErrorType.CONFLICT,
        `Coupon has expired`,
        { 
          errorType: OrderErrorType.COUPON_INVALID,
          validUntil: coupon.validUntil
        }
      );
    }
    
    // Maximimum kullanım kontrolü
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      throw new ApiError(
        ErrorType.CONFLICT,
        `Coupon usage limit reached`,
        { 
          errorType: OrderErrorType.COUPON_INVALID,
          maxUsage: coupon.maxUsage,
          currentUsage: coupon.usageCount 
        }
      );
    }
    
    let discountAmount = 0;
    
    // Kupon tipine göre indirim hesapla
    if (coupon.type === CouponType.PERCENTAGE && coupon.value) {
      // Yüzde indirim
      discountAmount = (subtotal * coupon.value) / 100;
      
      // Maximum indirim kontrolü
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.type === CouponType.FIXED && coupon.value) {
      // Sabit tutar indirimi
      discountAmount = coupon.value;
    }
    
    // Minimum sipariş tutarı kontrolü
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw new ApiError(
        ErrorType.CONFLICT,
        `Minimum order amount not reached`,
        { 
          errorType: OrderErrorType.COUPON_INVALID,
          minOrderAmount: coupon.minOrderAmount,
          currentOrderAmount: subtotal 
        }
      );
    }
    
    // Increment coupon usage
    await tx.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } }
    });
    
    return discountAmount;
  }
  
  /**
   * Restore product stock for canceled orders
   * @private
   */
  private async restoreProductStock(tx: Prisma.TransactionClient, orderItems: any[]) {
    for (const item of orderItems) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }
  }
  
  /**
   * Delete an order and restore product stock
   */
  async deleteOrder(orderId: number): Promise<boolean> {
    try {
      // Validate that the order exists
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          orderItems: true
        }
      });
      
      if (!order) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          `Order with ID ${orderId} not found`
        );
      }
      
      // Execute deletion in a transaction
      await prisma.$transaction(async (tx) => {
        // Restore product stock if the order was not canceled
        if (order.status !== OrderStatus.CANCELLED) {
          await this.restoreProductStock(tx, order.orderItems);
        }
        
        // OrderTimelineService kullanarak zaman çizelgesi girişlerini sil
        await this.timelineService.deleteTimelineForOrder(orderId);
        
        // Delete order items
        await tx.orderItem.deleteMany({
          where: { orderId }
        });
        
        // Finally delete the order itself
        await tx.order.delete({
          where: { id: orderId }
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }
  
  /**
   * Update admin notes for an order
   */
  async updateOrderNotes(orderId: number, adminNotes: string): Promise<FormattedOrder | null> {
    try {
      // Önce sipariş var mı kontrol et
      const orderExists = await prisma.order.findUnique({
        where: { id: orderId }
      });
      
      if (!orderExists) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          `Order with ID ${orderId} not found`
        );
      }
      
      // Genişletilmiş tür kullanarak veriyi hazırla
      const data: OrderUpdateExtended = {
        adminNotes: adminNotes
      };
      
      // Siparişi güncelle
      const order = await prisma.order.update({
        where: { id: orderId },
        data: data,
        include: getOrderIncludeObject()
      });
      
      // Use an explicit cast with unknown as an intermediate step
      return formatOrder(order as unknown as OrderWithRelations);
    } catch (error) {
      console.error('Error updating order notes:', error);
      
      // Error objesi ApiError mi kontrol et
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Genel hata durumunu bildir
      return null;
    }
  }

  /**
   * Apply a coupon to an order
   */
  async applyCoupon(orderId: number, couponCode: string): Promise<FormattedOrder | null> {
    try {
      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      });

      if (!order) {
        throw new ApiError(ErrorType.NOT_FOUND, `Order with ID ${orderId} not found`);
      }

      // Get the coupon
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode }
      });

      if (!coupon) {
        throw new ApiError(ErrorType.NOT_FOUND, `Coupon with code ${couponCode} not found`);
      }

      // Check if coupon is still valid
      const now = new Date();
      
      if (coupon.validFrom && coupon.validFrom > now) {
        throw new ApiError(ErrorType.CONFLICT, `Coupon is not valid yet`);
      }

      if (coupon.validUntil && coupon.validUntil < now) {
        throw new ApiError(ErrorType.CONFLICT, `Coupon has expired`);
      }

      // Check max usage
      if (coupon.maxUsage !== null && coupon.usageCount >= coupon.maxUsage) {
        throw new ApiError(ErrorType.CONFLICT, `Coupon has reached maximum usage`);
      }

      // Check minimum order amount if applicable
      const orderSubtotal = order.subtotal || 0;
      if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) {
        throw new ApiError(
          ErrorType.CONFLICT, 
          `Order total does not meet minimum amount for this coupon`,
          { 
            required: coupon.minOrderAmount,
            current: orderSubtotal
          }
        );
      }

      // Calculate discount based on coupon type and value
      let discountAmount = 0;
      
      if (coupon.type === CouponType.PERCENTAGE && coupon.value) {
        // Percentage discount
        discountAmount = (orderSubtotal * coupon.value) / 100;
        
        // Apply max discount if set
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else if (coupon.type === CouponType.FIXED && coupon.value) {
        // Fixed amount discount
        discountAmount = coupon.value;
      }

      // Ensure discount doesn't exceed order total
      if (discountAmount > orderSubtotal) {
        discountAmount = orderSubtotal;
      }

      // Round to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;

      // Update the order with the coupon and discount
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          couponId: coupon.id,
          discountAmount: discountAmount,
          totalPrice: orderSubtotal - discountAmount,
          updatedAt: new Date()
        },
        include: getOrderIncludeObject()
      });

      // Increment coupon usage count
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          usageCount: coupon.usageCount + 1
        }
      });

      // Use an explicit cast with unknown as an intermediate step
      return formatOrder(updatedOrder as unknown as OrderWithRelations);
    } catch (error) {
      console.error('Error applying coupon:', error);
      
      if (!(error instanceof ApiError)) {
        throw new ApiError(
          ErrorType.INTERNAL,
          'Failed to apply coupon due to an internal error',
          { originalError: String(error) }
        );
      }
      
      throw error;
    }
  }
}

// Export a singleton instance
export const orderService = new OrderService(); 