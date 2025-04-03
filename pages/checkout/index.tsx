import { useEffect, useState, useCallback } from 'react';
import { NextPageWithLayout } from '@/lib/types';
import { ReactElement } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { v4 as uuidv4 } from 'uuid';

// Axios varsayılan ayarları
axios.defaults.withCredentials = true;

// UI Bileşenleri
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronLeft, ChevronRight, CreditCard, Home, Loader2, Lock, MapPin, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Building } from 'lucide-react';

// Tipler
interface CartItem {
  productId: number;
  variantId: number | null;
  quantity: number;
  name: string;
  price: string;
  image: string;
}

interface Address {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  isDefaultBilling: boolean;
  type: 'HOME' | 'WORK' | 'OTHER';
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

// Checkout sayfası bileşeni
const Checkout: NextPageWithLayout = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cartItems, clearCart, convertReservationsToOrder } = useCart();
  
  // State değişkenleri
  const [activeStep, setActiveStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<number | null>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<number | null>(null);
  const [sameBillingAddress, setSameBillingAddress] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState<string | null>('standard');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    title: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Türkiye',
    type: 'HOME' as 'HOME' | 'WORK' | 'OTHER'
  });
  
  // Hesaplanan değerler
  const subtotal = cartItems.reduce((total, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
    return total + (price * item.quantity);
  }, 0);
  
  const shippingCost = shippingMethod === 'express' ? 49.90 : 29.90;
  const total = subtotal + shippingCost;

  // Ödeme yöntemleri
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'credit_card',
      name: 'Kredi Kartı',
      description: 'Güvenli kredi kartı ödemesi',
      icon: <CreditCard className="h-5 w-5 text-slate-600" />
    },
    {
      id: 'paytr',
      name: 'PayTR ile Öde',
      description: 'Tüm banka kartları ile tek tıkla ödeme',
      icon: <Image src="/paytr-logo.png" alt="PayTR" width={24} height={24} />
    },
    {
      id: 'bank_transfer',
      name: 'Havale / EFT',
      description: 'Banka havalesi ile ödeme',
      icon: <CreditCard className="h-5 w-5 text-slate-600" />
    }
  ];

  // Adres yükleme fonksiyonu 
  const fetchAddresses = useCallback(async () => {
    try {
      const response = await axios.get('/api/user/addresses', {
        withCredentials: true
      });
      if (response.data && Array.isArray(response.data)) {
        setAddresses(response.data);
        
        // Varsayılan adresler
        const defaultShipping = response.data.find(addr => addr.isDefault);
        const defaultBilling = response.data.find(addr => addr.isDefaultBilling);
        
        if (defaultShipping) {
          setSelectedShippingAddress(defaultShipping.id);
        } else if (response.data.length > 0) {
          setSelectedShippingAddress(response.data[0].id);
        }
        
        if (defaultBilling) {
          setSelectedBillingAddress(defaultBilling.id);
        } else if (response.data.length > 0) {
          setSelectedBillingAddress(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Adresler yüklenirken hata oluştu:', error);
      toast.error('Adresler yüklenemedi');
    }
  }, []);

  // useEffect hooks
  useEffect(() => {
    // Kullanıcı giriş yapmadıysa ana sayfaya yönlendir
    if (status === 'unauthenticated') {
      router.push('/');
      toast.error('Lütfen önce giriş yapınız');
      return;
    }
    
    // Sepeti kontrol et
    const checkCart = () => {
      const storedCart = localStorage.getItem('cart');
      if (!storedCart || JSON.parse(storedCart).length === 0) {
        router.push('/cart');
        toast.error('Sepetinizde ürün bulunmamaktadır');
        return false;
      }
      return true;
    };
    
    // Hem localStorage hem de cartItems üzerinden kontrol yap
    if (!checkCart() || cartItems.length === 0) {
      return; // Sepet boşsa yönlendirme zaten yapıldı
    }
    
    // Loading durumunu erken kaldıralım
    setLoading(false);
    
    // Kullanıcı adreslerini yükle - bu işlem arka planda yapılabilir
    if (session && status === 'authenticated') {
      fetchAddresses().catch(error => {
        console.error('Adresler yüklenirken hata:', error);
        toast.error('Adresler yüklenemedi, lütfen sayfayı yenileyin');
      });
    }
  }, [status, router, session, fetchAddresses, cartItems.length]);

  // Yeni adres ekleme
  const handleAddAddress = async () => {
    if (!newAddress.fullName || !newAddress.phone || !newAddress.address || 
        !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    
    setIsAddingAddress(true);
    
    try {
      const response = await axios.post('/api/user/addresses', {
        ...newAddress,
        isDefault: addresses.length === 0,
        isDefaultBilling: addresses.length === 0
      }, {
        withCredentials: true
      });
      
      if (response.data) {
        toast.success('Adres başarıyla eklendi');
        setAddresses([...addresses, response.data]);
        
        // Yeni eklenen adresi seçili yap
        setSelectedShippingAddress(response.data.id);
        if (sameBillingAddress) {
          setSelectedBillingAddress(response.data.id);
        }
        
        // Formu temizle
        setNewAddress({
          title: '',
          fullName: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'Türkiye',
          type: 'HOME'
        });
        
        setIsAddingAddress(false);
      }
    } catch (error) {
      console.error('Adres eklenirken hata oluştu:', error);
      toast.error('Adres eklenemedi');
      setIsAddingAddress(false);
    }
  };

  // Siparişi tamamlama
  const handleCompleteOrder = async () => {
    if (!selectedShippingAddress) {
      toast.error('Lütfen bir teslimat adresi seçin');
      return;
    }
    
    if (!sameBillingAddress && !selectedBillingAddress) {
      toast.error('Lütfen bir fatura adresi seçin');
      return;
    }
    
    if (!selectedPaymentMethod) {
      toast.error('Lütfen bir ödeme yöntemi seçin');
      return;
    }
    
    // Sepetteki öğeleri doğrula
    if (!cartItems || cartItems.length === 0) {
      toast.error('Sepetinizde ürün bulunmamaktadır');
      router.push('/cart');
      return;
    }
    
    // Stok güvenliği için ürün başına maksimum adet kontrolü
    const hasExcessiveQuantity = cartItems.some(item => item.quantity > 10);
    if (hasExcessiveQuantity) {
      toast.error('Bir üründen en fazla 10 adet sipariş verebilirsiniz');
      return;
    }
    
    // Sipariş onayı alınmadan önce ürünlerin varlığını kontrol edelim
    setIsSubmitting(true);
    
    // Tek bir işlem tanımlayıcısı oluştur (idempotency key)
    const idempotencyKey = uuidv4();
    
    try {
      // Önce ürünlerin varlığını kontrol et - bu işlemi asenkron yaparak sayfa donmasını önleyelim
      const checkProductsData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId ? Number(item.variantId) : null,
        })),
        idempotencyKey // İşlem tekrarını önlemek için
      };
      
      const checkResponse = await axios.post('/api/orders/check-products', checkProductsData, {
        withCredentials: true,
        headers: {
          'X-Idempotency-Key': idempotencyKey, // İşlem tekrarını önlemek için
          'X-CSRF-Protection': '1'
        }
      });
      
      if (checkResponse.data.unavailableProducts && checkResponse.data.unavailableProducts.length > 0) {
        setIsSubmitting(false);
        
        // Mevcut olmayan ürünlerin isimlerini al
        const unavailableNames = checkResponse.data.unavailableProducts.map((id: number) => {
          const item = cartItems.find(item => item.productId === id);
          return item ? item.name : `Ürün #${id}`;
        });
        
        // Kullanıcıya uyarı göster ve devam etmek isteyip istemediğini sor
        const confirmContinue = window.confirm(
          `Aşağıdaki ürünler artık mevcut değil ve siparişinizden çıkarılacak:\n\n${unavailableNames.join('\n')}\n\nDevam etmek istiyor musunuz?`
        );
        
        if (!confirmContinue) {
          return; // Kullanıcı iptal etti
        }
      }
      
      // İşlem doğrulama kontrolü - toplam fiyatı tekrar hesapla
      const recalculatedSubtotal = cartItems.reduce((total, item) => {
        const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
        return total + (price * item.quantity);
      }, 0);
      
      const recalculatedTotal = recalculatedSubtotal + shippingCost;
      
      // Toplam fiyat değişmiş mi kontrol et (güvenlik)
      if (Math.abs(recalculatedSubtotal - subtotal) > 0.01 || Math.abs(recalculatedTotal - total) > 0.01) {
        console.error('Fiyat tutarsızlığı tespit edildi:', {
          clientSubtotal: subtotal,
          recalculatedSubtotal,
          clientTotal: total,
          recalculatedTotal
        });
        toast.error('Sipariş bilgilerinizde tutarsızlık tespit edildi. Lütfen sayfayı yenileyip tekrar deneyin.');
        setIsSubmitting(false);
        return;
      }
      
      // Kullanıcı devam etmek istiyorsa veya tüm ürünler mevcutsa siparişi oluştur
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId ? Number(item.variantId) : null,
          quantity: item.quantity,
          price: parseFloat(item.price.replace(/[^\d.]/g, ''))
        })),
        shippingAddressId: selectedShippingAddress,
        billingAddressId: sameBillingAddress ? selectedShippingAddress : selectedBillingAddress,
        shippingMethod: shippingMethod,
        paymentMethod: selectedPaymentMethod,
        notes: orderNotes ? String(orderNotes).slice(0, 500) : '', // Not uzunluğunu sınırla
        subtotal: recalculatedSubtotal, // Yeniden hesaplanan değeri kullan
        shippingCost: shippingCost,
        total: recalculatedTotal, // Yeniden hesaplanan değeri kullan
        idempotencyKey // İşlem tekrarını önlemek için
      };
      
      // Siparişi oluştur
      const orderResponse = await axios.post('/api/orders/create', orderData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey, // İşlem tekrarını önlemek için
          'X-CSRF-Protection': '1'
        },
        withCredentials: true,
        timeout: 10000 // 10 saniye timeout ekle
      });
      
      if (orderResponse.data && orderResponse.data.orderId) {
        const orderId = orderResponse.data.orderId;
        
        // Başarı sayfasına yönlendirme URL'ini hazırla
        const successUrl = `/checkout/success?orderId=${orderId}`;
        
        try {
          // Stok rezervasyonlarını siparişe dönüştür
          const convertResult = await convertReservationsToOrder();
          console.log('Rezervasyon dönüştürme sonucu:', convertResult);
          
          // Sepeti temizleme işleminden önce yönlendirme hazırlığı yap
          setTimeout(() => {
            // Önce başarı sayfasına yönlendir, sonra sepeti temizle
            router.push(successUrl).then(() => {
              // Yönlendirme başladıktan sonra sepeti temizle
              setTimeout(() => {
                clearCart();
              }, 500);
            }).catch((routeError) => {
              console.error('Yönlendirme hatası:', routeError);
              // Yönlendirme hatası olsa bile sepeti temizle
              clearCart();
            });
          }, 100);
        } catch (reservationError) {
          console.error('Stok rezervasyonu hatası:', reservationError);
          // Hata olsa bile başarı sayfasına yönlendir
          router.push(successUrl);
        }
      } else {
        throw new Error('Sipariş oluşturulurken bir hata meydana geldi');
      }
    } catch (error: any) {
      console.error('Sipariş oluşturulurken hata:', error);
      
      // Hata mesajını seç - önce API'den gelen hatayı, yoksa genel hata mesajını kullan
      const errorMessage = error.response?.data?.error || 
                           error.response?.data?.message || 
                           error.message || 
                           'Sipariş oluşturulamadı. Lütfen tekrar deneyin.';
      
      // Hata mesajı içinde "price" veya "fiyat" geçiyorsa daha anlaşılır bir mesaj gösterelim
      if (
        (error.response?.data?.message && typeof error.response.data.message === 'string' && 
         (error.response.data.message.includes('price') || error.response.data.message.includes('fiyat'))) || 
        (errorMessage && typeof errorMessage === 'string' && 
         (errorMessage.includes('price') || errorMessage.includes('fiyat')))
      ) {
        toast.error('Ürün fiyatları güncellenmiş olabilir. Lütfen sayfayı yenileyip tekrar deneyin.');
      } else {
        toast.error(errorMessage);
      }
      
      // Ağ bağlantısı hatası durumunda kullanıcıya özel mesaj göster
      if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        toast.error('Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Adres değişimi
  const handleBillingAddressChange = (useShippingAddress: boolean) => {
    setSameBillingAddress(useShippingAddress);
    if (useShippingAddress) {
      setSelectedBillingAddress(selectedShippingAddress);
    }
  };

  // Adımlarda ilerleme
  const handleNextStep = () => {
    if (activeStep === 1) {
      if (!selectedShippingAddress) {
        toast.error('Lütfen bir teslimat adresi seçin');
        return;
      }
      
      if (!sameBillingAddress && !selectedBillingAddress) {
        toast.error('Lütfen bir fatura adresi seçin');
        return;
      }
    }
    
    if (activeStep === 2) {
      if (!shippingMethod) {
        toast.error('Lütfen bir kargo yöntemi seçin');
        return;
      }
    }
    
    setActiveStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handlePreviousStep = () => {
    setActiveStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  // Sayfa yüklenirken loading göster
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Yükleniyor...</span>
      </div>
    );
  }

  // Adım göstergeleri
  const steps = [
    { id: 1, name: 'Adres Bilgileri' },
    { id: 2, name: 'Kargo Seçenekleri' },
    { id: 3, name: 'Ödeme' },
    { id: 4, name: 'Sipariş Özeti' }
  ];

  return (
    <>
      <Toaster position="top-center" />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ödeme</h1>
          <Link href="/cart" className="mt-2 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="mr-1" size={16} />
            Sepete geri dön
          </Link>
        </div>

        {/* Adım göstergeleri */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li key={step.id} className={`relative ${stepIdx === steps.length - 1 ? '' : 'pr-8 sm:pr-20'} ${stepIdx === 0 ? '' : ''}`}>
                  <div className="flex items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${activeStep >= step.id ? 'bg-primary' : 'bg-gray-200'} transition-colors duration-200`}>
                      {activeStep > step.id ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <span className={`text-sm font-medium ${activeStep >= step.id ? 'text-white' : 'text-gray-500'}`}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-900 hidden sm:inline-block">
                      {step.name}
                    </span>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div className="absolute top-5 left-10 -ml-px h-0.5 w-8 sm:w-20 bg-gray-200">
                      <div className={`h-0.5 ${activeStep > step.id ? 'bg-primary' : 'bg-gray-200'} transition-all duration-500`} style={{width: activeStep > step.id ? '100%' : '0%'}} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sol taraf - Adımlar */}
          <div className="lg:col-span-8">
            {/* Adım 1: Adres Bilgileri */}
            {activeStep === 1 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Adres Bilgileri</h2>
                </div>
                
                <div className="p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Teslimat Adresi</h3>
                  
                  {addresses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <RadioGroup value={selectedShippingAddress?.toString()} onValueChange={(value) => setSelectedShippingAddress(parseInt(value))}>
                        {addresses.map(address => (
                          <div 
                            key={address.id} 
                            className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${selectedShippingAddress === address.id ? 'border-primary border-2' : 'border-gray-200'}`}
                            onClick={() => setSelectedShippingAddress(address.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center">
                                <RadioGroupItem
                                  id={`shipping-${address.id}`}
                                  value={String(address.id)}
                                  checked={selectedShippingAddress === address.id}
                                  className="mr-2"
                                />
                                <div>
                                  <Label htmlFor={`shipping-${address.id}`} className="font-medium">{address.title}</Label>
                                  {address.isDefault && (
                                    <Badge variant="outline" className="ml-2 text-xs">Varsayılan</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center">
                                {address.type === 'HOME' && <Home className="h-4 w-4 text-gray-500" />}
                                {address.type === 'WORK' && <Building className="h-4 w-4 text-gray-500" />}
                                {address.type === 'OTHER' && <MapPin className="h-4 w-4 text-gray-500" />}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium">{address.fullName}</p>
                              <p>{address.phone}</p>
                              <p className="mt-1">{address.address}</p>
                              <p>{address.zipCode} {address.city}, {address.state}</p>
                              <p>{address.country}</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-lg bg-gray-50 mb-6">
                      <MapPin className="mx-auto h-10 w-10 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Adres bulunamadı</h3>
                      <p className="mt-1 text-sm text-gray-500">Henüz kayıtlı adresiniz bulunmamaktadır.</p>
                    </div>
                  )}
                  
                  {/* Yeni adres ekleme formu */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Yeni Adres Ekle</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Adres Başlığı*</Label>
                        <Input 
                          id="title" 
                          placeholder="Örn: Ev, İş" 
                          value={newAddress.title}
                          onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="type">Adres Tipi*</Label>
                        <Select 
                          value={newAddress.type}
                          onValueChange={(value) => setNewAddress({...newAddress, type: value as 'HOME' | 'WORK' | 'OTHER'})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Adres tipi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOME">Ev</SelectItem>
                            <SelectItem value="WORK">İş</SelectItem>
                            <SelectItem value="OTHER">Diğer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="fullName">Ad Soyad*</Label>
                        <Input 
                          id="fullName" 
                          placeholder="Ad Soyad" 
                          value={newAddress.fullName}
                          onChange={e => setNewAddress({...newAddress, fullName: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Telefon Numarası*</Label>
                        <Input 
                          id="phone" 
                          placeholder="Telefon Numarası" 
                          value={newAddress.phone}
                          onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="address">Açık Adres*</Label>
                        <Textarea 
                          id="address" 
                          placeholder="Açık Adres" 
                          rows={3}
                          value={newAddress.address}
                          onChange={e => setNewAddress({...newAddress, address: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="city">İl*</Label>
                        <Input 
                          id="city" 
                          placeholder="İl" 
                          value={newAddress.city}
                          onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="state">İlçe*</Label>
                        <Input 
                          id="state" 
                          placeholder="İlçe" 
                          value={newAddress.state}
                          onChange={e => setNewAddress({...newAddress, state: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="zipCode">Posta Kodu*</Label>
                        <Input 
                          id="zipCode" 
                          placeholder="Posta Kodu" 
                          value={newAddress.zipCode}
                          onChange={e => setNewAddress({...newAddress, zipCode: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="country">Ülke*</Label>
                        <Input 
                          id="country" 
                          placeholder="Ülke" 
                          value={newAddress.country}
                          onChange={e => setNewAddress({...newAddress, country: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <Button 
                        onClick={handleAddAddress}
                        disabled={isAddingAddress}
                        className="w-full md:w-auto"
                      >
                        {isAddingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Adresi Kaydet
                      </Button>
                    </div>
                  </div>
                  
                  {/* Fatura adresi seçimi */}
                  <div className="mt-8">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Fatura Adresi</h3>
                    
                    <div className="mb-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sameBillingAddress" 
                          checked={sameBillingAddress}
                          onCheckedChange={checked => handleBillingAddressChange(checked === true)}
                        />
                        <Label htmlFor="sameBillingAddress">Teslimat adresi ile aynı</Label>
                      </div>
                    </div>
                    
                    {!sameBillingAddress && addresses.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RadioGroup value={selectedBillingAddress?.toString()} onValueChange={(value) => setSelectedBillingAddress(parseInt(value))}>
                          {addresses.map(address => (
                            <div 
                              key={`billing-${address.id}`} 
                              className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${selectedBillingAddress === address.id ? 'border-primary border-2' : 'border-gray-200'}`}
                              onClick={() => setSelectedBillingAddress(address.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center">
                                  <RadioGroupItem
                                    id={`billing-${address.id}`}
                                    value={String(address.id)}
                                    checked={selectedBillingAddress === address.id}
                                    className="mr-2"
                                  />
                                  <div>
                                    <Label htmlFor={`billing-${address.id}`} className="font-medium">{address.title}</Label>
                                    {address.isDefaultBilling && (
                                      <Badge variant="outline" className="ml-2 text-xs">Varsayılan</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {address.type === 'HOME' && <Home className="h-4 w-4 text-gray-500" />}
                                  {address.type === 'WORK' && <Building className="h-4 w-4 text-gray-500" />}
                                  {address.type === 'OTHER' && <MapPin className="h-4 w-4 text-gray-500" />}
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <p className="font-medium">{address.fullName}</p>
                                <p>{address.phone}</p>
                                <p className="mt-1">{address.address}</p>
                                <p>{address.zipCode} {address.city}, {address.state}</p>
                                <p>{address.country}</p>
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}
                    
                    {!sameBillingAddress && addresses.length === 0 && (
                      <div className="text-center py-6 border rounded-lg bg-gray-50">
                        <MapPin className="mx-auto h-10 w-10 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Adres bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500">Henüz kayıtlı adresiniz bulunmamaktadır.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Adım 2: Kargo Seçenekleri */}
            {activeStep === 2 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Kargo Seçenekleri</h2>
                </div>
                
                <div className="p-6">
                  <RadioGroup 
                    defaultValue={shippingMethod || 'standard'} 
                    onValueChange={value => setShippingMethod(value)}
                    className="space-y-4"
                  >
                    <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${shippingMethod === 'standard' ? 'border-primary border-2' : 'border-gray-200'}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard-shipping" />
                        <div className="flex-1">
                          <Label htmlFor="standard-shipping" className="text-base font-medium flex items-center justify-between">
                            <span>Standart Teslimat</span>
                            <span className="font-bold">29.90 TL</span>
                          </Label>
                          <p className="text-sm text-gray-500 mt-1">2-4 iş günü içinde teslimat</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${shippingMethod === 'express' ? 'border-primary border-2' : 'border-gray-200'}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="express" id="express-shipping" />
                        <div className="flex-1">
                          <Label htmlFor="express-shipping" className="text-base font-medium flex items-center justify-between">
                            <span>Hızlı Teslimat</span>
                            <span className="font-bold">49.90 TL</span>
                          </Label>
                          <p className="text-sm text-gray-500 mt-1">1-2 iş günü içinde teslimat</p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                  
                  <div className="mt-8">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Sipariş Notu</h3>
                    <Textarea 
                      placeholder="Sipariş ile ilgili eklemek istediğiniz notlar (isteğe bağlı)" 
                      rows={4}
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Adım 3: Ödeme */}
            {activeStep === 3 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Ödeme</h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Güvenli Ödeme</span>
                      </div>
                      <div className="flex space-x-2">
                        <Image src="/visa.svg" width={32} height={20} alt="Visa" />
                        <Image src="/mastercard.svg" width={32} height={20} alt="Mastercard" />
                      </div>
                    </div>
                  </div>
                  
                  <RadioGroup 
                    defaultValue={selectedPaymentMethod || ''} 
                    onValueChange={value => setSelectedPaymentMethod(value)}
                    className="space-y-4"
                  >
                    {paymentMethods.map(method => (
                      <div 
                        key={method.id} 
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedPaymentMethod === method.id ? 'border-primary border-2' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={method.id} id={`payment-${method.id}`} />
                          <div className="flex-1">
                            <Label htmlFor={`payment-${method.id}`} className="text-base font-medium flex items-center">
                              <span>{method.name}</span>
                              <span className="ml-2">{method.icon}</span>
                            </Label>
                            <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {selectedPaymentMethod === 'credit_card' && (
                    <div className="mt-6 border rounded-lg p-4 bg-gray-50">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">Demo modunda olduğunuz için ödeme simüle edilecektir.</p>
                        <p className="text-sm text-gray-700">PayTR entegrasyonu proje tamamlandıktan sonra yapılacaktır.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Adım 4: Sipariş Özeti */}
            {activeStep === 4 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">Sipariş Özeti</h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Teslimat Adresi</h3>
                    {selectedShippingAddress && addresses.length > 0 && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        {(() => {
                          const address = addresses.find(a => a.id === selectedShippingAddress);
                          if (!address) return null;
                          
                          return (
                            <div className="text-sm text-gray-700">
                              <p className="font-medium">{address.fullName}</p>
                              <p>{address.phone}</p>
                              <p className="mt-1">{address.address}</p>
                              <p>{address.zipCode} {address.city}, {address.state}</p>
                              <p>{address.country}</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Fatura Adresi</h3>
                    {(() => {
                      const billingId = sameBillingAddress ? selectedShippingAddress : selectedBillingAddress;
                      if (!billingId || addresses.length === 0) return null;
                      
                      const address = addresses.find(a => a.id === billingId);
                      if (!address) return null;
                      
                      return (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">{address.fullName}</p>
                            <p>{address.phone}</p>
                            <p className="mt-1">{address.address}</p>
                            <p>{address.zipCode} {address.city}, {address.state}</p>
                            <p>{address.country}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Kargo Bilgileri</h3>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          <p className="font-medium">
                            {shippingMethod === 'express' ? 'Hızlı Teslimat' : 'Standart Teslimat'}
                          </p>
                          <p className="text-gray-500">
                            {shippingMethod === 'express' ? '1-2 iş günü içinde teslimat' : '2-4 iş günü içinde teslimat'}
                          </p>
                        </div>
                        <p className="font-medium">{shippingMethod === 'express' ? '49.90 TL' : '29.90 TL'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Ödeme Yöntemi</h3>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      {(() => {
                        if (!selectedPaymentMethod) return null;
                        const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
                        if (!method) return null;
                        
                        return (
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                              <p className="font-medium flex items-center">
                                {method.name}
                                <span className="ml-2">{method.icon}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Sepet Ürünleri</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="divide-y divide-gray-200">
                        {cartItems.map((item, index) => (
                          <div key={index} className="p-4 flex items-center">
                            <div className="flex-shrink-0 relative w-16 h-16 border rounded">
                              <Image 
                                src={item.image} 
                                alt={item.name}
                                fill
                                sizes="64px"
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                            <div className="ml-4 flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.price}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {orderNotes && (
                    <div className="mb-6">
                      <h3 className="text-base font-medium text-gray-900 mb-3">Sipariş Notu</h3>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-sm text-gray-700">{orderNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Adım kontrol butonları */}
            <div className="mt-8 flex justify-between">
              {activeStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  className="flex items-center"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Geri
                </Button>
              )}
              
              <div className="flex-1"></div>
              
              {activeStep < 4 && (
                <Button
                  onClick={handleNextStep}
                  className="flex items-center"
                >
                  Devam Et
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              
              {activeStep === 4 && (
                <Button
                  onClick={handleCompleteOrder}
                  disabled={isSubmitting}
                  className="flex items-center"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Siparişi Tamamla
                </Button>
              )}
            </div>
          </div>

          {/* Sağ taraf - Sipariş özeti */}
          <div className="lg:col-span-4">
            <div className="bg-white border rounded-lg overflow-hidden sticky top-4">
              <div className="bg-gray-50 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-900">Sipariş Özeti</h2>
              </div>
              
              <div className="p-6">
                <div className="flow-root">
                  <ul className="-my-4 divide-y divide-gray-200">
                    {cartItems.map((item, index) => (
                      <li key={index} className="flex items-center py-4">
                        <div className="flex-shrink-0">
                          <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                            <Image 
                              src={item.image} 
                              alt={item.name}
                              fill
                              sizes="64px"
                              style={{ objectFit: 'contain' }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 flex flex-1 flex-col">
                          <div className="flex justify-between text-sm font-medium text-gray-900">
                            <h3 className="truncate max-w-[200px]">{item.name}</h3>
                            <p className="ml-2 shrink-0">{item.price}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">Adet: {item.quantity}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="text-sm text-gray-600">Ara Toplam</div>
                    <div className="text-sm font-medium text-gray-900">{subtotal.toFixed(2)} TL</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">Kargo</div>
                    <div className="text-sm font-medium text-gray-900">{shippingCost.toFixed(2)} TL</div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="text-base font-medium text-gray-900">Toplam</div>
                    <div className="text-base font-medium text-gray-900">{total.toFixed(2)} TL</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="rounded-md bg-gray-50 p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Lock className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-2 text-sm text-gray-600">
                        <p>Tüm ödemeler SSL sertifikası ile güvenle şifrelenmektedir.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

Checkout.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default Checkout; 