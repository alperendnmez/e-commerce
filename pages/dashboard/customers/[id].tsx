import React, { ReactElement, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from '@/lib/axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Package,
  CreditCard,
  Heart,
  MapPin,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Star,
  Activity
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Müşteri tipi
interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  newsletter: boolean;
  role: 'USER' | 'ADMIN' | 'EDITOR';
  orderCount: number;
  totalSpent: number;
}

// Adres tipi
interface Address {
  id: number;
  userId: number;
  title: string;
  firstName: string;
  lastName: string;
  street: string;
  district?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  isDefaultBilling: boolean;
}

// Sipariş tipi
interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
}

// Sipariş ürün tipi
interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

// Favori ürün tipi
interface Favorite {
  id: string;
  productId: number;
  addedAt: string;
  product: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    price: number;
    brand?: string;
    category?: string;
    inStock: boolean;
  };
}

// Değerlendirme tipi
interface Review {
  id: number;
  productId: number;
  rating: number;
  title: string;
  comment: string;
  status: string;
  createdAt: string;
  product: {
    name: string;
    slug: string;
    imageUrl: string | null;
    brand?: string;
    category?: string;
  };
}

// Aktivite tipi
interface Activity {
  type: string;
  description: string;
  date: string;
  orderId?: number;
  orderNumber?: string;
  status?: string;
  addressId?: number;
  addressTitle?: string;
  ipAddress?: string;
}

