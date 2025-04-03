import { ReactElement, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { NextPageWithLayout } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertCircle, FileText, Download, MessageSquare } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { MapPin, CreditCard } from 'lucide-react';
import { getStatusText, getStatusColor, canUserCancelOrder } from '@/lib/orderStatusUtils';
import { OrderStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';
import { FormattedOrder, FormattedOrderItem, Address } from '@/types/order';

interface OrderDetail extends FormattedOrder {
  // Extending the FormattedOrder interface with any user-specific fields if needed
}

const OrderDetailPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && id) {
      console.log('Fetching order with ID:', id);
      fetchOrderDetails();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/user/orders/${id}`);
      console.log('API Order Detail Response:', response.data);
      
      // API yanıtının tam yapısını görelim
      const apiResponse = response.data;
      const rawOrderData = apiResponse.data || apiResponse;
      
      console.log('Raw order response:', JSON.stringify(rawOrderData, null, 2));
      
      // El ile sipariş verisini formatlayalım
      const orderData = {
        id: rawOrderData.id,
        orderNumber: rawOrderData.orderNumber || `ORDER-${rawOrderData.id}`,
        status: rawOrderData.status || 'PENDING',
        total: rawOrderData.total || rawOrderData.totalPrice || 0,
        subtotal: rawOrderData.subtotal || 0,
        taxAmount: rawOrderData.taxAmount || 0,
        shippingCost: rawOrderData.shippingCost || 0,
        discountAmount: rawOrderData.discountAmount || 0,
        createdAt: rawOrderData.createdAt,
        updatedAt: rawOrderData.updatedAt,
        items: (rawOrderData.items || rawOrderData.orderItems || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName || item.product?.name || 'Ürün',
          productSlug: item.productSlug || item.product?.slug,
          price: item.price || 0,
          quantity: item.quantity || 1,
          total: (item.price || 0) * (item.quantity || 1),
          productImage: item.productImage || (item.product?.imageUrls && item.product.imageUrls.length > 0 
            ? item.product.imageUrls[0] 
            : null),
        })),
        shippingAddress: rawOrderData.shippingAddress,
        billingAddress: rawOrderData.billingAddress,
        payment: rawOrderData.payment || {
          method: rawOrderData.paymentMethod || 'Not specified',
          status: 'UNKNOWN'
        },
        timeline: (rawOrderData.timeline || []).map((event: any) => ({
          id: event.id,
          status: event.status,
          description: event.description,
          createdAt: event.createdAt || event.date
        }))
      };
      
      console.log('Formatted order data:', orderData);
      setOrder(orderData);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: 'Hata',
        description: 'Sipariş detayları alınırken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen iptal sebebi giriniz.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCancelLoading(true);
      await axios.post(`/api/user/orders/${id}`, {
        action: 'cancel',
        reason: cancelReason
      });
      
      toast({
        title: 'Başarılı',
        description: 'Siparişiniz iptal edildi.',
      });
      
      setCancelDialogOpen(false);
      fetchOrderDetails();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Hata',
        description: 'Sipariş iptal edilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const upperStatus = status.toUpperCase();
    
    if (upperStatus === OrderStatus.PENDING) return <Clock className="h-5 w-5" />;
    if (upperStatus === OrderStatus.PROCESSING) return <Package className="h-5 w-5" />;
    if (upperStatus === OrderStatus.SHIPPED) return <Truck className="h-5 w-5" />;
    if (upperStatus === OrderStatus.DELIVERED || upperStatus === OrderStatus.COMPLETED) return <CheckCircle className="h-5 w-5" />;
    if (upperStatus === OrderStatus.CANCELLED) return <AlertCircle className="h-5 w-5" />;
    
    return <Clock className="h-5 w-5" />;
  };

  if (status === 'loading' || loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-[150px]" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[200px] rounded-xl col-span-2" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold mb-4">Lütfen Giriş Yapın</h1>
          <p className="text-gray-500 mb-6">Bu sayfayı görüntülemek için giriş yapmanız gerekmektedir.</p>
          <Button onClick={() => router.push('/auth/signin')}>Giriş Yap</Button>
        </div>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <p className="text-lg mb-4">Sipariş bulunamadı veya bu siparişi görüntüleme yetkiniz yok.</p>
          <Button asChild>
            <Link href="/profile/orders">Siparişlerime Dön</Link>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const renderOrderItems = () => {
    if (!order.items || !Array.isArray(order.items)) {
      return <p className="text-gray-500">Sipariş ürünleri bulunamadı</p>;
    }
    
    return order.items.map((item: FormattedOrderItem) => (
      <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center py-4 space-y-3 sm:space-y-0 sm:space-x-4 border-b last:border-b-0">
        <div className="h-20 w-20 rounded bg-gray-100 overflow-hidden flex-shrink-0">
          {item.productImage && (
            <img
              src={item.productImage}
              alt={item.productName}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {item.productSlug ? (
            <Link href={`/products/${item.productSlug}`} className="text-blue-600 hover:underline">
              <h3 className="font-medium">{item.productName}</h3>
            </Link>
          ) : (
            <h3 className="font-medium">{item.productName}</h3>
          )}
          <p className="text-sm text-gray-500 mt-1">Adet: {item.quantity}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold">{formatCurrency(item.total)}</p>
          <p className="text-sm text-gray-500">Birim: {formatCurrency(item.price)}</p>
        </div>
      </div>
    ));
  };

  const renderOrderSummary = () => {
    return (
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg mb-4">Sipariş Özeti</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ara Toplam</span>
            <span>{formatCurrency(order.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Kargo</span>
            <span>{formatCurrency(order.shippingCost || 0)}</span>
          </div>
          {(order.discountAmount || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">İndirim</span>
              <span>-{formatCurrency(order.discountAmount || 0)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">KDV (%18)</span>
            <span>{formatCurrency(order.taxAmount || 0)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Toplam</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </CardContent>
    );
  };

  return (
    <>
      <Head>
        <title>Sipariş #{order.orderNumber} | E-Ticaret</title>
      </Head>
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => router.push('/profile/orders')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Sipariş #{order.orderNumber}</h1>
            <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
          </div>
          {canUserCancelOrder(order.status) && (
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                  Siparişi İptal Et
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Siparişi İptal Et</DialogTitle>
                  <DialogDescription>
                    Siparişinizi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">İptal Sebebi</Label>
                    <Textarea
                      id="reason"
                      placeholder="Lütfen iptal sebebinizi belirtiniz"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                    Vazgeç
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelOrder}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'İşleniyor...' : 'Siparişi İptal Et'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sipariş Durumu</CardTitle>
                <CardDescription>
                  Sipariş tarihi: {order.createdAt ? format(new Date(order.createdAt || Date.now()), 'dd.MM.yyyy HH:mm') : 'Belirtilmemiş'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0 ? (
                    order.timeline.map((event, index) => {
                      const isLastItem = index === order.timeline!.length - 1;
                      return (
                        <div key={event.id || index} className="flex">
                          <div className="flex flex-col items-center mr-4">
                            <div className={`rounded-full p-2 ${getStatusColor(event.status)}`}>
                              {getStatusIcon(event.status)}
                            </div>
                            {!isLastItem && (
                              <div className="w-0.5 bg-gray-200 h-full mt-2"></div>
                            )}
                          </div>
                          <div className="pt-1 pb-8">
                            <p className="font-medium">{getStatusText(event.status)}</p>
                            <p className="text-gray-500 text-sm">{event.description}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              {event.createdAt ? format(new Date(event.createdAt || Date.now()), 'dd.MM.yyyy HH:mm') : 'Belirtilmemiş'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500">Sipariş durum geçmişi bulunamadı</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sipariş Detayları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {renderOrderItems()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {renderOrderSummary()}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Teslimat Adresi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.shippingAddress ? (
                  <div className="space-y-1">
                    <p className="font-medium">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                    <p className="text-sm">{order.shippingAddress.phone}</p>
                    <p className="text-sm">{order.shippingAddress.street}</p>
                    <p className="text-sm">
                      {order.shippingAddress.zipCode} {order.shippingAddress.city}/{order.shippingAddress.state}
                    </p>
                    <p className="text-sm">{order.shippingAddress.country}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Teslimat adresi belirtilmemiş</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Ödeme Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ödeme Yöntemi</span>
                    <span>{order.payment?.method || (order as any).paymentMethod || 'Belirtilmemiş'}</span>
                  </div>
                  {order.billingAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fatura Adresi</span>
                      <span>{order.billingAddress.title}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

OrderDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

export default OrderDetailPage; 