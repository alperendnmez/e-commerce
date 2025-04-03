import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import axios from '@/lib/axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Search, Mail, Package, RefreshCw, Eye, RotateCcw, CheckCircle, XCircle, ArrowRight, BanknoteIcon } from 'lucide-react';

interface ReturnRequest {
  id: number;
  orderId: number;
  orderNumber: string;
  userId: number;
  userEmail: string;
  userName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'COMPLETED';
  type: 'RETURN' | 'CANCEL';
  reason: string;
  description?: string;
  orderItemId?: number;
  refundAmount?: number;
  refundMethod?: string;
  refundDate?: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: number;
    productId: number;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
  }[];
}

const formatDate = (date: string) => {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: tr });
};

export default function CustomerReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    if (returns.length > 0) {
      applyFilters();
    }
  }, [searchQuery, filterStatus, filterType, returns]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/customers/returns');
      setReturns(response.data);
      setError(null);
    } catch (err) {
      setError('İade talepleri yüklenirken bir hata oluştu.');
      console.error('Error fetching returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...returns];

    // Durum filtresi
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Tip filtresi
    if (filterType !== 'ALL') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Arama filtresi
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => (
        item.orderNumber.toLowerCase().includes(query) ||
        item.userEmail.toLowerCase().includes(query) ||
        item.userName.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      ));
    }

    setFilteredReturns(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleViewDetails = (returnItem: ReturnRequest) => {
    setSelectedReturn(returnItem);
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = async (newStatus: 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'COMPLETED') => {
    if (!selectedReturn) return;
    
    try {
      await axios.put(`/api/dashboard/customers/returns/${selectedReturn.id}/status`, { 
        status: newStatus 
      });
      
      toast({
        title: "Durum güncellendi",
        description: "İade talebi durumu başarıyla güncellendi.",
      });
      
      // Listeyi güncelle
      fetchReturns();
      
      // Modal'ı kapat
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating return status:', error);
      toast({
        title: "Hata",
        description: "Durum güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Bekliyor</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Onaylandı</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Reddedildi</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">İade Edildi</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Tamamlandı</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RETURN':
        return <Badge variant="secondary">İade</Badge>;
      case 'CANCEL':
        return <Badge variant="destructive">İptal</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const canApprove = (status: string) => status === 'PENDING';
  const canReject = (status: string) => status === 'PENDING';
  const canRefund = (status: string) => status === 'APPROVED';
  const canComplete = (status: string) => status === 'REFUNDED';

  return (
    <DashboardLayout>
      <Head>
        <title>İade Talepleri | Yönetim Paneli</title>
      </Head>
      
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">İade Talepleri</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <form onSubmit={handleSearch}>
              <Input
                placeholder="Sipariş no, email veya açıklama ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </form>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Durum filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Durumlar</SelectItem>
              <SelectItem value="PENDING">Bekliyor</SelectItem>
              <SelectItem value="APPROVED">Onaylandı</SelectItem>
              <SelectItem value="REJECTED">Reddedildi</SelectItem>
              <SelectItem value="REFUNDED">İade Edildi</SelectItem>
              <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tip filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Tipler</SelectItem>
              <SelectItem value="RETURN">İade</SelectItem>
              <SelectItem value="CANCEL">İptal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReturns}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 text-red-500">
            {error}
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64">
            <RotateCcw className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Hiç iade talebi bulunamadı</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talep No</TableHead>
                  <TableHead>Sipariş</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Ürünler</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>#{item.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>#{item.orderNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.userName}</span>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Mail className="h-3 w-3" />
                          <span>{item.userEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.items.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{item.items[0].quantity}x</span>
                            <span className="truncate max-w-[150px]">{item.items[0].productName}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* İade detay modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>İade Talebi Detayları</DialogTitle>
            <DialogDescription>
              İade talebinin detaylarını görüntüleyin ve işlem yapın.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReturn && (
            <>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Talep No:</span>
                  <span>#{selectedReturn.id}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Durum:</span>
                  {getStatusBadge(selectedReturn.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tip:</span>
                  {getTypeBadge(selectedReturn.type)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Sipariş No:</span>
                  <span>#{selectedReturn.orderNumber}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Müşteri:</span>
                  <span>{selectedReturn.userName}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">E-posta:</span>
                  <span>{selectedReturn.userEmail}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Talep Tarihi:</span>
                  <span>{formatDate(selectedReturn.createdAt)}</span>
                </div>
                
                {selectedReturn.refundDate && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">İade Tarihi:</span>
                    <span>{formatDate(selectedReturn.refundDate)}</span>
                  </div>
                )}
                
                {selectedReturn.refundAmount && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">İade Tutarı:</span>
                    <span>
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedReturn.refundAmount)}
                    </span>
                  </div>
                )}
                
                {selectedReturn.refundMethod && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">İade Yöntemi:</span>
                    <span>{selectedReturn.refundMethod}</span>
                  </div>
                )}
                
                <div>
                  <span className="font-medium">İade Nedeni:</span>
                  <p className="mt-1 p-3 bg-muted rounded-md">{selectedReturn.reason}</p>
                </div>
                
                {selectedReturn.description && (
                  <div>
                    <span className="font-medium">Açıklama:</span>
                    <p className="mt-1 p-3 bg-muted rounded-md">{selectedReturn.description}</p>
                  </div>
                )}
                
                <div>
                  <span className="font-medium">İade Edilen Ürünler:</span>
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      {selectedReturn.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            {item.productImage && (
                              <img 
                                src={item.productImage} 
                                alt={item.productName} 
                                className="w-10 h-10 object-cover rounded-md"
                              />
                            )}
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} adet x {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price)}
                              </p>
                            </div>
                          </div>
                          <p className="font-medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.quantity * item.price)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <DialogFooter className="flex flex-wrap gap-2">
                {canApprove(selectedReturn.status) && (
                  <Button 
                    variant="default" 
                    onClick={() => handleUpdateStatus('APPROVED')}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Onayla
                  </Button>
                )}
                {canReject(selectedReturn.status) && (
                  <Button 
                    variant="destructive"
                    onClick={() => handleUpdateStatus('REJECTED')}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reddet
                  </Button>
                )}
                {canRefund(selectedReturn.status) && (
                  <Button 
                    variant="default"
                    onClick={() => handleUpdateStatus('REFUNDED')}
                    className="flex items-center gap-1"
                  >
                    <BanknoteIcon className="h-4 w-4 mr-1" />
                    Ödeme İade Et
                  </Button>
                )}
                {canComplete(selectedReturn.status) && (
                  <Button 
                    variant="outline"
                    onClick={() => handleUpdateStatus('COMPLETED')}
                    className="flex items-center gap-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Tamamla
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 