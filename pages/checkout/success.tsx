import { useEffect, useState } from 'react';
import { NextPageWithLayout } from '@/lib/types';
import { ReactElement } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, ChevronRight, Clock, Clipboard, ClipboardCopy, Loader2, MapPin, ShoppingBag, Truck } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface OrderDetails {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalPrice: number;
  shippingCost: number;
  items?: {
    id: number;
    productId: number;
    quantity: number;
    price: number;
    total: number;
    productName: string;
    productSlug?: string;
    productImage: string | null;
  }[];
  shippingAddress?: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
}

const OrderSuccess: NextPageWithLayout = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // orderId olmadan bu sayfaya doğrudan erişilmiş, anasayfaya yönlendir
    if (status === 'authenticated' && !orderId) {
      router.push('/');
      return;
    }

    if (orderId && status === 'authenticated') {
      fetchOrderDetails();
    }
  }, [orderId, status, router]);

  const fetchOrderDetails = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Order details fetch error:', error);
      toast.error('Sipariş detayları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success('Sipariş numarası kopyalandı');
    }
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Sipariş bilgileri yükleniyor...</span>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Siparişiniz Tamamlandı!</h1>
          <p className="mt-2 text-lg text-gray-600">
            {order?.orderNumber && (
              <span>
                Sipariş numaranız:{' '}
                <button
                  onClick={copyOrderNumber}
                  className="inline-flex items-center font-medium text-primary hover:underline"
                >
                  {order.orderNumber}
                  <ClipboardCopy className="ml-1 h-4 w-4" />
                </button>
              </span>
            )}
          </p>
          <p className="mt-2 text-gray-500">
            Siparişinizle ilgili ayrıntıları e-posta adresinize gönderdik.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-medium text-gray-900">Sipariş Durumu</h2>
                  <div className="mt-4 flex items-center space-x-2">
                    <div className="rounded-full bg-primary p-1.5">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium text-gray-900">Sipariş İşleniyor</span>
                  </div>
                  <div className="mt-4">
                    <div className="relative pt-1">
                      <div className="mb-4 flex h-2 overflow-hidden rounded bg-gray-200">
                        <div
                          className="flex flex-col justify-center overflow-hidden whitespace-nowrap rounded bg-primary px-3 text-center text-white shadow-none"
                          style={{ width: '25%' }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 text-xs">
                      <div className="text-primary">
                        <div className="mb-1 font-medium">Sipariş Alındı</div>
                        <div>{new Date().toLocaleDateString('tr-TR')}</div>
                      </div>
                      <div className="text-gray-500">
                        <div className="mb-1 font-medium">Hazırlanıyor</div>
                        <div>-</div>
                      </div>
                      <div className="text-gray-500">
                        <div className="mb-1 font-medium">Kargoya Verildi</div>
                        <div>-</div>
                      </div>
                      <div className="text-gray-500">
                        <div className="mb-1 font-medium">Teslim Edildi</div>
                        <div>-</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="mb-5">
                  <h2 className="text-lg font-medium text-gray-900">Sipariş Ürünleri</h2>
                  <div className="mt-4 divide-y divide-gray-200">
                    {order?.items?.map((item) => (
                      <div key={item.id} className="flex py-4">
                        <div className="flex-shrink-0">
                          <div className="relative h-20 w-20 overflow-hidden rounded-md border">
                            <Image
                              src={item.productImage || '/placeholder-product.jpg'}
                              alt={item.productName}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="ml-4 flex flex-1 flex-col">
                          <div className="flex justify-between text-sm font-medium">
                            <h3 className="text-gray-900">{item.productName}</h3>
                            <p className="ml-4 text-gray-900">{item.price.toLocaleString('tr-TR')} TL</p>
                          </div>
                          <div className="mt-1 flex justify-between text-sm text-gray-500">
                            <p>Adet: {item.quantity}</p>
                            <p className="ml-4">{(item.price * item.quantity).toLocaleString('tr-TR')} TL</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {order?.shippingAddress && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Teslimat Adresi</h2>
                      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                        <div className="font-medium">{order.shippingAddress.fullName}</div>
                        <div className="mt-1">{order.shippingAddress.phone}</div>
                        <div className="mt-2">
                          {order.shippingAddress.address}
                          <br />
                          {order.shippingAddress.zipCode} {order.shippingAddress.city}, {order.shippingAddress.state}
                          <br />
                          {order.shippingAddress.country}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium text-gray-900">Sipariş Özeti</h2>
                
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Ara Toplam</p>
                    <p className="font-medium text-gray-900">
                      {order ? ((order.totalPrice - (order.shippingCost || 0))).toLocaleString('tr-TR') : 0} TL
                    </p>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Kargo</p>
                    <p className="font-medium text-gray-900">
                      {order?.shippingCost?.toLocaleString('tr-TR') || 0} TL
                    </p>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex justify-between">
                    <p className="text-base font-medium text-gray-900">Toplam</p>
                    <p className="text-base font-medium text-gray-900">
                      {order?.totalPrice.toLocaleString('tr-TR') || 0} TL
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/profile/orders">
                      Siparişlerim
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Alışverişe Devam Et
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

OrderSuccess.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default OrderSuccess; 