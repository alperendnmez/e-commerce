import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import CustomPagination from '@/components/CustomPagination';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { Star, Edit, Trash2, Search, ShoppingBag } from 'lucide-react';

interface Review {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  isVerifiedPurchase: boolean;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReviews();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/user/reviews?page=${page}&limit=10`);
      setReviews(response.data.reviews || []);
      setPagination(response.data.pagination || {
        total: 0,
        page: 1,
        limit: 10,
        pages: 0
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        description: 'Değerlendirmeler yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Gerçek API'de arama özelliği eklenebilir
    toast({
      description: 'Arama özelliği henüz aktif değil.',
    });
  };

  const handlePageChange = (page: number) => {
    fetchReviews(page);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setFormData({
      rating: review.rating,
      title: review.title,
      comment: review.comment
    });
    setDialogOpen(true);
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`/api/user/reviews?id=${id}`);
      setReviews(prev => prev.filter(review => review.id !== id));
      toast({
        description: 'Değerlendirme başarıyla silindi.',
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        description: 'Değerlendirme silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    if (!formData.comment.trim()) {
      toast({
        description: 'Lütfen bir yorum yazın.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await axios.put('/api/user/reviews', {
        id: editingReview.id,
        rating: formData.rating,
        title: formData.title,
        comment: formData.comment
      });
      
      setReviews(prev => prev.map(review => 
        review.id === editingReview.id ? response.data : review
      ));
      
      setDialogOpen(false);
      toast({
        description: 'Değerlendirme başarıyla güncellendi.',
      });
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        description: 'Değerlendirme güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
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
          <h1 className="text-2xl font-bold">Değerlendirmelerim</h1>
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Değerlendirmelerde ara..."
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

        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => (
              <Card key={review.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/4 p-4 bg-gray-50 flex flex-row md:flex-col items-center md:items-start">
                    <div className="h-16 w-16 rounded bg-gray-100 overflow-hidden mr-4 md:mr-0 md:mb-4">
                      {review.productImage && (
                        <img
                          src={review.productImage}
                          alt={review.productName}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <Link href={`/products/${review.productSlug}`}>
                        <h3 className="font-medium hover:text-primary transition-colors line-clamp-2">
                          {review.productName}
                        </h3>
                      </Link>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(review.createdAt), 'dd.MM.yyyy')}
                      </p>
                      {review.isVerifiedPurchase && (
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <ShoppingBag className="h-3 w-3 mr-1" />
                          Doğrulanmış Satın Alma
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        {review.title && <h4 className="font-medium mb-2">{review.title}</h4>}
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditReview(review)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
              <Star className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Henüz değerlendirmeniz bulunmamaktadır</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Satın aldığınız ürünleri değerlendirerek diğer kullanıcılara yardımcı olabilirsiniz.
            </p>
            <Button onClick={() => router.push('/')}>Alışverişe Başla</Button>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Değerlendirmeyi Düzenle</DialogTitle>
              <DialogDescription>
                {editingReview?.productName} ürünü için değerlendirmenizi güncelleyin.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= formData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  id="title"
                  name="title"
                  placeholder="Başlık (isteğe bağlı)"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="Yorumunuz"
                  value={formData.comment}
                  onChange={handleInputChange}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateReview}>
                Güncelle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  );
} 