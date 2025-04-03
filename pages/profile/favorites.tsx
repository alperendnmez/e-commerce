import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { Heart, Search, ShoppingCart, Trash2, ShoppingBag } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  discountedPrice?: number;
  image: string;
  rating: number;
  inStock: boolean;
}

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFavorites, setFilteredFavorites] = useState<Product[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFavorites();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  useEffect(() => {
    if (favorites.length > 0) {
      const filtered = favorites.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFavorites(filtered);
    }
  }, [searchQuery, favorites]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/favorites');
      setFavorites(response.data.favorites || []);
      setFilteredFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        description: 'Favoriler yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: number) => {
    try {
      await axios.delete(`/api/user/favorites?productId=${productId}`);
      setFavorites(prev => prev.filter(product => product.id !== productId));
      toast({
        description: 'Ürün favorilerden kaldırıldı.',
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        description: 'Ürün favorilerden kaldırılırken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = favorites.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredFavorites(filtered);
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-[300px] rounded-xl" />
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
          <h1 className="text-2xl font-bold">Favorilerim</h1>
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Favori ürünlerde ara..."
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

        {filteredFavorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFavorites.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => handleRemoveFavorite(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      {product.discountedPrice ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{product.discountedPrice.toFixed(2)} TL</span>
                          <span className="text-sm text-gray-500 line-through">{product.price.toFixed(2)} TL</span>
                        </div>
                      ) : (
                        <span className="font-bold">{product.price.toFixed(2)} TL</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${i < Math.round(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/products/${product.slug}`)}
                  >
                    Detaylar
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!product.inStock}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.inStock ? 'Sepete Ekle' : 'Stokta Yok'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Heart className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Henüz favori ürününüz bulunmamaktadır</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Beğendiğiniz ürünleri favorilerinize ekleyerek daha sonra kolayca bulabilirsiniz.
            </p>
            <Button onClick={() => router.push('/')}>Alışverişe Başla</Button>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
} 