import { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { ReactElement } from 'react';
import { NextPageWithLayout } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ChevronLeft, ShoppingBag, CreditCard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast, Toaster } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCart } from '@/hooks/useCart';

interface CartItem {
  productId: number;
  variantId: number | null;
  quantity: number;
  name: string;
  price: string;
  image: string;
}

const Cart: NextPageWithLayout = () => {
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const { data: session, status } = useSession();
  const router = useRouter();
  const { cartItems, updateQuantity: updateCartQuantity, removeFromCart, isLoading: cartLoading } = useCart();

  useEffect(() => {
    // useCart hook'u ile sepet verilerini almak için bir şey yapmamıza gerek yok
    setLoading(false);
  }, []);

  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const success = await updateCartQuantity(item.productId, item.variantId || undefined, newQuantity);
    if (!success) {
      toast.error("Miktar güncellenemedi. Stok yeterli olmayabilir.");
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    const success = await removeFromCart(item.productId, item.variantId || undefined);
    if (success) {
      toast.success("Ürün sepetten kaldırıldı");
    }
  };

  const applyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("Lütfen bir kupon kodu girin");
      return;
    }
    
    // Burada normalde API'ye kupon kodu kontrolü için istek atılır
    // Şimdilik basit bir simülasyon yapalım
    if (couponCode.toLowerCase() === 'indirim10') {
      toast.success("Kupon kodu uygulandı! %10 indirim kazandınız.");
    } else {
      toast.error("Geçersiz kupon kodu");
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      // Fiyat string olarak geldiği için numerik değere çeviriyoruz
      const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
      return total + (price * item.quantity);
    }, 0);
  };

  const handleCheckout = () => {
    // useCart hook'u ile sepeti kontrol et
    if (cartItems.length === 0) {
      toast.error("Sepetinizde ürün bulunmamaktadır");
      return;
    }
    
    // Next-Auth session kontrolü
    if (status === 'unauthenticated') {
      toast.error("Devam etmek için lütfen giriş yapın");
      router.push('/giris-yap?redirect=/checkout');
      return;
    }
    
    // Ödeme sayfasına yönlendirme
    router.push('/checkout');
  };

  if (loading || cartLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Sepet yükleniyor...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sepetim</h1>
          <Link href="/" className="mt-2 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="mr-1" size={16} />
            Alışverişe devam et
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">Sepetiniz boş</h2>
            <p className="mt-2 text-sm text-gray-500">
              Sepetinizde henüz ürün bulunmamaktadır.
            </p>
            <div className="mt-6">
              <Link href="/">
                <Button>Alışverişe Başla</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900">Sepet Ürünleri ({cartItems.length})</h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item, index) => (
                    <div key={index} className="p-6 flex flex-col sm:flex-row gap-6">
                      <div className="flex-shrink-0 relative w-24 h-24 sm:w-32 sm:h-32 border rounded">
                        <Image 
                          src={item.image} 
                          alt={item.name} 
                          fill
                          sizes="(max-width: 640px) 96px, 128px"
                          style={{ objectFit: 'contain' }}
                          priority
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between mb-4">
                          <div>
                            <h3 className="text-base font-medium text-gray-900">{item.name}</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {item.variantId ? `Varyant ID: ${item.variantId}` : 'Standart ürün'}
                            </p>
                          </div>
                          <p className="text-base font-medium text-gray-900 mt-2 sm:mt-0">
                            {item.price}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border rounded">
                            <button 
                              className="p-2 text-gray-600 hover:text-gray-900"
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-10 text-center">{item.quantity}</span>
                            <button 
                              className="p-2 text-gray-600 hover:text-gray-900"
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          <button 
                            className="text-red-600 hover:text-red-800 flex items-center"
                            onClick={() => handleRemoveItem(item)}
                          >
                            <Trash2 size={16} className="mr-1" />
                            <span className="text-sm">Kaldır</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4">
              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900">Sipariş Özeti</h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Ara Toplam</p>
                      <p className="text-sm font-medium text-gray-900">{calculateTotal().toFixed(2)} TL</p>
                    </div>
                    
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Kargo</p>
                      <p className="text-sm font-medium text-gray-900">Ücretsiz</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <p className="text-base font-medium text-gray-900">Toplam</p>
                      <p className="text-base font-medium text-gray-900">{calculateTotal().toFixed(2)} TL</p>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="Kupon kodu" 
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <Button 
                          variant="outline"
                          onClick={applyCoupon}
                        >
                          Uygula
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        className="w-full bg-black hover:bg-black/90"
                        onClick={handleCheckout}
                      >
                        <CreditCard className="mr-2" size={16} />
                        Satın Al
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

Cart.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default Cart; 