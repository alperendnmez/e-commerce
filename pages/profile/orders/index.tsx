import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import CustomPagination from '@/components/CustomPagination';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { Search, Clock, ArrowRight, Package, ShoppingBag } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getStatusText, getStatusColor } from '@/lib/orderStatusUtils';
import { OrderStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders(1, activeTab !== 'all' ? activeTab : undefined, searchQuery);
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, activeTab, searchQuery]);

  const fetchOrders = async (page = 1, status?: string, search?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 10 };
      if (status) params.status = status;
      if (search) params.search = search;

      console.log('Calling orders API with params:', params);
      
      const response = await axios.get('/api/user/orders', { params });
      console.log('Orders API response:', response.data);
      
      let formattedOrders = [];
      
      if (response.data) {
        if (Array.isArray(response.data.data?.items)) {
          formattedOrders = response.data.data.items;
        } else if (Array.isArray(response.data.data)) {
          formattedOrders = response.data.data;
        } else if (Array.isArray(response.data.orders)) {
          formattedOrders = response.data.orders;
        } else if (Array.isArray(response.data)) {
          formattedOrders = response.data;
        }
      }
      
      console.log('Formatted orders data:', formattedOrders);
      
      setOrders(formattedOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total || order.totalPrice,
        createdAt: order.createdAt,
        items: order.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName || item.product?.name,
          productImage: item.productImage || (item.product?.imageUrls && item.product.imageUrls.length > 0 ? item.product.imageUrls[0] : null),
          quantity: item.quantity,
          price: item.price
        })) || []
      })));
      
      setPagination({
        total: response.data.total || response.data.data?.meta?.total || response.data.pagination?.total || 0,
        page: response.data.page || response.data.data?.meta?.page || response.data.pagination?.page || 1,
        limit: response.data.limit || response.data.data?.meta?.limit || response.data.pagination?.limit || 10,
        pages: response.data.pages || response.data.data?.meta?.pages || response.data.pagination?.pages || 0
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      toast({
        title: "Hata",
        description: "Siparişler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1, activeTab !== 'all' ? activeTab : undefined, searchQuery);
  };

  const handlePageChange = (page: number) => {
    fetchOrders(page, activeTab !== 'all' ? activeTab : undefined, searchQuery);
  };

  if (loading && status === 'loading') {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[150px] w-full rounded-xl" />
          ))}
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

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold">Siparişlerim</h1>
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Sipariş numarası ara..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="ml-2">
              Ara
            </Button>
          </form>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="PENDING">Beklemede</TabsTrigger>
            <TabsTrigger value="PROCESSING">İşlemde</TabsTrigger>
            <TabsTrigger value="SHIPPED">Kargoda</TabsTrigger>
            <TabsTrigger value="DELIVERED">Teslim Edildi</TabsTrigger>
            <TabsTrigger value="CANCELLED">İptal Edildi</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[150px] w-full rounded-xl" />
                ))}
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="bg-gray-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Sipariş #{order.orderNumber}</span>
                          <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0 flex items-center space-x-4">
                        <span className="font-bold">{formatCurrency(order.total)}</span>
                        <Link href={`/profile/orders/${order.id}`}>
                          <Button size="sm">Detaylar</Button>
                        </Link>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center space-x-3">
                            <div className="h-12 w-12 rounded bg-gray-100 overflow-hidden">
                              {item.productImage && (
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} x {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center mt-6">
                    <CustomPagination
                      currentPage={pagination.page}
                      totalPages={pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <ShoppingBag className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Henüz siparişiniz bulunmamaktadır</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Siparişleriniz burada görüntülenecektir. Alışverişe başlamak için aşağıdaki butona tıklayabilirsiniz.
                </p>
                <Button onClick={() => router.push('/')}>Alışverişe Başla</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
} 