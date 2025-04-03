import { OrderStatus } from '@prisma/client';
import { ApiError, ErrorType } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

/**
 * Sipariş zaman çizelgesi servis sınıfı
 * Bu servis, sipariş durum değişikliklerinin tarihçesini yönetir
 */
export class OrderTimelineService {
  /**
   * Sipariş için yeni bir zaman çizelgesi girişi oluşturur
   */
  async createTimelineEntry({
    orderId,
    status,
    description,
    date = new Date()
  }: {
    orderId: number;
    status: OrderStatus;
    description: string;
    date?: Date;
  }) {
    try {
      // Sipariş var mı kontrol et
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          `Order with ID ${orderId} not found`
        );
      }

      // Yeni zaman çizelgesi girişi oluştur
      const timeline = await prisma.orderTimeline.create({
        data: {
          orderId,
          status,
          description,
          date,
          createdAt: new Date()
        }
      });
      
      return timeline;
    } catch (error) {
      console.error('Error creating timeline entry:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorType.INTERNAL,
        'Failed to create timeline entry'
      );
    }
  }

  /**
   * Bir siparişe ait tüm zaman çizelgesi girişlerini getirir
   */
  async getTimelineByOrderId(orderId: number) {
    try {
      const timeline = await prisma.orderTimeline.findMany({
        where: { orderId },
        orderBy: { date: 'asc' }
      });

      return timeline;
    } catch (error) {
      console.error('Error fetching order timeline:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorType.INTERNAL,
        'Failed to fetch order timeline'
      );
    }
  }

  /**
   * Bir siparişin zaman çizelgesi girişlerini siler
   */
  async deleteTimelineForOrder(orderId: number) {
    try {
      // Prisma transaction kullanarak silme işlemini yap
      await prisma.$transaction(async (tx) => {
        await tx.orderTimeline.deleteMany({
          where: { orderId }
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting timeline entries:', error);
      throw new ApiError(
        ErrorType.INTERNAL,
        'Failed to delete timeline entries'
      );
    }
  }
  
  /**
   * Belirli bir timeline girişini günceller
   */
  async updateTimelineEntry(
    id: number, 
    data: { status?: OrderStatus; description?: string; date?: Date }
  ) {
    try {
      // Timeline varlığını kontrol et
      const timelineExists = await prisma.orderTimeline.findUnique({
        where: { id }
      });
      
      if (!timelineExists) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          `Timeline entry with ID ${id} not found`
        );
      }
      
      // Timeline girişini güncelle
      const updatedTimeline = await prisma.orderTimeline.update({
        where: { id },
        data
      });
      
      return updatedTimeline;
    } catch (error) {
      console.error('Error updating timeline entry:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorType.INTERNAL,
        'Failed to update timeline entry'
      );
    }
  }
  
  /**
   * Belirli bir timeline girişini siler
   */
  async deleteTimelineEntry(id: number) {
    try {
      // Timeline varlığını kontrol et
      const timelineExists = await prisma.orderTimeline.findUnique({
        where: { id }
      });
      
      if (!timelineExists) {
        throw new ApiError(
          ErrorType.NOT_FOUND,
          `Timeline entry with ID ${id} not found`
        );
      }
      
      // Timeline girişini sil
      await prisma.orderTimeline.delete({
        where: { id }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting timeline entry:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorType.INTERNAL,
        'Failed to delete timeline entry'
      );
    }
  }
}

// Export a singleton instance
export const orderTimelineService = new OrderTimelineService(); 