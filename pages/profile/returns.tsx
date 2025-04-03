import { ReactElement, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { format } from 'date-fns';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { NextPageWithLayout } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertCircle, Package, Search, Plus, ArrowRight, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import CustomPagination from '@/components/CustomPagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

interface ReturnRequest {
  id: number;
  orderId: number;
  orderNumber: string;
  orderDate: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: number;
    productId: number;
    productName: string;
    productSlug: string;
    productImage: string;
    quantity: number;
    price: number;
  }[];
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: {
    id: number;
    productId: number;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
  }[];
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const ReturnsPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReturns();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  const fetchReturns = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/user/returns?page=${page}&limit=10`);
      
      if (response.data && response.data.returns) {
        setReturns(response.data.returns);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        });
      } else {
        // API yanıt verdi ama beklenen veri yok
        setReturns([]);
        setPagination({
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        });
        console.warn('API returned unexpected data structure:', response.data);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      // Hata mesajını göster
      toast({
        description: 'İade istekleri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        variant: 'destructive',
      });
      // Boş veri ayarla
      setReturns([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 10,
        pages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await axios.get('/api/user/orders?returnable=true');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching eligible orders:', error);
      toast({
        description: 'İade edilebilir siparişler yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchReturns(page);
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder) {
      toast({
        description: 'Lütfen bir sipariş seçin.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedItemIds.length === 0) {
      toast({
        description: 'Lütfen bir ürün seçin.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedItemIds.length > 1) {
      toast({
        description: 'Şu anda her iade talebi için sadece bir ürün seçebilirsiniz.',
        variant: 'destructive',
      });
      return;
    }

    if (!returnReason.trim()) {
      toast({
        description: 'Lütfen iade sebebi girin.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/user/returns', {
        orderId: selectedOrder.id,
        reason: returnReason,
        items: selectedItemIds
      });

      toast({
        description: 'İade talebi başarıyla oluşturuldu.',
      });

      // Yeni iade talebini listeye ekle
      setReturns(prev => [response.data, ...prev]);
      
      // Dialog'u kapat ve formu sıfırla
      setIsCreateDialogOpen(false);
      resetForm();
      
      // İade listesini yenile
      fetchReturns();
    } catch (error: any) {
      console.error('Error creating return request:', error);
      toast({
        description: error.response?.data?.error || 'İade talebi oluşturulurken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setSelectedItemIds([]);
    setReturnReason('');
  };

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === parseInt(orderId));
    setSelectedOrder(order || null);
    setSelectedItemIds([]);
  };

  const handleItemToggle = (itemId: number) => {
    // Sadece bir ürün seçilebilir
    setSelectedItemIds([itemId]);
  };

  const handleOpenDialog = () => {
    fetchEligibleOrders();
    setIsCreateDialogOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    if (activeTab !== 'all' && returnItem.status.toLowerCase() !== activeTab) {
      return false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        returnItem.orderNumber.toLowerCase().includes(searchLower) ||
        returnItem.items.some(item => item.productName.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  if (loading && returns.length === 0) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl font-bold">İade Taleplerim</h1>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Skeleton className="h-10 w-full md:w-64" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <Skeleton className="h-12 w-full" />
          
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
            ))}
          </div>
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
          <h1 className="text-2xl font-bold">İade Taleplerim</h1>
          <div className="flex gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Sipariş no veya ürün ara..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni İade
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="pending">Beklemede</TabsTrigger>
            <TabsTrigger value="approved">Onaylanan</TabsTrigger>
            <TabsTrigger value="rejected">Reddedilen</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-6">
            {filteredReturns.length > 0 ? (
              <div className="space-y-4">
                {filteredReturns.map((returnItem) => (
                  <Card key={returnItem.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            İade Talebi #{returnItem.id}
                          </CardTitle>
                          <CardDescription>
                            Sipariş #{returnItem.orderNumber} - {format(new Date(returnItem.orderDate), 'dd.MM.yyyy')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center mt-2 md:mt-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(returnItem.status)}`}>
                            {getStatusText(returnItem.status)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-1">İade Sebebi:</h4>
                        <p className="text-sm text-gray-600">{returnItem.reason}</p>
                      </div>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {returnItem.items.map((item) => (
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
                                {item.quantity} x {item.price.toFixed(2)} TL
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 py-2 px-4 flex justify-between">
                      <div className="text-sm text-gray-500">
                        Talep Tarihi: {format(new Date(returnItem.createdAt), 'dd.MM.yyyy')}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/profile/returns/${returnItem.id}`}>
                          Detayları Görüntüle
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}

                {pagination.pages > 1 && (
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
                  <RefreshCw className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Henüz iade talebiniz bulunmamaktadır</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Siparişleriniz için iade veya iptal talebi oluşturmak için "Yeni İade" butonuna tıklayabilirsiniz.
                </p>
                <Button onClick={handleOpenDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni İade Talebi Oluştur
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Yeni İade Talebi</DialogTitle>
              <DialogDescription>
                İade etmek istediğiniz siparişi ve ürünleri seçin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="order">Sipariş</Label>
                <Select
                  value={selectedOrder ? String(selectedOrder.id) : ''}
                  onValueChange={handleOrderSelect}
                  disabled={loadingOrders}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sipariş seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingOrders ? (
                      <div className="flex items-center justify-center p-4">
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ) : orders.length > 0 ? (
                      orders.map((order) => (
                        <SelectItem key={order.id} value={String(order.id)}>
                          #{order.orderNumber} - {format(new Date(order.createdAt), 'dd.MM.yyyy')} ({order.total.toFixed(2)} TL)
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">
                        İade edilebilir sipariş bulunamadı
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <div className="space-y-2">
                  <Label>Ürünler</Label>
                  <div className="border rounded-md p-3 space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={selectedItemIds.includes(item.id)}
                          onCheckedChange={() => handleItemToggle(item.id)}
                        />
                        <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden">
                          {item.productImage && (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <Label
                          htmlFor={`item-${item.id}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-gray-500">
                            {item.quantity} x {item.price.toFixed(2)} TL
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">İade Sebebi</Label>
                <Textarea
                  id="reason"
                  placeholder="İade sebebinizi yazın..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button
                onClick={handleCreateReturn}
                disabled={isSubmitting || !selectedOrder || selectedItemIds.length === 0 || !returnReason.trim()}
              >
                {isSubmitting ? 'Gönderiliyor...' : 'İade Talebi Oluştur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  );
};

ReturnsPage.getLayout = function getLayout(page: ReactElement) {
  return page;
};

export default ReturnsPage; 