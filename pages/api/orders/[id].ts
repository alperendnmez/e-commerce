import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { withUser, withAdmin } from '@/lib/middleware';
import { withErrorHandler, ApiError } from '@/lib/errorHandler';
import { orderService } from '@/services/orderService';
import { createSuccessResponse, createErrorResponse } from '@/types/api-response';
import { ErrorType } from '@/lib/errorHandler';
import { OrderErrorType } from '@/types/error';
import { getValidNextStatuses } from '@/lib/orderStatusUtils';
import { sendOrderStatusUpdateEmail } from '@/lib/mail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Kullanıcı oturumunu doğrula
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Log session details for debugging
    console.log('Session details:', {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      method: req.method,
      path: req.url,
    });

    const userId = parseInt(session.user.id);
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    if (req.method === 'GET') {
      try {
        // Siparişi getir
        const order = await prisma.order.findUnique({
          where: {
            id: parseInt(id),
          },
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    imageUrls: true,
                  },
                },
                variant: true,
              },
            },
            timeline: {
              orderBy: {
                date: 'desc',
              },
            },
            payment: true,
            shippingAddress: true,
            billingAddress: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            },
          },
        });

        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }

        // Kullanıcının kendi siparişi mi kontrol et
        if (order.userId !== userId && session.user.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        // Log the complete order details for debugging
        console.log(`Full order structure for order ID ${order.id}:`, {
          orderItemsCount: order.orderItems.length,
          hasProducts: order.orderItems.map(item => !!item.product),
          productDetails: order.orderItems.map(item => ({
            itemId: item.id,
            productId: item.productId,
            productName: item.product?.name,
            hasImageUrls: !!item.product?.imageUrls,
            imageUrlsLength: item.product?.imageUrls?.length || 0
          }))
        });

        // API yanıtını oluştur
        const response = {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          totalPrice: order.totalPrice,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          shippingCost: order.shippingCost,
          discountAmount: order.discountAmount,
          paymentMethod: order.paymentMethod,
          shippingMethod: order.shippingMethod,
          trackingNumber: order.trackingNumber,
          adminNotes: order.adminNotes,
          items: order.orderItems.map(item => {
            console.log(`Order ${order.id} - Item ${item.id} - Product ${item.productId} - Image URLs:`, {
              hasProduct: !!item.product,
              imageUrls: item.product?.imageUrls,
              firstImage: item.product?.imageUrls?.[0] || null
            });
            
            return {
              id: item.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              productName: item.product?.name || 'Ürün adı bulunamadı',
              productSlug: item.product?.slug,
              productImage: item.product?.imageUrls && item.product.imageUrls.length > 0 
                ? item.product.imageUrls[0] 
                : '/images/product-placeholder.jpg',
            };
          }),
          timeline: order.timeline.map(entry => ({
            id: entry.id,
            status: entry.status,
            description: entry.description,
            date: entry.date,
            createdAt: entry.createdAt,
          })),
          payment: order.payment ? {
            id: order.payment.id,
            amount: order.payment.amount,
            status: order.payment.status,
            method: order.payment.method,
            transactionId: order.payment.providerTransactionId,
            date: order.payment.createdAt,
          } : null,
          user: order.user ? {
            id: order.user.id,
            email: order.user.email,
            firstName: order.user.firstName || '',
            lastName: order.user.lastName || '',
            name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
          } : null,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
        };

        return res.status(200).json(response);
      } catch (error) {
        console.error('Order fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch order details' });
      }
    } else if (req.method === 'PATCH') {
      try {
        // Admin yetkisi kontrol et
        if (session.user.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Only admins can update order status' });
        }

        const { status, adminNotes } = req.body;
        const orderId = parseInt(id);

        // Güncelleme verileri
        const updateData: any = {};
        
        // Durum güncellemesi
        if (status) {
          // Durum geçerliliği kontrolü
          if (!Object.values(OrderStatus).includes(status)) {
            return res.status(400).json({ error: 'Invalid order status' });
          }
          
          // Mevcut siparişi getir
          const currentOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                }
              },
              orderItems: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      imageUrls: true,
                    },
                  },
                  variant: true,
                }
              },
              shippingAddress: true,
              billingAddress: true,
            }
          });
          
          if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
          }
          
          // Geçerli durum geçişi kontrolü
          const validNextStatuses = getValidNextStatuses(currentOrder.status);
          if (!validNextStatuses.includes(status as OrderStatus)) {
            return res.status(400).json({ 
              error: `Invalid status transition from ${currentOrder.status} to ${status}`,
              validStatuses: validNextStatuses
            });
          }
          
          updateData.status = status;
          
          // Durum güncellemesi zaman çizelgesine eklenir
          await prisma.orderTimeline.create({
            data: {
              orderId: orderId,
              status: status as OrderStatus,
              description: `Sipariş durumu ${status} olarak güncellendi.`,
              date: new Date(),
            }
          });
          
          // E-posta bildirimi gönderme
          try {
            // Formatlanmış sipariş bilgilerini hazırla
            const formattedOrder = {
              id: currentOrder.id,
              orderNumber: currentOrder.orderNumber || `ORDER-${currentOrder.id}`,
              createdAt: currentOrder.createdAt,
              updatedAt: new Date(),
              totalPrice: currentOrder.totalPrice,
              subtotal: currentOrder.subtotal,
              taxAmount: currentOrder.taxAmount,
              shippingCost: currentOrder.shippingCost,
              discountAmount: currentOrder.discountAmount,
              trackingNumber: currentOrder.trackingNumber,
              items: currentOrder.orderItems.map(item => ({
                id: item.id,
                productId: item.productId,
                productName: item.product?.name || 'Ürün adı bulunamadı',
                productImage: item.product?.imageUrls && item.product.imageUrls.length > 0 
                  ? item.product.imageUrls[0] 
                  : null,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                variantDetails: item.variant ? `Varyant: ${item.variant.id}` : null,
              })),
              shippingAddress: currentOrder.shippingAddress,
              billingAddress: currentOrder.billingAddress,
            };
            
            // Kullanıcıya e-posta gönder
            if (currentOrder.user && currentOrder.user.email) {
              await sendOrderStatusUpdateEmail(
                currentOrder.user.email,
                `${currentOrder.user.firstName || ''} ${currentOrder.user.lastName || ''}`.trim(),
                formattedOrder,
                currentOrder.status,
                status
              );
              console.log(`Order status update email sent to ${currentOrder.user.email}`);
            }
          } catch (emailError) {
            // E-posta gönderiminde hata olursa loglama yap ancak API yanıtını etkilemesin
            console.error('Failed to send order status email:', emailError);
          }
        }
        
        // Admin notları güncellemesi
        if (adminNotes !== undefined) {
          updateData.adminNotes = adminNotes;
        }
        
        // Hiçbir güncelleme yapılmıyorsa hata döndür
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: 'No update data provided' });
        }
        
        // Siparişi güncelle
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Order updated successfully',
          order: updatedOrder
        });
      } catch (error) {
        console.error('Order update error:', error);
        return res.status(500).json({ error: 'Failed to update order' });
      }
    } else if (req.method === 'DELETE') {
      try {
        // Admin yetkisi kontrol et
        if (session.user.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Only admins can delete orders' });
        }

        const orderId = parseInt(id);

        // İlgili sipariş var mı kontrol et
        const orderExists = await prisma.order.findUnique({
          where: { id: orderId }
        });

        if (!orderExists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        // Siparişi sil
        await prisma.order.delete({
          where: { id: orderId }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Order deleted successfully'
        });
      } catch (error) {
        console.error('Order delete error:', error);
        return res.status(500).json({ error: 'Failed to delete order' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}