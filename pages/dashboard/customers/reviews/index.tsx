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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Search, Mail, RefreshCw, Eye, Star, Check, X, Trash2, ThumbsUp, Flag } from 'lucide-react';

interface Review {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string;
  userId: number;
  userEmail: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  helpfulCount: number;
  reportCount: number;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  orderId?: number;
  orderNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    if (reviews.length > 0) {
      applyFilters();
    }
  }, [searchQuery, filterStatus, filterRating, reviews]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/customers/reviews');
      setReviews(response.data);
      setError(null);
    } catch (err) {
      setError('Değerlendirmeler yüklenirken bir hata oluştu.');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reviews];

    // Durum filtresi
    if (filterStatus !== 'all') {
      filtered = filtered.filter(review => review.status === filterStatus);
    }

    // Puan filtresi
    if (filterRating !== 'all') {
      const rating = parseInt(filterRating);
      filtered = filtered.filter(review => review.rating === rating);
    }

    // Arama filtresi
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review => (
        review.productName.toLowerCase().includes(query) ||
        review.userEmail.toLowerCase().includes(query) ||
        review.userName.toLowerCase().includes(query) ||
        (review.title && review.title.toLowerCase().includes(query)) ||
        review.comment.toLowerCase().includes(query)
      ));
    }

    setFilteredReviews(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
    if (!selectedReview) return;
    
    try {
      await axios.put(`/api/dashboard/customers/reviews/${selectedReview.id}/status`, { 
        status: newStatus 
      });
      
      toast({
        title: "Durum güncellendi",
        description: "Değerlendirme durumu başarıyla güncellendi.",
      });
      
      // Listeyi güncelle
      fetchReviews();
      
      // Modal'ı kapat
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating review status:', error);
      toast({
        title: "Hata",
        description: "Durum güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/dashboard/customers/reviews/${id}`);
      
      toast({
        title: "Değerlendirme silindi",
        description: "Değerlendirme başarıyla silindi.",
      });
      
      // Listeyi güncelle
      fetchReviews();
      
      // Modal'ı kapat
      setIsDeleteDialogOpen(false);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Hata",
        description: "Değerlendirme silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Bekliyor</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Onaylandı</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Reddedildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: tr });
  };

  const getRatingStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ));
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Ürün Değerlendirmeleri | Yönetim Paneli</title>
      </Head>
      
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Ürün Değerlendirmeleri</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <form onSubmit={handleSearch}>
              <Input
                placeholder="Ürün, yorum veya kullanıcı ara..."
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
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="pending">Bekliyor</SelectItem>
              <SelectItem value="approved">Onaylandı</SelectItem>
              <SelectItem value="rejected">Reddedildi</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Puan filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Puanlar</SelectItem>
              <SelectItem value="5">5 Yıldız</SelectItem>
              <SelectItem value="4">4 Yıldız</SelectItem>
              <SelectItem value="3">3 Yıldız</SelectItem>
              <SelectItem value="2">2 Yıldız</SelectItem>
              <SelectItem value="1">1 Yıldız</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReviews}>
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
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64">
            <Star className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Hiç değerlendirme bulunamadı</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Puan</TableHead>
                  <TableHead>Değerlendirme</TableHead>
                  <TableHead>Etkileşim</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {review.productImage && (
                          <img 
                            src={review.productImage} 
                            alt={review.productName} 
                            className="w-10 h-10 object-cover rounded-md"
                          />
                        )}
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{review.productName}</p>
                          {review.isVerifiedPurchase && (
                            <Badge variant="secondary" className="text-xs mt-1">Onaylı Alışveriş</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{review.userName}</span>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Mail className="h-3 w-3" />
                          <span>{review.userEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex">
                        {getRatingStars(review.rating)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {review.title && (
                          <p className="font-medium">{review.title}</p>
                        )}
                        <p className="text-sm truncate max-w-[200px]">{review.comment}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4 text-green-500" />
                          <span>{review.helpfulCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Flag className="h-4 w-4 text-red-500" />
                          <span>{review.reportCount}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(review.createdAt)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(review.status)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(review)}>
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
      
      {/* Değerlendirme detay modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Değerlendirme Detayları</DialogTitle>
            <DialogDescription>
              Müşteri değerlendirmesinin detaylarını görüntüleyin ve işlem yapın.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <>
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-4">
                  {selectedReview.productImage && (
                    <img 
                      src={selectedReview.productImage} 
                      alt={selectedReview.productName} 
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  )}
                  <div>
                    <h3 className="font-medium text-lg">{selectedReview.productName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedReview.isVerifiedPurchase ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-500" />
                          Onaylı Alışveriş
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <X className="h-3 w-3 text-red-500" />
                          Doğrulanmamış Alışveriş
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-medium">Puan:</span>
                    <div className="flex">
                      {getRatingStars(selectedReview.rating)}
                    </div>
                  </div>
                  
                  {selectedReview.title && (
                    <div className="mb-4">
                      <span className="font-medium">Başlık:</span>
                      <p className="mt-1">{selectedReview.title}</p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <span className="font-medium">Değerlendirme:</span>
                    <Textarea 
                      className="mt-1" 
                      value={selectedReview.comment} 
                      readOnly 
                      rows={4}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-2">
                  <div className="mb-4">
                    <span className="font-medium">Kullanıcı:</span>
                    <p className="mt-1">{selectedReview.userName}</p>
                  </div>
                  
                  <div className="mb-4">
                    <span className="font-medium">E-posta:</span>
                    <p className="mt-1">{selectedReview.userEmail}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Etkileşimler:</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        <span>{selectedReview.helpfulCount} faydalı</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flag className="h-4 w-4 text-red-500" />
                        <span>{selectedReview.reportCount} şikayet</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Oluşturulma Tarihi:</span>
                    <span>{formatDate(selectedReview.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Güncellenme Tarihi:</span>
                    <span>{formatDate(selectedReview.updatedAt)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Durum:</span>
                    {getStatusBadge(selectedReview.status)}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex flex-wrap gap-2">
                {selectedReview.status === 'pending' && (
                  <>
                    <Button 
                      variant="default" 
                      onClick={() => handleUpdateStatus('approved')}
                      className="flex items-center gap-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Onayla
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleUpdateStatus('rejected')}
                      className="flex items-center gap-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reddet
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Sil
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Silme onay modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Değerlendirmeyi Sil</DialogTitle>
            <DialogDescription>
              Bu değerlendirmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => selectedReview && handleDelete(selectedReview.id)}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 