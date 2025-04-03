import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { Package, MapPin, CreditCard, Heart, Settings, Star, RefreshCw, Gift } from 'lucide-react';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  image: string;
  avatarUrl: string;
  phone: string;
  birthDate: string | null;
  gender: string | null;
  createdAt: string;
  _count: {
    orders: number;
    reviews: number;
    addresses: number;
  };
  recentOrders: Order[];
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  orderItems: OrderItem[];
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    name: string;
    slug: string;
    imageUrls: string[];
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/profile');
      console.log('API Profile Response:', response.data);
      console.log('Recent orders status values:', response.data.recentOrders?.map((order: any) => order.status));
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        description: 'Profil bilgileri yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusColor = (status: string) => {
    const upperStatus = status.toUpperCase();
    
    switch (upperStatus) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderStatusText = (status: string) => {
    const upperStatus = status.toUpperCase();
    
    switch (upperStatus) {
      case 'PENDING':
        return 'Beklemede';
      case 'PROCESSING':
        return 'İşleniyor';
      case 'SHIPPED':
        return 'Kargoya Verildi';
      case 'DELIVERED':
        return 'Teslim Edildi';
      case 'CANCELED':
      case 'CANCELLED':
        return 'İptal Edildi';
      case 'REFUNDED':
        return 'İade Edildi';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-[100px] rounded-xl" />
            <Skeleton className="h-[100px] rounded-xl" />
            <Skeleton className="h-[100px] rounded-xl" />
            <Skeleton className="h-[100px] rounded-xl" />
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
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
        {/* Profil Başlığı */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.image || profile?.avatarUrl || ''} alt={profile?.name} />
            <AvatarFallback>{profile?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name || `${profile?.firstName} ${profile?.lastName}`}</h1>
            <p className="text-gray-500">{profile?.email}</p>
          </div>
        </div>

        {/* Profil Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/profile/orders" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Siparişlerim</p>
                  <p className="text-2xl font-bold">{profile?._count?.orders || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile/addresses" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Adreslerim</p>
                  <p className="text-2xl font-bold">{profile?._count?.addresses || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile/favorites" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Favorilerim</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile/reviews" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Değerlendirmelerim</p>
                  <p className="text-2xl font-bold">{profile?._count?.reviews || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Son Siparişler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son Siparişlerim</CardTitle>
              <CardDescription>Son 5 siparişiniz burada görüntülenir</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/orders">Tümünü Görüntüle</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {profile?.recentOrders && profile.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {profile.recentOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Sipariş #{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(order.createdAt), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center mt-2 md:mt-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                        <span className="ml-4 font-medium">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2 bg-gray-50 rounded p-2">
                          <div className="h-10 w-10 rounded bg-gray-200 overflow-hidden">
                            {item.product.imageUrls && item.product.imageUrls.length > 0 ? (
                              <img 
                                src={item.product.imageUrls[0]} 
                                alt={item.product.name} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-200">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.product.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity} adet</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/profile/orders/${order.id}`}>Detayları Görüntüle</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Henüz siparişiniz bulunmuyor</h3>
                <p className="text-gray-500 mb-4">Alışveriş yapmak için mağazamızı ziyaret edin</p>
                <Button asChild>
                  <Link href="/products">Alışverişe Başla</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hızlı Erişim Linkleri */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/profile/settings" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-gray-100 p-3 rounded-full">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Hesap Ayarları</p>
                  <p className="text-sm text-gray-500">Profil bilgilerinizi düzenleyin</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile/returns" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-gray-100 p-3 rounded-full">
                  <RefreshCw className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">İade Taleplerim</p>
                  <p className="text-sm text-gray-500">İade ve iptal işlemleriniz</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile/coupons" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-gray-100 p-3 rounded-full">
                  <Gift className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Kuponlarım</p>
                  <p className="text-sm text-gray-500">Kupon ve hediye kartlarınız</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/help" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-gray-100 p-3 rounded-full">
                  <CreditCard className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Yardım Merkezi</p>
                  <p className="text-sm text-gray-500">Sorularınız için destek alın</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
} 