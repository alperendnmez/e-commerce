import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import axios from 'axios';
import { 
  Search, 
  ArrowLeft, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown,
  Download,
  FileJson,
  FileSpreadsheet,
  LayoutList,
  LayoutGrid,
  Clock,
  Calendar,
  User,
  Eye,
  Pencil,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  PackageCheck,
  TruckIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { tr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import CustomPagination from '@/components/CustomPagination';
import { getStatusText, getStatusColor, getValidNextStatuses, getStatusDescription } from '@/lib/orderStatusUtils';
import { OrderStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from "sonner";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

interface OrderInterface {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  items?: {
    id: number;
    productName: string;
    productImage?: string | null;
    quantity: number;
    price: number;
  }[];
  user?: {
    id: number;
    name: string;
    email: string;
  };
  paymentMethod?: string;
  shippingMethod?: string;
}

export default function OrdersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    sortBy: 'createdAt', // 'createdAt', 'total', 'status'
    sortOrder: 'desc', // 'asc', 'desc'
    dateRange: 'all', // 'all', 'today', 'thisWeek', 'thisMonth', 'thisYear'
    paymentMethod: 'all', // 'all', 'credit_card', 'cash', 'bank_transfer', etc.
    shippingMethod: 'all', // 'all', 'standard', 'express', etc.
    minTotal: '',
    maxTotal: '',
    priorityFilter: 'all' // 'all', 'pendingPayments', 'readyToShip', 'needsAttention'
  });
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Siparişleri yükle
  const fetchOrders = async (page: number) => {
    try {
      setLoading(true);
      
      console.log('Dashboard siparişleri API isteği yapılıyor. Parametreler:', {
        page,
        limit: pagination.limit,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        dateRange: filters.dateRange,
        paymentMethod: filters.paymentMethod,
        shippingMethod: filters.shippingMethod,
        minTotal: filters.minTotal,
        maxTotal: filters.maxTotal
      });
      
      const response = await axios.get('/api/orders', {
        params: {
          page,
          limit: pagination.limit,
          status: filters.status !== 'all' ? filters.status : undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
          paymentMethod: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
          shippingMethod: filters.shippingMethod !== 'all' ? filters.shippingMethod : undefined,
          minTotal: filters.minTotal || undefined,
          maxTotal: filters.maxTotal || undefined
        }
      });
      
      // Detaylı loglama - API yanıtını tam olarak görelim
      console.log('Dashboard siparişleri API yanıtı (RAW):', JSON.stringify(response.data, null, 2));
      
      // API yanıtının formatı:
      // {
      //   success: true,
      //   data: {
      //     items: [...orders],
      //     meta: { total, page, pageSize, totalPages, hasMore }
      //   }
      // }
      
      if (!response.data.success) {
        throw new Error('API yanıtı başarısız: ' + (response.data.error || 'Bilinmeyen hata'));
      }
      
      const items = response.data.data.items || [];
      const meta = response.data.data.meta || { total: 0, page: 1, pageSize: 10, totalPages: 1, hasMore: false };
      
      console.log('Dashboard siparişleri API yanıtı (işlenmiş):', {
        status: response.status,
        ordersCount: items.length,
        pagination: meta,
        firstOrderSample: items.length > 0 ? {
          id: items[0].id,
          orderNumber: items[0].orderNumber,
          status: items[0].status
        } : 'No orders found'
      });
      
      // Siparişleri ayarla
      setOrders(items);
      setError(null);
      
      // Pagination bilgilerini ayarla
      setPagination({
        page: meta.page,
        limit: meta.pageSize,
        total: meta.total,
        totalPages: meta.totalPages
      });
    } catch (err: any) {
      console.error('Siparişler yüklenirken hata:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Siparişler yüklenirken bir hata oluştu.';
      setError(errorMessage);
      setOrders([]);
      
      // Hata bildirimi göster
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde siparişleri getir
  useEffect(() => {
    fetchOrders(pagination.page);
  }, [pagination.page]);

  // Filtre uygula
  const applyFilters = () => {
    fetchOrders(pagination.page);
    toast({
      title: "Filtreler uygulandı",
      description: "Sipariş listesi filtrelendi.",
    });
  };

  // Filtreleri sıfırla
  const resetFilters = () => {
    setFilters({
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      dateRange: 'all',
      paymentMethod: 'all',
      shippingMethod: 'all',
      minTotal: '',
      maxTotal: '',
      priorityFilter: 'all'
    });
    fetchOrders(pagination.page);
    toast({
      title: "Filtreler sıfırlandı",
      description: "Tüm filtreler kaldırıldı.",
    });
  };

  // Dışa aktarma fonksiyonu
  const exportOrders = (format: 'json' | 'csv' | 'excel') => {
    const ordersToExport = selectedOrders.length > 0 
      ? orders.filter(order => selectedOrders.includes(order.id))
      : orders;
      
    if (ordersToExport.length === 0) {
      toast({
        title: "Uyarı",
        description: "Dışa aktarılacak sipariş bulunamadı",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Örnek: JSON formatında
      if (format === 'json') {
        const jsonString = JSON.stringify(ordersToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `siparisler-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: "Başarılı",
          description: `${ordersToExport.length} sipariş JSON formatında dışa aktarıldı`
        });
      } else {
        toast({
          title: "Bilgi",
          description: `${format.toUpperCase()} formatında dışa aktarma yakında eklenecek`
        });
      }
    } catch (error) {
      console.error('Siparişler dışa aktarılırken hata oluştu:', error);
      toast({
        title: "Hata",
        description: "Siparişler dışa aktarılırken bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  // Sipariş durumuna göre badge rengi
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Sipariş durumu metni
  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Beklemede';
      case 'PROCESSING':
        return 'İşlemde';
      case 'SHIPPED':
        return 'Kargoda';
      case 'DELIVERED':
        return 'Teslim Edildi';
      case 'CANCELLED':
        return 'İptal Edildi';
      case 'COMPLETED':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  // Tüm siparişleri seç/bırak
  const toggleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      // Filtrelere göre gösterilen tüm siparişleri seç
      setSelectedOrders(getFilteredOrders().map(order => order.id));
    } else {
      // Seçimleri temizle
      setSelectedOrders([]);
    }
  };

  // Tek bir siparişi seç/bırak
  const toggleSelectOrder = (id: number) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(orderId => orderId !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  // Filtrelere göre siparişleri getir
  const getFilteredOrders = () => {
    // Sipariş verisi yüklenmediyse boş dizi döndür
    if (!orders || !Array.isArray(orders)) {
      return [];
    }
    
    // Arama terimini kontrol et
    let filtered = orders.filter(order => {
      if (!searchTerm) return true;
      
      const lowerSearchTerm = searchTerm.toLowerCase();
      return (
        (order.orderNumber?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (order.user?.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (order.user?.email?.toLowerCase() || '').includes(lowerSearchTerm)
      );
    });
    
    // Duruma göre filtrele
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    // Ödeme yöntemine göre filtrele
    if (filters.paymentMethod !== 'all' && filters.paymentMethod) {
      filtered = filtered.filter(order => order.paymentMethod === filters.paymentMethod);
    }
    
    // Kargo yöntemine göre filtrele
    if (filters.shippingMethod !== 'all' && filters.shippingMethod) {
      filtered = filtered.filter(order => order.shippingMethod === filters.shippingMethod);
    }
    
    // Min-Max tutara göre filtrele
    if (filters.minTotal) {
      filtered = filtered.filter(order => order.total >= parseFloat(filters.minTotal));
    }
    
    if (filters.maxTotal) {
      filtered = filtered.filter(order => order.total <= parseFloat(filters.maxTotal));
    }
    
    // Sıralama
    filtered.sort((a, b) => {
      if (filters.sortBy === 'createdAt') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } 
      else if (filters.sortBy === 'total') {
        return filters.sortOrder === 'asc' ? a.total - b.total : b.total - a.total;
      } 
      else if (filters.sortBy === 'status') {
        return filters.sortOrder === 'asc' 
          ? a.status.localeCompare(b.status) 
          : b.status.localeCompare(a.status);
      }
      return 0;
    });
    
    return filtered;
  };

  // Siparişleri görüntüle - filtrelere göre
  const filteredOrders = getFilteredOrders();

  // Sayfa değişikliği
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!pagination || newPage <= pagination.totalPages)) {
      fetchOrders(newPage);
    }
  };

  // Sipariş durumunu güncelle
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sipariş durumu güncellenirken bir hata oluştu');
      }

      const updatedOrder = await response.json();
      
      // Sipariş listesini güncelle
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      toast({
        title: "Başarılı",
        description: "Sipariş durumu başarıyla güncellendi"
      });
    } catch (error) {
      console.error('Sipariş durumu güncellenirken hata oluştu:', error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : 'Sipariş durumu güncellenirken bir hata oluştu',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Sipariş silme işlemi
  const deleteOrder = async (orderId: number) => {
    if (!confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`/api/orders/${orderId}`);
      
      toast({
        title: 'Başarılı',
        description: 'Sipariş başarıyla silindi.',
      });
      
      // Siparişi listeden kaldır
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Hata',
        description: 'Sipariş silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Toplu sipariş silme
  const bulkDeleteOrders = async () => {
    if (selectedOrders.length === 0) return;
    
    if (!window.confirm(`${selectedOrders.length} siparişi silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      // Gerçek senaryoda bulk silme API'si kullanılabilir
      // Burada basit olarak her siparişi tek tek siliyoruz
      await Promise.all(selectedOrders.map(id => axios.delete(`/api/orders/${id}`)));
      
      // Silinen siparişleri listeden kaldır
      setOrders(orders.filter(order => !selectedOrders.includes(order.id)));
      
      // Seçimleri temizle
      setSelectedOrders([]);
      
      toast({
        title: "Başarılı",
        description: `${selectedOrders.length} sipariş başarıyla silindi.`,
      });
    } catch (error) {
      console.error('Error bulk deleting orders:', error);
      toast({
        title: "Hata",
        description: "Siparişler silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Siparişler</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Sipariş numarası, müşteri adı veya e-posta ile ara..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtreler
                {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sırala
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sıralama Kriteri</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup 
                    value={filters.sortBy} 
                    onValueChange={(value) => setFilters({...filters, sortBy: value})}
                  >
                    <DropdownMenuRadioItem value="createdAt">Sipariş Tarihi</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="total">Toplam Tutar</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="status">Durum</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sıralama Yönü</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuRadioGroup 
                    value={filters.sortOrder} 
                    onValueChange={(value) => setFilters({...filters, sortOrder: value})}
                  >
                    <DropdownMenuRadioItem value="asc">Artan</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="desc">Azalan</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Dışa Aktar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportOrders('json')}>
                    <FileJson className="mr-2 h-4 w-4" />
                    <span>JSON Olarak İndir</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportOrders('csv')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>CSV Olarak İndir</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportOrders('excel')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Excel Olarak İndir</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}>
                {viewMode === 'grid' ? (
                  <>
                    <LayoutList className="mr-2 h-4 w-4" />
                    Tablo Görünümü
                  </>
                ) : (
                  <>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Kart Görünümü
                  </>
                )}
              </Button>
              
              <Button variant="default" onClick={() => fetchOrders(pagination.page)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Yenile
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle>Gelişmiş Filtreler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Sipariş Durumu</Label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters({...filters, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Durum seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value={OrderStatus.PENDING}>Beklemede</SelectItem>
                        <SelectItem value={OrderStatus.PAID}>Ödendi</SelectItem>
                        <SelectItem value={OrderStatus.PROCESSING}>İşlemde</SelectItem>
                        <SelectItem value={OrderStatus.SHIPPED}>Kargoda</SelectItem>
                        <SelectItem value={OrderStatus.DELIVERED}>Teslim Edildi</SelectItem>
                        <SelectItem value={OrderStatus.COMPLETED}>Tamamlandı</SelectItem>
                        <SelectItem value={OrderStatus.CANCELLED}>İptal Edildi</SelectItem>
                        <SelectItem value={OrderStatus.REFUNDED}>İade Edildi</SelectItem>
                        <SelectItem value={OrderStatus.RETURNED}>Geri Gönderildi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ödeme Yöntemi</Label>
                    <Select 
                      value={filters.paymentMethod} 
                      onValueChange={(value) => setFilters({...filters, paymentMethod: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ödeme yöntemi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                        <SelectItem value="bank_transfer">Havale / EFT</SelectItem>
                        <SelectItem value="cash">Kapıda Ödeme</SelectItem>
                        <SelectItem value="online_payment">Online Ödeme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Kargo Yöntemi</Label>
                    <Select 
                      value={filters.shippingMethod} 
                      onValueChange={(value) => setFilters({...filters, shippingMethod: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kargo yöntemi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="standard">Standart Kargo</SelectItem>
                        <SelectItem value="express">Hızlı Kargo</SelectItem>
                        <SelectItem value="pickup">Mağazadan Teslim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tarih Aralığı</Label>
                    <Select 
                      value={filters.dateRange} 
                      onValueChange={(value) => setFilters({...filters, dateRange: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tarih aralığı seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="today">Bugün</SelectItem>
                        <SelectItem value="thisWeek">Bu Hafta</SelectItem>
                        <SelectItem value="thisMonth">Bu Ay</SelectItem>
                        <SelectItem value="thisYear">Bu Yıl</SelectItem>
                        <SelectItem value="lastWeek">Geçen Hafta</SelectItem>
                        <SelectItem value="lastMonth">Geçen Ay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Minimum Toplam (₺)</Label>
                    <Input 
                      type="number" 
                      placeholder="Min tutar" 
                      value={filters.minTotal}
                      onChange={(e) => setFilters({...filters, minTotal: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Maksimum Toplam (₺)</Label>
                    <Input 
                      type="number" 
                      placeholder="Max tutar" 
                      value={filters.maxTotal}
                      onChange={(e) => setFilters({...filters, maxTotal: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Acil İşlem Gerektiren Siparişler</Label>
                    <Select 
                      value={filters.priorityFilter || 'all'} 
                      onValueChange={(value) => setFilters({...filters, priorityFilter: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Öncelik durumu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="pendingPayments">Ödemesi Bekleyenler</SelectItem>
                        <SelectItem value="readyToShip">Kargoya Hazır</SelectItem>
                        <SelectItem value="needsAttention">İlgi Bekleyenler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-2">
                  <Button variant="outline" onClick={resetFilters}>
                    Filtreleri Sıfırla
                  </Button>
                  <Button onClick={applyFilters}>
                    Filtreleri Uygula
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Seçili siparişler için toplu işlem butonları */}
        {selectedOrders.length > 0 && (
          <div className="bg-muted p-4 rounded-md flex items-center justify-between mt-4 mb-6">
            <div className="text-sm font-medium">
              {selectedOrders.length} sipariş seçildi
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedOrders([])}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Seçimi Temizle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Seçili siparişlerin durumunu "COMPLETED" olarak güncelle
                  selectedOrders.forEach(id => updateOrderStatus(id, 'COMPLETED'));
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Tamamlandı Olarak İşaretle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Seçili siparişlerin durumunu "SHIPPED" olarak güncelle
                  selectedOrders.forEach(id => updateOrderStatus(id, 'SHIPPED'));
                }}
              >
                <TruckIcon className="mr-2 h-4 w-4" />
                Kargoya Ver
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={bulkDeleteOrders}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Toplu Sil
              </Button>
            </div>
          </div>
        )}
        
        {/* Boş durum */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz sipariş bulunmamaktadır</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || filters.status !== 'all' ? 
                'Arama kriterlerinize uygun sipariş bulunamadı. Filtreleri değiştirmeyi deneyin.' : 
                'Henüz sisteme eklenmiş bir sipariş bulunmamaktadır.'}
            </p>
          </div>
        )}
        
        {/* Yükleniyor durumu */}
        {loading && (
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded-lg"></div>
            ))}
          </div>
        )}
        
        {/* Sipariş tablosu - Tablo görünümü */}
        {!loading && filteredOrders.length > 0 && viewMode === 'table' && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={
                        filteredOrders.length > 0 && 
                        selectedOrders.length === filteredOrders.length
                      } 
                      onCheckedChange={toggleSelectAllOrders}
                    />
                  </TableHead>
                  <TableHead className="w-[100px]">Sipariş No</TableHead>
                  <TableHead className="w-[100px]">Tarih</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-[100px] text-right">Toplam</TableHead>
                  <TableHead className="w-[150px] text-center">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.user?.name}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="outline" size="icon" asChild>
                          <Link href={`/dashboard/siparisler/${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              disabled={getValidNextStatuses(order.status).length === 0}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Durum Değiştir</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {getValidNextStatuses(order.status).map((nextStatus) => (
                              <DropdownMenuItem 
                                key={nextStatus}
                                onClick={() => updateOrderStatus(order.id, nextStatus)}
                              >
                                <div className="flex items-center">
                                  <Badge className={`mr-2 ${getStatusColor(nextStatus)}`}>
                                    {getStatusText(nextStatus)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{getStatusDescription(nextStatus)}</span>
                                </div>
                              </DropdownMenuItem>
                            ))}
                            {getValidNextStatuses(order.status).length === 0 && (
                              <DropdownMenuItem disabled>
                                Bu durumdaki sipariş değiştirilemez
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteOrder(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Sipariş Kartları - Kart görünümü */}
        {!loading && filteredOrders.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">#{order.orderNumber}</span>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold">{formatCurrency(order.total)}</div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Müşteri:</span>
                      <span className="text-sm font-medium">{order.user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">E-posta:</span>
                      <span className="text-sm">{order.user?.email}</span>
                    </div>
                    {order.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Ödeme:</span>
                        <span className="text-sm">{order.paymentMethod}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ürün sayısı:</span>
                      <span className="text-sm">{order.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Durum Açıklaması:</span>
                      <span className="text-sm text-muted-foreground">{getStatusDescription(order.status)}</span>
                    </div>
                  </div>
                  
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground mb-2">Ürünler:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center space-x-2 bg-muted p-1 rounded-md text-xs">
                            {item.productImage && (
                              <div className="h-6 w-6 rounded overflow-hidden">
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <span className="truncate max-w-[100px]">{item.productName}</span>
                            <span>x{item.quantity}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="bg-muted p-1 rounded-md text-xs">
                            +{order.items.length - 3} daha
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <Separator />
                <div className="p-3 bg-background flex flex-wrap justify-end space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/siparisler/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Detaylar
                    </Link>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Durum Değiştir
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Durum Değiştir</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {getValidNextStatuses(order.status).map((nextStatus) => (
                        <DropdownMenuItem 
                          key={nextStatus}
                          onClick={() => updateOrderStatus(order.id, nextStatus)}
                        >
                          <div className="flex items-center">
                            <Badge className={`mr-2 ${getStatusColor(nextStatus)}`}>
                              {getStatusText(nextStatus)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{getStatusDescription(nextStatus)}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {getValidNextStatuses(order.status).length === 0 && (
                        <DropdownMenuItem disabled>
                          Bu durumdaki sipariş değiştirilemez
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {!loading && filteredOrders.length > 0 && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <CustomPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
      </div>
    </DashboardLayout>
  );
}