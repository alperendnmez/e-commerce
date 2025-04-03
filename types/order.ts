import { OrderStatus, PaymentStatus } from '@prisma/client';

// Prisma'dan import edilemiyor ise, burada manuel olarak tanımlıyoruz
export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED'
}

// Sipariş öğesi için tip tanımı
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  variantId?: number | null;
  product: {
    id: number;
    name: string;
    imageUrls?: string[];
    slug?: string;
    [key: string]: any;
  };
  variant?: {
    id: number;
    price: number;
    stock: number;
    [key: string]: any;
  } | null;
}

// Adres için tip tanımı
export interface Address {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  title: string;
  street: string;
  city: string;
  state: string;
  district?: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  isDefaultBilling: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Ödeme için tip tanımı
export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: PaymentStatus;
  providerName?: string;
  providerTransactionId?: string;
  cardBrand?: string;
  cardLastFour?: string;
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sipariş zaman çizelgesi için tip tanımı
export interface OrderTimeline {
  id: number;
  orderId: number;
  status: OrderStatus;
  description: string;
  date: Date;
  createdAt: Date;
}

// Kupon için tip tanımı
export interface Coupon {
  id: number;
  code: string;
  value: number;
  type: CouponType;
  validFrom?: Date | null;
  validUntil?: Date | null;
  isActive: boolean;
  maxUsage?: number | null;
  usageCount: number;
  maxDiscount?: number | null;
  minOrderAmount?: number | null;
  description?: string | null;
  categories?: string | null;
  products?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Kullanıcı için tip tanımı
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  [key: string]: any;
}

// Sipariş için tip tanımı (şema ile uyumlu)
export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalPrice: number;
  orderNumber?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  shippingCost?: number | null;
  discountAmount?: number | null;
  paymentMethod?: string | null;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  billingAddressId?: number | null;
  shippingAddressId?: number | null;
  couponId?: number | null;
  adminNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  billingAddress?: Address | null;
  shippingAddress?: Address | null;
  orderItems: OrderItem[];
  coupon?: Coupon | null;
  timeline: OrderTimeline[];
  payment?: Payment | null;
  
  // Sipariş modeli için ek alanlar (yazılım tarafında eklenen)
  shippingCarrier?: string;
  estimatedDelivery?: Date;
}

// Format edilmiş sipariş öğesi için tip tanımı (API yanıtları için)
export interface FormattedOrderItem {
  id: number;
  productId: number;
  productName: string;
  productSlug?: string;
  productImage: string | null;
  quantity: number;
  price: number;
  total: number;
  variant?: {
    id: number;
    price: number;
  } | null;
}

// Format edilmiş sipariş için tip tanımı (API yanıtları için)
export interface FormattedOrder {
  id: number;
  orderNumber: string | null;
  status: OrderStatus;
  total: number;
  subtotal?: number | null;
  shippingCost?: number | null;
  taxAmount?: number | null;
  discountAmount?: number | null;
  createdAt: Date;
  updatedAt?: Date;
  items: FormattedOrderItem[];
  payment?: {
    method: string;
    status: string;
  } | null;
  shipping?: {
    address?: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      phone: string;
    } | null;
    method?: string | null;
    carrier?: string;
    trackingNumber?: string | null;
    estimatedDelivery?: Date;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
  billingAddress?: Address;
  shippingAddress?: Address;
  coupon?: {
    id: number;
    code: string;
    discount: number;
    type: string;
  } | null;
  timeline?: {
    id: number;
    status: OrderStatus;
    description: string;
    createdAt: Date;
  }[];
} 