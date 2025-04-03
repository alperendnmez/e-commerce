import { ReactElement, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { NextPageWithLayout } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Gift, Copy, Check, AlertCircle, Plus, Clock, CreditCard } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Coupon {
  id: number;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  description: string;
  expiryDate: string;
  isUsed: boolean;
  isExpired: boolean;
  categories: string[];
  products: string[];
}

interface GiftCard {
  id: number;
  code: string;
  balance: number;
  originalBalance: number;
  expiryDate: string;
  isActive: boolean;
  isExpired: boolean;
  lastUsed: string | null;
}

interface CouponItem extends Coupon {
  itemType: 'coupon';
}

interface GiftCardItem extends GiftCard {
  itemType: 'giftCard';
}

type FilteredItem = CouponItem | GiftCardItem;

const CouponsPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('coupons');
  const [newCode, setNewCode] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [addingCode, setAddingCode] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCouponsAndGiftCards();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  const fetchCouponsAndGiftCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/coupons');
      setCoupons(response.data.coupons);
      setGiftCards(response.data.giftCards);
    } catch (error) {
      console.error('Error fetching coupons and gift cards:', error);
      toast({
        description: 'Kuponlar ve hediye kartları yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCode.trim()) {
      toast({
        description: "Lütfen bir kod girin",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAddingCode(true);
      const response = await axios.post('/api/user/coupons', { code: newCode });
      
      if (response.data.type === 'coupon') {
        setCoupons(prev => [...prev, response.data.coupon]);
        toast({
          description: "Kupon başarıyla eklendi",
        });
      } else {
        setGiftCards(prev => [...prev, response.data.giftCard]);
        toast({
          description: "Hediye kartı başarıyla eklendi",
        });
      }
      
      setNewCode('');
    } catch (error: any) {
      console.error('Error adding code:', error);
      toast({
        description: error.response?.data?.error || "Kod eklenirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setAddingCode(false);
    }
  };

  const handleCopyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      description: 'Kod panoya kopyalandı.',
    });
  };

  const formatCouponValue = (coupon: Coupon) => {
    if (coupon.type === 'PERCENTAGE') {
      return `%${coupon.value}`;
    } else {
      return `${coupon.value.toFixed(2)} TL`;
    }
  };

  const filteredItems = (): FilteredItem[] => {
    const allCoupons: CouponItem[] = coupons.map(c => ({ ...c, itemType: 'coupon' }));
    const allGiftCards: GiftCardItem[] = giftCards.map(g => ({ ...g, itemType: 'giftCard' }));
    const allItems: FilteredItem[] = [...allCoupons, ...allGiftCards];
    
    if (activeTab === 'all') {
      return allItems;
    } else if (activeTab === 'coupons') {
      return allItems.filter(item => item.itemType === 'coupon');
    } else if (activeTab === 'giftCards') {
      return allItems.filter(item => item.itemType === 'giftCard');
    } else if (activeTab === 'active') {
      return allItems.filter(item => 
        (item.itemType === 'coupon' && !item.isUsed && !item.isExpired) || 
        (item.itemType === 'giftCard' && item.isActive && !item.isExpired && item.balance > 0)
      );
    } else if (activeTab === 'used') {
      return allItems.filter(item => 
        (item.itemType === 'coupon' && item.isUsed) || 
        (item.itemType === 'giftCard' && (!item.isActive || item.balance === 0))
      );
    } else if (activeTab === 'expired') {
      return allItems.filter(item => item.isExpired);
    }
    
    return allItems;
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isExpiringSoon = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  const getExpiryText = (dateString: string, isExpired: boolean) => {
    if (isExpired) {
      return `${formatExpiryDate(dateString)} tarihinde sona erdi`;
    } else if (isExpiringSoon(dateString)) {
      const expiryDate = new Date(dateString);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} gün içinde sona erecek`;
    } else {
      return `Son kullanma: ${formatExpiryDate(dateString)}`;
    }
  };

  const getCouponStatusColor = (coupon: Coupon) => {
    if (coupon.isExpired) return 'bg-red-100 text-red-800';
    if (coupon.isUsed) return 'bg-gray-100 text-gray-800';
    return 'bg-green-100 text-green-800';
  };

  const getCouponStatusText = (coupon: Coupon) => {
    if (coupon.isExpired) return 'Süresi Dolmuş';
    if (coupon.isUsed) return 'Kullanıldı';
    return 'Aktif';
  };

  const getGiftCardStatusColor = (giftCard: GiftCard) => {
    if (giftCard.isExpired) return 'bg-red-100 text-red-800';
    if (!giftCard.isActive) return 'bg-gray-100 text-gray-800';
    return 'bg-green-100 text-green-800';
  };

  const getGiftCardStatusText = (giftCard: GiftCard) => {
    if (giftCard.isExpired) return 'Süresi Dolmuş';
    if (!giftCard.isActive) return 'Kullanıldı';
    return 'Aktif';
  };

  if (status === 'loading') {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[150px] rounded-xl" />
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
    <>
      <Head>
        <title>Kuponlarım ve Hediye Kartlarım | E-Ticaret</title>
      </Head>
      
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Kuponlarım ve Hediye Kartlarım</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Kod Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Kupon veya Hediye Kartı Ekle</DialogTitle>
                <DialogDescription>
                  Kupon kodunuzu veya hediye kartı kodunuzu girin.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="code" className="block text-sm font-medium mb-2">Kod</Label>
                <Input
                  id="code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Kupon veya hediye kartı kodunu girin"
                  className="uppercase"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleAddCode} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      İşleniyor...
                    </span>
                  ) : (
                    'Ekle'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="coupons" className="w-full mb-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coupons">Kuponlar</TabsTrigger>
            <TabsTrigger value="giftcards">Hediye Kartları</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {loading ? (
          <div className="text-center py-8">
            <p>Kuponlar ve hediye kartları yükleniyor...</p>
          </div>
        ) : filteredItems().length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems().map((item) => (
              <Card 
                key={`${item.itemType}-${item.id}`} 
                className={`overflow-hidden ${
                  item.isExpired ? 'opacity-70' : 
                  (item.itemType === 'coupon' && item.isUsed) || 
                  (item.itemType === 'giftCard' && (!item.isActive || item.balance === 0)) 
                    ? 'opacity-80' : ''
                }`}
              >
                {item.itemType === 'coupon' ? (
                  // Kupon kartı
                  <>
                    <div className="bg-primary/10 p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <Ticket className="h-5 w-5 text-primary mr-2" />
                          <CardTitle className="text-base">Kupon</CardTitle>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCouponStatusColor(item as Coupon)}`}>
                            {getCouponStatusText(item as Coupon)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <div>
                          <p className="text-2xl font-bold">
                            {formatCouponValue(item as Coupon)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.type === 'percentage' ? 'İndirim' : 'İndirim Tutarı'}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <p className="font-mono text-sm font-medium mr-2">{item.code}</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleCopyCode(item.id, item.code)}
                            disabled={item.isUsed || item.isExpired}
                          >
                            {copiedCode === item.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2 text-sm">
                        {item.minOrderAmount > 0 && (
                          <p>Minimum sipariş tutarı: <span className="font-medium">{item.minOrderAmount.toFixed(2)} TL</span></p>
                        )}
                        {item.maxDiscount > 0 && (
                          <p>Maksimum indirim tutarı: <span className="font-medium">{item.maxDiscount.toFixed(2)} TL</span></p>
                        )}
                        {item.categories.length > 0 && (
                          <p>Kategoriler: <span className="font-medium">{item.categories.join(', ')}</span></p>
                        )}
                        <p className={`flex items-center ${
                          item.isExpired ? 'text-red-500' : 
                          isExpiringSoon(item.expiryDate) ? 'text-amber-500' : ''
                        }`}>
                          {isExpiringSoon(item.expiryDate) && !item.isExpired && (
                            <Clock className="h-4 w-4 mr-1" />
                          )}
                          {getExpiryText(item.expiryDate, item.isExpired)}
                        </p>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  // Hediye kartı
                  <>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <Gift className="h-5 w-5 mr-2" />
                          <CardTitle className="text-base text-white">Hediye Kartı</CardTitle>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getGiftCardStatusColor(item as GiftCard)}`}>
                            {getGiftCardStatusText(item as GiftCard)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <div>
                          <p className="text-2xl font-bold">{item.balance.toLocaleString('tr-TR')} ₺</p>
                          <p className="text-sm text-white/80">Bakiye</p>
                        </div>
                        <div className="flex items-center">
                          <p className="font-mono text-sm font-medium mr-2 text-white">{item.code}</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={() => handleCopyCode(item.id, item.code)}
                            disabled={!item.isActive || item.balance === 0 || item.isExpired}
                          >
                            {copiedCode === item.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Kalan Bakiye</span>
                            <span>{item.balance.toLocaleString('tr-TR')} ₺ / {item.originalBalance.toLocaleString('tr-TR')} ₺</span>
                          </div>
                          <Progress value={(item.balance / item.originalBalance) * 100} />
                        </div>
                        {item.lastUsed && (
                          <p>Son kullanım: <span className="font-medium">{new Date(item.lastUsed).toLocaleDateString('tr-TR')}</span></p>
                        )}
                        <p className={`flex items-center ${
                          item.isExpired ? 'text-red-500' : 
                          isExpiringSoon(item.expiryDate) ? 'text-amber-500' : ''
                        }`}>
                          {isExpiringSoon(item.expiryDate) && !item.isExpired && (
                            <Clock className="h-4 w-4 mr-1" />
                          )}
                          {getExpiryText(item.expiryDate, item.isExpired)}
                        </p>
                      </div>
                    </CardContent>
                  </>
                )}
                <CardFooter className="border-t p-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={
                      (item.itemType === 'coupon' && (item.isUsed || item.isExpired)) || 
                      (item.itemType === 'giftCard' && (!item.isActive || item.balance === 0 || item.isExpired))
                    }
                    asChild
                  >
                    <a href="/">
                      Alışverişte Kullan
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Ticket className="h-12 w-12 text-muted-foreground" />
                <Gift className="h-12 w-12 text-muted-foreground ml-2" />
              </div>
              <p className="text-muted-foreground mb-4">
                {activeTab === 'all' 
                  ? 'Henüz kupon veya hediye kartınız bulunmuyor.' 
                  : activeTab === 'coupons'
                    ? 'Henüz kuponunuz bulunmuyor.'
                    : activeTab === 'giftcards'
                      ? 'Henüz hediye kartınız bulunmuyor.'
                      : activeTab === 'active'
                        ? 'Henüz aktif kupon veya hediye kartınız bulunmuyor.'
                        : activeTab === 'used'
                          ? 'Henüz kullanılmış kupon veya hediye kartınız bulunmuyor.'
                          : 'Henüz süresi dolmuş kupon veya hediye kartınız bulunmuyor.'}
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Kod Ekle
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

CouponsPage.getLayout = function getLayout(page: ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

export default CouponsPage; 