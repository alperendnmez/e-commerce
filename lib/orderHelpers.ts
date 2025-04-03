import { Order, OrderItem, Payment, Prisma, OrderStatus } from '@prisma/client';
import { FormattedOrder, FormattedOrderItem } from '@/types/order';

/**
 * Extended Order type with additional fields used in the application
 * These fields are already included in the Order type from Prisma
 */
export interface ExtendedOrder extends Order {
  // All fields below are already in the Order type from Prisma with correct nullability
}

/**
 * Type for timeline entries in an order
 */
export interface OrderTimelineEntry {
  id: number;
  orderId: number;
  status: OrderStatus;
  description: string;
  date: Date;
  createdAt: Date;
}

/**
 * Type for an order with all relations included
 */
export type OrderWithRelations = ExtendedOrder & {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
  orderItems: (OrderItem & {
    product: {
      id: number;
      name: string;
      slug?: string;
      imageUrls?: string[];
    };
    variant?: {
      id: number;
      price: number;
      stock: number;
    } | null;
  })[];
  timeline?: OrderTimelineEntry[];
  payment?: Payment | null;
  billingAddress?: any;
  shippingAddress?: any;
  coupon?: any;
};

/**
 * Format an order with relations to a standardized API response format
 */
export function formatOrder(order: OrderWithRelations): FormattedOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber || `ORDER-${order.id}`,
    status: order.status,
    total: order.totalPrice,
    subtotal: order.subtotal || 0,
    taxAmount: order.taxAmount || 0,
    shippingCost: order.shippingCost || 0,
    discountAmount: order.discountAmount || 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    payment: order.payment ? {
      method: order.payment.method,
      status: order.payment.status
    } : {
      method: order.paymentMethod || 'Not specified',
      status: 'UNKNOWN'
    },
    shipping: {
      method: order.shippingMethod || 'Standard',
    },
    user: {
      id: order.user.id,
      name: `${order.user.firstName} ${order.user.lastName}`,
      email: order.user.email,
      image: order.user.avatarUrl || undefined
    },
    billingAddress: order.billingAddress,
    shippingAddress: order.shippingAddress,
    items: formatOrderItems(order.orderItems),
    timeline: order.timeline?.map(event => ({
      id: event.id,
      status: event.status,
      description: event.description,
      createdAt: event.createdAt || event.date
    })) || []
  };
}

/**
 * Format order items to a standardized API response format
 */
export function formatOrderItems(items: OrderWithRelations['orderItems']): FormattedOrderItem[] {
  return items.map(item => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug || undefined,
    price: item.price,
    quantity: item.quantity,
    total: item.price * item.quantity,
    productImage: item.product.imageUrls && item.product.imageUrls.length > 0 
      ? item.product.imageUrls[0] 
      : null,
    variant: item.variant ? {
      id: item.variant.id,
      price: item.variant.price
    } : null
  }));
}

/**
 * Build search filters for orders based on query parameters
 */
export function buildOrderSearchFilters({
  searchTerm,
  status,
  userId,
  startDate,
  endDate,
  minTotal,
  maxTotal
}: {
  searchTerm?: string;
  status?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  minTotal?: string;
  maxTotal?: string;
}): Prisma.OrderWhereInput {
  // Using a typed object with any for specific complex properties
  const where: Prisma.OrderWhereInput & { 
    OR?: any[]; // OR is complex and can have nested structures
  } = {};
  
  // User filter - if provided
  if (userId) {
    console.log('[orderHelpers] userId filtresi uygulanıyor:', userId);
    where.userId = userId;
  } else {
    console.log('[orderHelpers] userId filtresi uygulanmıyor, tüm siparişler gösterilecek');
  }
  
  // Status filter - if provided and not "all"
  if (status && status !== 'all') {
    where.status = status as OrderStatus;
  }
  
  // Date range filter
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }
  
  // Price range filter
  if (minTotal || maxTotal) {
    where.totalPrice = {};
    
    if (minTotal) {
      where.totalPrice.gte = parseFloat(minTotal);
    }
    
    if (maxTotal) {
      where.totalPrice.lte = parseFloat(maxTotal);
    }
  }
  
  // Search term filter (user details or order number)
  if (searchTerm && searchTerm.trim() !== '') {
    const userFilter = {
      user: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
          { lastName: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
          { email: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } }
        ]
      }
    };
    
    where.OR = [userFilter];
    
    // Only add orderNumber filter if the field exists in the schema
    // This is wrapped in any because orderNumber might not be defined in Prisma
    where.OR.push({
      orderNumber: {
        contains: searchTerm,
        mode: 'insensitive' as Prisma.QueryMode
      }
    } as any);
  }
  
  return where;
}

/**
 * Get standard Prisma include object for orders with all relations
 */
export function getOrderIncludeObject() {
  // Using any here because timeline might not be defined in Prisma.OrderInclude
  return {
    user: true,
    orderItems: {
      include: {
        product: true,
        variant: true
      }
    },
    payment: true,
    billingAddress: true,
    shippingAddress: true,
    timeline: true,
    coupon: true
  } as any;
} 