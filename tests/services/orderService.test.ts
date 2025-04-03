import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderService } from '@/services/orderService';
import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { ApiError, ErrorType } from '@/lib/errorHandler';

// Mock the Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    orderItem: {
      deleteMany: vi.fn(),
    },
    orderTimeline: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    productVariant: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  }
}));

// Sample data
const sampleOrder = {
  id: 1,
  userId: 101,
  status: OrderStatus.PENDING,
  orderNumber: 'ORD-123456',
  totalPrice: 100,
  subtotal: 110,
  discountAmount: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  orderItems: [
    {
      id: 1,
      orderId: 1,
      productId: 201,
      variantId: 301,
      quantity: 2,
      price: 50,
    },
  ],
  user: {
    id: 101,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatarUrl: null,
  },
  shippingAddress: {
    id: 401,
    street: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    country: 'USA',
  },
  billingAddress: {
    id: 402,
    street: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    country: 'USA',
  },
  payment: {
    id: 501,
    method: 'CREDIT_CARD',
    amount: 100,
    status: 'COMPLETED',
  },
  timeline: [
    {
      id: 601,
      orderId: 1,
      status: OrderStatus.PENDING,
      description: 'Order created',
      date: new Date(),
    },
  ],
  coupon: null,
};

describe('OrderService', () => {
  let orderService: OrderService;
  
  beforeEach(() => {
    orderService = new OrderService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getOrderById', () => {
    it('should return an order when found', async () => {
      // Mock implementation
      vi.mocked(prisma.order.findUnique).mockResolvedValue(sampleOrder as any);
      
      // Call the method
      const result = await orderService.getOrderById(1);
      
      // Assertions
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
      expect(result?.orderNumber).toBe('ORD-123456');
    });
    
    it('should return null when order not found', async () => {
      // Mock implementation
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
      
      // Call the method
      const result = await orderService.getOrderById(999);
      
      // Assertions
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: expect.any(Object),
      });
      expect(result).toBeNull();
    });
    
    it('should return null when order does not belong to specified user', async () => {
      // Mock implementation
      vi.mocked(prisma.order.findUnique).mockResolvedValue(sampleOrder as any);
      
      // Call the method with unauthorized user
      const result = await orderService.getOrderById(1, 999); // Different user ID
      
      // Assertions
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
      expect(result).toBeNull();
    });
  });
  
  describe('updateOrderStatus', () => {
    it('should throw ApiError when order not found', async () => {
      // Mock implementation
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
      
      // Call the method and expect error
      await expect(orderService.updateOrderStatus(999, OrderStatus.PROCESSING))
        .rejects
        .toThrow(ApiError);
      
      // Additional assertion to check the error type
      try {
        await orderService.updateOrderStatus(999, OrderStatus.PROCESSING);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).type).toBe(ErrorType.NOT_FOUND);
      }
    });
    
    it('should throw ApiError when updating CANCELLED order', async () => {
      // Mock implementation - return a cancelled order
      const canceledOrder = { ...sampleOrder, status: OrderStatus.CANCELLED };
      vi.mocked(prisma.order.findUnique).mockResolvedValue(canceledOrder as any);
      
      // Call the method and expect error
      await expect(orderService.updateOrderStatus(1, OrderStatus.PROCESSING))
        .rejects
        .toThrow(ApiError);
        
      // Additional assertion to check the error type
      try {
        await orderService.updateOrderStatus(1, OrderStatus.PROCESSING);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).type).toBe(ErrorType.CONFLICT);
      }
    });
    
    it('should successfully update order status', async () => {
      // Mock implementation
      vi.mocked(prisma.order.findUnique).mockResolvedValue(sampleOrder as any);
      vi.mocked(prisma.orderTimeline.create).mockResolvedValue({ id: 602 } as any);
      vi.mocked(prisma.order.update).mockResolvedValue({
        ...sampleOrder,
        status: OrderStatus.PROCESSING,
      } as any);
      
      // Call the method
      const result = await orderService.updateOrderStatus(1, OrderStatus.PROCESSING);
      
      // Assertions
      expect(prisma.orderTimeline.create).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: OrderStatus.PROCESSING },
        include: expect.any(Object),
      });
      expect(result).toBeTruthy();
      expect(result?.status).toBe(OrderStatus.PROCESSING);
    });
  });
  
  // Additional tests for other methods can be added here
}); 