function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Müşteri bilgilerini getir
      const customerResponse = await axios.get(`/api/dashboard/customers/${id}`);
      setCustomer(customerResponse.data);
      
      // Müşterinin adreslerini getir
      const addressesResponse = await axios.get(`/api/dashboard/customers/${id}/addresses`);
      setAddresses(addressesResponse.data);
      
      // Müşterinin siparişlerini getir
      const ordersResponse = await axios.get(`/api/dashboard/customers/${id}/orders`);
      setOrders(ordersResponse.data);
      
      // Müşterinin favorilerini getir
      try {
        const favoritesResponse = await axios.get(`/api/dashboard/customers/${id}/favorites`);
        setFavorites(favoritesResponse.data);
      } catch (err) {
        console.error('Favoriler getirilirken hata:', err);
        setFavorites([]);
      }
      
      // Müşterinin değerlendirmelerini getir
      try {
        const reviewsResponse = await axios.get(`/api/dashboard/customers/${id}/reviews`);
        setReviews(reviewsResponse.data);
      } catch (err) {
        console.error('Değerlendirmeler getirilirken hata:', err);
        setReviews([]);
      }
      
      // Müşterinin aktivite geçmişini getir
      try {
        const activitiesResponse = await axios.get(`/api/dashboard/customers/${id}/activity`);
        setActivities(activitiesResponse.data);
      } catch (err) {
        console.error('Aktivite geçmişi getirilirken hata:', err);
        setActivities([]);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Müşteri bilgileri getirilirken hata:', err);
      setError('Müşteri bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleDelete = async () => {
    if (!customer) return;
    
    if (!confirm(`"${customer.firstName} ${customer.lastName}" müşterisini silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`/api/dashboard/customers/${customer.id}`);
      
      toast({
        title: 'Başarılı!',
        description: 'Müşteri başarıyla silindi.',
      });
      
      router.push('/dashboard/customers');
    } catch (err: any) {
      console.error('Müşteri silinirken hata:', err);
      toast({
        title: 'Hata!',
        description: err.response?.data?.message || 'Müşteri silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>
          {error || 'Müşteri bulunamadı.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="mr-2 h-4 w-4" /> Müşteriler
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{customer.firstName} {customer.lastName}</h1>
          <Badge 
            variant={
              customer.role === 'ADMIN' 
                ? 'destructive' 
                : (customer.role === 'EDITOR' ? 'outline' : 'secondary')
            }
          >
            {customer.role === 'USER' ? 'Müşteri' : (customer.role === 'ADMIN' ? 'Yönetici' : 'Editör')}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCustomerData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Yenile
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/customers/edit/${customer.id}`}>
              <Edit className="mr-2 h-4 w-4" /> Düzenle
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Sil
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="orders">Siparişler</TabsTrigger>
          <TabsTrigger value="addresses">Adresler</TabsTrigger>
          <TabsTrigger value="wishlists">Favoriler</TabsTrigger>
          <TabsTrigger value="reviews">Değerlendirmeler</TabsTrigger>
          <TabsTrigger value="activity">Aktivite</TabsTrigger>
        </TabsList>

        {/* Genel Bakış Sekmesi */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Bilgileri</CardTitle>
                <CardDescription>Kullanıcı hesap detayları ve kişisel bilgileri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={customer.avatarUrl} />
                    <AvatarFallback className="text-lg">{getInitials(customer.firstName, customer.lastName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{customer.firstName} {customer.lastName}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-1 h-4 w-4" />
                      {customer.email}
                    </div>
                    {customer.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-1 h-4 w-4" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</p>
                    <p className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {format(new Date(customer.createdAt), 'PPP', { locale: tr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Son Giriş</p>
                    <p className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {customer.lastLogin 
                        ? format(new Date(customer.lastLogin), 'PPP', { locale: tr }) 
                        : '-'
                      }
                    </p>
                  </div>
                  {customer.birthDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Doğum Tarihi</p>
                      <p className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        {format(new Date(customer.birthDate), 'PPP', { locale: tr })}
                      </p>
                    </div>
                  )}
                  {customer.gender && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cinsiyet</p>
                      <p className="flex items-center">
                        <User className="mr-1 h-4 w-4" />
                        {customer.gender === 'MALE' ? 'Erkek' : (customer.gender === 'FEMALE' ? 'Kadın' : 'Belirtilmedi')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">E-bülten</p>
                    <p className="flex items-center">
                      <Mail className="mr-1 h-4 w-4" />
                      {customer.newsletter ? 'Abone' : 'Abone değil'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kullanıcı Rolü</p>
                    <Badge 
                      variant={
                        customer.role === 'ADMIN' 
                          ? 'destructive' 
                          : (customer.role === 'EDITOR' ? 'outline' : 'secondary')
                      }
                    >
                      {customer.role === 'USER' ? 'Müşteri' : (customer.role === 'ADMIN' ? 'Yönetici' : 'Editör')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Alışveriş İstatistikleri</CardTitle>
                <CardDescription>Müşterinin alışveriş davranışları ve satın alma geçmişi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Sipariş</p>
                    <p className="text-2xl font-bold flex items-center">
                      <Package className="mr-2 h-5 w-5 text-primary" />
                      {customer.orderCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Harcama</p>
                    <p className="text-2xl font-bold flex items-center">
                      <CreditCard className="mr-2 h-5 w-5 text-primary" />
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(customer.totalSpent)}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Son Siparişler</h3>
                  {orders.length > 0 ? (
                    <div className="space-y-2">
                      {orders.slice(0, 3).map((order) => (
                        <Card key={order.id}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">#{order.orderNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(order.createdAt), 'PPP', { locale: tr })}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge>{order.status}</Badge>
                                <p className="font-medium text-sm mt-1">
                                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Henüz sipariş bulunmuyor.</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Adresler</h3>
                  {addresses.length > 0 ? (
                    <div className="space-y-2">
                      {addresses.slice(0, 2).map((address) => (
                        <Card key={address.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">{address.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {address.street}, {address.district && `${address.district},`} {address.city}/{address.state} {address.zipCode}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Henüz adres bulunmuyor.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Siparişler Sekmesi */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Siparişler</CardTitle>
              <CardDescription>
                Müşterinin tüm sipariş geçmişi ve durumları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sipariş No</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Ürünler</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                        <TableCell>{format(new Date(order.createdAt), 'PPP', { locale: tr })}</TableCell>
                        <TableCell>
                          <Badge>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {order.items.length > 0 ? (
                            <div className="flex flex-col space-y-1">
                              {order.items.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex items-center">
                                  <span className="font-medium text-xs">{item.quantity}x</span>
                                  <span className="ml-1 text-sm truncate max-w-[200px]">{item.productName}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{order.items.length - 2} daha fazla ürün</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Ürün bilgisi yok</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Henüz sipariş yok</h3>
                  <p className="text-muted-foreground">Bu müşteri henüz hiç sipariş vermemiş.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adresler Sekmesi */}
        <TabsContent value="addresses">
          <Card>
            <CardHeader>
              <CardTitle>Adresler</CardTitle>
              <CardDescription>
                Müşterinin kayıtlı teslimat ve fatura adresleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {addresses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {addresses.map((address) => (
                    <Card key={address.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-lg flex items-center">
                            {address.title}
                            {address.isDefault && (
                              <Badge variant="secondary" className="ml-2">Varsayılan Teslimat</Badge>
                            )}
                            {address.isDefaultBilling && (
                              <Badge variant="outline" className="ml-2">Varsayılan Fatura</Badge>
                            )}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">{address.firstName} {address.lastName}</span></p>
                          <p>{address.street}</p>
                          {address.district && <p>{address.district}</p>}
                          <p>{address.city}, {address.state} {address.zipCode}</p>
                          <p>{address.country}</p>
                          <p className="pt-1">{address.phone}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Henüz adres yok</h3>
                  <p className="text-muted-foreground">Bu müşteri henüz adres kaydetmemiş.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favoriler Sekmesi */}
        <TabsContent value="wishlists">
          <Card>
            <CardHeader>
              <CardTitle>Favoriler</CardTitle>
              <CardDescription>
                Müşterinin favori ürünleri ve istek listesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {favorites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Stok Durumu</TableHead>
                      <TableHead>Eklenme Tarihi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {favorites.map((favorite) => (
                      <TableRow key={favorite.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {favorite.product.imageUrl ? (
                              <img 
                                src={favorite.product.imageUrl} 
                                alt={favorite.product.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{favorite.product.name}</p>
                              {favorite.product.brand && (
                                <p className="text-xs text-muted-foreground">{favorite.product.brand}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{favorite.product.category || '-'}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(favorite.product.price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={favorite.product.inStock ? 'default' : 'destructive'}>
                            {favorite.product.inStock ? 'Stokta var' : 'Stokta yok'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(favorite.addedAt), 'PPP', { locale: tr })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Favori ürün bulunamadı</h3>
                  <p className="text-muted-foreground">Bu müşteri henüz bir ürünü favorilere eklememiş.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Değerlendirmeler</CardTitle>
              <CardDescription>
                Müşterinin ürün değerlendirmeleri ve yorumları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {review.product.imageUrl ? (
                            <img 
                              src={review.product.imageUrl} 
                              alt={review.product.name}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">{review.product.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {review.product.category} • {review.product.brand}
                                </p>
                              </div>
                              <Badge variant={review.status === 'Onaylandı' ? 'default' : 'outline'}>
                                {review.status}
                              </Badge>
                            </div>
                            
                            <div className="mt-2">
                              <div className="flex items-center mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                                <span className="ml-2 text-sm font-medium text-muted-foreground">
                                  {format(new Date(review.createdAt), 'PPP', { locale: tr })}
                                </span>
                              </div>
                              
                              {review.title && <p className="font-medium text-sm">{review.title}</p>}
                              <p className="text-sm mt-1">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Değerlendirme bulunamadı</h3>
                  <p className="text-muted-foreground">Bu müşteri henüz bir ürün değerlendirmesi yapmamış.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Aktivite Geçmişi</CardTitle>
              <CardDescription>
                Müşterinin son aktiviteleri ve sistem logları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-1">
                  {activities.map((activity, index) => (
                    <div 
                      key={`${activity.type}-${index}`} 
                      className="flex py-3 border-b border-border last:border-0"
                    >
                      <div className="mr-4">
                        {activity.type === 'ORDER' && (
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        {activity.type === 'LOGIN' && (
                          <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                        )}
                        {activity.type === 'ADDRESS' && (
                          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        {activity.type === 'PROFILE_UPDATE' && (
                          <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                            <Edit className="h-5 w-5 text-amber-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(activity.date), 'PPP', { locale: tr })}
                          </p>
                        </div>
                        {activity.type === 'ORDER' && activity.orderNumber && (
                          <p className="text-sm text-muted-foreground">
                            Sipariş No: #{activity.orderNumber} • Durum: {activity.status}
                          </p>
                        )}
                        {activity.type === 'LOGIN' && activity.ipAddress && (
                          <p className="text-sm text-muted-foreground">
                            IP: {activity.ipAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Aktivite geçmişi bulunamadı</h3>
                  <p className="text-muted-foreground">Bu müşteri için aktivite kaydı bulunmuyor.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

CustomerDetail.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default CustomerDetail; 