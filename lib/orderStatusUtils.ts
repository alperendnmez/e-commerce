import { OrderStatus } from '@prisma/client';

// Order status transition validation rules - matches the backend service
export const VALID_STATUS_TRANSITIONS: { [key in OrderStatus]: OrderStatus[] } = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.COMPLETED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.RETURNED],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Status descriptions for UI tooltips
export const STATUS_DESCRIPTIONS: { [key in OrderStatus]: string } = {
  [OrderStatus.PENDING]: 'Sipariş alındı, ödeme bekleniyor',
  [OrderStatus.PAID]: 'Ödeme alındı, işleme hazırlanıyor',
  [OrderStatus.PROCESSING]: 'Sipariş hazırlanıyor',
  [OrderStatus.SHIPPED]: 'Sipariş kargoya verildi',
  [OrderStatus.DELIVERED]: 'Sipariş müşteriye teslim edildi',
  [OrderStatus.COMPLETED]: 'Sipariş tamamlandı',
  [OrderStatus.CANCELLED]: 'Sipariş iptal edildi',
  [OrderStatus.REFUNDED]: 'Sipariş bedeli iade edildi',
  [OrderStatus.RETURNED]: 'Ürünler iade edildi'
};

// Get valid next statuses based on current status
export function getValidNextStatuses(currentStatus: OrderStatus | string): OrderStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus as OrderStatus] || [];
}

// Status text mapping (Turkish)
export const statusTextMap: Record<string, string> = {
  [OrderStatus.PENDING]: 'Beklemede',
  [OrderStatus.PAID]: 'Ödendi',
  [OrderStatus.PROCESSING]: 'İşlemde',
  [OrderStatus.SHIPPED]: 'Kargoya Verildi',
  [OrderStatus.DELIVERED]: 'Teslim Edildi',
  [OrderStatus.COMPLETED]: 'Tamamlandı',
  [OrderStatus.CANCELLED]: 'İptal Edildi',
  [OrderStatus.REFUNDED]: 'İade Edildi',
  [OrderStatus.RETURNED]: 'Geri Gönderildi'
};

// Status color mapping
export const STATUS_COLORS: { [key in OrderStatus]: string } = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.PAID]: 'bg-blue-100 text-blue-800',
  [OrderStatus.PROCESSING]: 'bg-purple-100 text-purple-800',
  [OrderStatus.SHIPPED]: 'bg-indigo-100 text-indigo-800',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
  [OrderStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [OrderStatus.REFUNDED]: 'bg-orange-100 text-orange-800',
  [OrderStatus.RETURNED]: 'bg-gray-100 text-gray-800'
};

// Get status text
export function getStatusText(status: string): string {
  return statusTextMap[status as OrderStatus] || status;
}

// Get status color class
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as OrderStatus] || 'bg-gray-100 text-gray-800';
}

// Get status description
export function getStatusDescription(status: OrderStatus | string): string {
  return STATUS_DESCRIPTIONS[status as OrderStatus] || 'Bilinmeyen durum';
}

// Can user cancel order
export function canUserCancelOrder(status: string): boolean {
  return [OrderStatus.PENDING, OrderStatus.PROCESSING].includes(status as any);
}

// Can admin modify this order based on status
export function canAdminModifyOrder(status: OrderStatus): boolean {
  return ![OrderStatus.REFUNDED, OrderStatus.COMPLETED, OrderStatus.RETURNED].includes(status as any);
}

// Can this order be refunded
export function canBeRefunded(status: string): boolean {
  return [OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(status as any);
}

// Can order be cancelled
export function canOrderBeCancelled(status: OrderStatus): boolean {
  return [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING].includes(status as any);
}

// Can order be refunded
export function canOrderBeRefunded(status: OrderStatus): boolean {
  return [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.RETURNED].includes(status as any);
}

// Can customer cancel order
export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return [OrderStatus.PENDING, OrderStatus.PAID].includes(status as any);
}

// Needs urgent attention
export function needsUrgentAttention(status: OrderStatus): boolean {
  return [OrderStatus.PENDING, OrderStatus.PAID].includes(status as any);
}

// Get next recommended status
export function getNextRecommendedStatus(status: OrderStatus): OrderStatus | null {
  const transitions = getValidNextStatuses(status);
  if (transitions.length === 0) return null;
  
  // Genellikle ilk seçenek en mantıklı sonraki adımdır
  // Örneğin:
  // PENDING -> PAID
  // PAID -> PROCESSING
  // PROCESSING -> SHIPPED
  // vb.
  return transitions[0];
} 