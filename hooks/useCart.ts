import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';

type CartItem = {
  productId: number;
  variantId?: number;
  quantity: number;
  name: string;
  price: string;
  image: string;
  reservationId?: number;
};

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  
  // Kullanıcı oturumu veya ziyaretçi oturumu ID'si
  const [sessionId, setSessionId] = useState<string>('');
  
  // Session ID'yi yükle veya oluştur
  useEffect(() => {
    const getOrCreateSessionId = () => {
      let id = localStorage.getItem('cartSessionId');
      if (!id) {
        id = uuidv4();
        localStorage.setItem('cartSessionId', id);
      }
      setSessionId(id);
    };
    
    getOrCreateSessionId();
  }, []);

  // Cart verilerini localStorage'dan yükle
  useEffect(() => {
    const loadCart = () => {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          setCartItems(parsedCart);
          setCartCount(parsedCart.length);
        } catch (error) {
          console.error("Cart verisi parse edilemedi:", error);
        }
      }
    };

    loadCart();

    // Cart güncellemelerini dinle
    const handleCartUpdated = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdated);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated);
    };
  }, []);
  
  // Sepetten çıkarıldığında rezervasyon iptali
  const cancelReservation = async (reservationId?: number) => {
    if (!reservationId) return;
    
    try {
      await axios.post('/api/stock/cancel-reservation', { reservationId });
    } catch (error) {
      console.error('Rezervasyon iptal edilirken hata oluştu:', error);
      // Sessizce hata yönetimi - kullanıcıya gösterilmeyecek
    }
  };

  // Sepete ürün ekle
  const addToCart = async (product: {
    id: number;
    name: string;
    imageUrls: string[];
    price?: number;
    variants?: {
      id?: number | string; // Accept either number or string
      price: number;
      stock: number;
    }[];
  }, quantity: number = 1, variantId?: number | string, customSessionId?: string) => {
    try {
      setIsLoading(true);
      
      // Eğer özel bir sessionId verildiyse, onu kullan
      const effectiveSessionId = customSessionId || sessionId;
      
      if (!effectiveSessionId) {
        console.error('[useCart] Etkili sessionId değeri yok - oturum bulunamıyor');
        toast({
          title: "Hata",
          description: "Oturum bilgisi bulunamadı. Tarayıcı çerezlerinizi kontrol edin.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
      
      // Debug information
      console.log("addToCart çağrıldı:", {
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        hasVariants: !!product.variants?.length,
        variantId: variantId,
        quantity: quantity,
        usingCustomSessionId: !!customSessionId,
        sessionIdLength: effectiveSessionId.length
      });
      
      if (product.variants?.length) {
        console.log("Ürün varyantları:", JSON.stringify(product.variants, null, 2));
      }

      // Ürün validasyonu - varyant olmasa bile sepete ekleyebilmek için
      let selectedVariantId = variantId ? Number(variantId) : undefined;
      let productPrice = 0;
      
      // Varyantlı ürün kontrolü
      if (product.variants?.length) {
        // Varyant ID belirtilmişse kullan, belirtilmemişse ilk varyantı kullan
        if (!selectedVariantId && product.variants[0]?.id) {
          selectedVariantId = typeof product.variants[0].id === 'string' ? 
            parseInt(product.variants[0].id) : 
            Number(product.variants[0].id);
        }

        // Seçilen varyantı bul
        const selectedVariant = product.variants.find(v => 
          v?.id !== undefined && v?.id !== null && 
          (typeof v.id === 'string' ? parseInt(v.id) : Number(v.id)) === selectedVariantId
        ) || product.variants.find(v => v?.id !== undefined && v?.id !== null);
        
        console.log("Seçilen varyant:", selectedVariant);
        
        if (selectedVariant && selectedVariant.id !== undefined && selectedVariant.id !== null) {
          selectedVariantId = typeof selectedVariant.id === 'string' 
            ? parseInt(selectedVariant.id) 
            : Number(selectedVariant.id);
          productPrice = selectedVariant.price;
          
          // Stokta yok kontrolü
          if (selectedVariant.stock <= 0) {
            toast({
              title: "Uyarı",
              description: "Bu ürün stokta bulunmamaktadır.",
              variant: "destructive",
            });
            setIsLoading(false);
            return false;
          }
        } else {
          toast({
            title: "Uyarı",
            description: "Bu ürün için geçerli varyant bilgisi bulunamadı.",
            variant: "destructive",
          });
          setIsLoading(false);
          return false;
        }
      } 
      // Varyantı olmayan ama fiyatı olan ürün
      else if (product.price) {
        productPrice = product.price;
      }
      // Ne varyant ne de fiyat varsa hata ver
      else {
        toast({
          title: "Uyarı",
          description: "Bu ürün için fiyat bilgisi bulunamadı.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
      
      // Varyantı olan ürünler için stok rezervasyonu yap
      if (selectedVariantId) {
        try {
          const userId = session?.user?.id ? parseInt(session.user.id) : undefined;
          
          // SessionId değerinin varlığını kontrol et
          if (!sessionId) {
            console.error('[useCart] sessionId değeri yok - yeni oluşturuluyor');
            const newSessionId = uuidv4();
            localStorage.setItem('cartSessionId', newSessionId);
            setSessionId(newSessionId);
            console.log('[useCart] Yeni oluşturulan sessionId:', newSessionId.slice(0, 8) + '...');
          }
          
          console.log('Stok rezervasyonu yapılıyor:', {
            variantId: selectedVariantId,
            variantIdType: typeof selectedVariantId,
            quantity,
            quantityType: typeof quantity,
            sessionId: sessionId?.slice(0, 8) + '...',
            hasSession: !!sessionId,
            sessionLength: sessionId?.length,
            userId,
            userIdType: typeof userId
          });
          
          // Geçerli bir varyant ID'si kontrol et
          if (isNaN(selectedVariantId) || selectedVariantId <= 0) {
            toast({
              title: "Uyarı",
              description: "Geçersiz varyant bilgisi.",
              variant: "destructive",
            });
            setIsLoading(false);
            return false;
          }
          
          // API çağrısı için veri hazırla
          const requestData = {
            variantId: Number(selectedVariantId),
            quantity: Number(quantity),
            sessionId: customSessionId || sessionId,
            userId
          };
          
          console.log('[useCart] API çağrısı için hazırlanan veri:', {
            ...requestData,
            sessionId: requestData.sessionId ? `${requestData.sessionId.slice(0, 8)}...` : 'yok',
            sessionIdLength: requestData.sessionId?.length
          });
          
          const reservationResponse = await axios.post('/api/stock/reserve', requestData);
          
          if (!reservationResponse.data.success) {
            toast({
              title: "Uyarı",
              description: reservationResponse.data.message || "Yeterli stok bulunmamaktadır.",
              variant: "destructive",
            });
            setIsLoading(false);
            return false;
          }
          
          const reservationId = reservationResponse.data.reservationId;

          // Sepete eklenecek ürün bilgisi
          const cartItem: CartItem = {
            productId: product.id,
            variantId: selectedVariantId,
            quantity,
            name: product.name,
            price: productPrice.toString(),
            image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "/placeholder-product.jpg",
            reservationId
          };

          // Local storage'dan mevcut sepeti al
          const existingCartJSON = localStorage.getItem('cart');
          const existingCart = existingCartJSON ? JSON.parse(existingCartJSON) : [];
          
          // Aynı ürün + varyant kombinasyonu sepette var mı kontrol et
          const existingItemIndex = existingCart.findIndex(
            (item: CartItem) => 
              item.productId === cartItem.productId && 
              item.variantId === cartItem.variantId
          );

          // Eğer ürün zaten sepette varsa
          if (existingItemIndex !== -1) {
            // Eski rezervasyonu iptal et
            await cancelReservation(existingCart[existingItemIndex].reservationId);
            // Miktarı güncelle
            existingCart[existingItemIndex].quantity += quantity;
            // Yeni rezervasyon ID'sini ayarla
            existingCart[existingItemIndex].reservationId = reservationId;
          } else {
            // Yoksa yeni ürün olarak ekle
            existingCart.push(cartItem);
          }
          
          // Sepeti güncelle
          localStorage.setItem('cart', JSON.stringify(existingCart));
          
          // Sepet güncelleme olayını tetikle (navbar'ı güncellemek için)
          window.dispatchEvent(new Event('cartUpdated'));
          
          toast({
            title: "Başarılı",
            description: "Ürün sepete eklendi",
          });
          
          setIsLoading(false);
          return true;
        } catch (error: any) {
          console.error('Stok rezervasyonu oluşturulurken hata:', error);
          
          // Axios error response'dan daha detaylı bilgileri çıkar
          if (error.response && error.response.data) {
            console.error('API error details:', error.response.data);
            const errorMessage = error.response.data.message || error.response.data.error || 'Bilinmeyen hata';
            toast({
              title: "Hata",
              description: `Stok rezervasyonu yapılamadı: ${errorMessage}`,
              variant: "destructive",
            });
          } else if (error instanceof Error) {
            console.error('Hata detayı:', error.message);
            console.error('Hata stack:', error.stack);
            toast({
              title: "Hata",
              description: `Ürün sepete eklenirken bir hata oluştu: ${error.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Hata",
              description: "Ürün sepete eklenirken bilinmeyen bir hata oluştu.",
              variant: "destructive",
            });
          }
          
          setIsLoading(false);
          return false;
        }
      } 
      // Varyantı olmayan ürünler için direkt sepete ekle 
      else if (product.price) {
        // Sepete eklenecek ürün bilgisi
        const cartItem: CartItem = {
          productId: product.id,
          quantity,
          name: product.name,
          price: product.price.toString(),
          image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "/placeholder-product.jpg"
        };

        // Local storage'dan mevcut sepeti al
        const existingCartJSON = localStorage.getItem('cart');
        const existingCart = existingCartJSON ? JSON.parse(existingCartJSON) : [];
        
        // Aynı ürün sepette var mı kontrol et (varyantı olmayan ürünler için)
        const existingItemIndex = existingCart.findIndex(
          (item: CartItem) => item.productId === cartItem.productId && !item.variantId
        );

        // Eğer ürün zaten sepette varsa miktarı güncelle
        if (existingItemIndex !== -1) {
          existingCart[existingItemIndex].quantity += quantity;
        } else {
          // Yoksa yeni ürün olarak ekle
          existingCart.push(cartItem);
        }
        
        // Sepeti güncelle
        localStorage.setItem('cart', JSON.stringify(existingCart));
        
        // Sepet güncelleme olayını tetikle (navbar'ı güncellemek için)
        window.dispatchEvent(new Event('cartUpdated'));
        
        toast({
          title: "Başarılı",
          description: "Ürün sepete eklendi",
        });
        
        setIsLoading(false);
        return true;
      } else {
        toast({
          title: "Uyarı",
          description: "Ürün sepete eklenirken bir sorun oluştu.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Sepete ekleme sırasında beklenmeyen hata:', error);
      toast({
        title: "Hata",
        description: "Ürün sepete eklenirken bir hata oluştu.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  // Sepetten ürün çıkar
  const removeFromCart = async (productId: number, variantId?: number) => {
    try {
      const existingCartJSON = localStorage.getItem('cart');
      if (!existingCartJSON) return;
      
      const existingCart = JSON.parse(existingCartJSON);
      
      // İlgili ürünü bul
      const itemIndex = existingCart.findIndex(
        (item: CartItem) => item.productId === productId && item.variantId === variantId
      );
      
      if (itemIndex !== -1) {
        // Rezervasyonu iptal et
        await cancelReservation(existingCart[itemIndex].reservationId);
      }
      
      // İlgili ürünü çıkar
      const updatedCart = existingCart.filter(
        (item: CartItem) => !(item.productId === productId && item.variantId === variantId)
      );
      
      // Sepeti güncelle
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      
      // Sepet güncelleme olayını tetikle
      window.dispatchEvent(new Event('cartUpdated'));
      
      toast({
        title: "Bilgi",
        description: "Ürün sepetten çıkarıldı",
      });
      
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Hata",
        description: "Ürün sepetten çıkarılırken bir hata oluştu.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Ürün miktarını güncelle
  const updateQuantity = async (productId: number, variantId: number | undefined, quantity: number) => {
    try {
      if (quantity < 1) return false;
      
      const existingCartJSON = localStorage.getItem('cart');
      if (!existingCartJSON) return false;
      
      const existingCart = JSON.parse(existingCartJSON);
      
      // İlgili ürünü bul
      const itemIndex = existingCart.findIndex(
        (item: CartItem) => item.productId === productId && item.variantId === variantId
      );
      
      if (itemIndex === -1) return false;
      
      const oldQuantity = existingCart[itemIndex].quantity;
      const reservationId = existingCart[itemIndex].reservationId;
      
      // Eğer miktar değişmediyse bir şey yapma
      if (oldQuantity === quantity) return true;
      
      // Eski rezervasyonu iptal et
      await cancelReservation(reservationId);
      
      // Yeni stok rezervasyonu oluştur
      const userId = session?.user?.id ? parseInt(session.user.id) : undefined;
      
      const reservationResponse = await axios.post('/api/stock/reserve', {
        variantId: variantId,
        quantity,
        sessionId,
        userId
      });
      
      if (!reservationResponse.data.success) {
        toast({
          title: "Uyarı",
          description: reservationResponse.data.message || "Yeterli stok bulunmamaktadır.",
          variant: "destructive",
        });
        return false;
      }
      
      // Miktarı güncelle ve yeni rezervasyon ID'sini kaydet
      existingCart[itemIndex].quantity = quantity;
      existingCart[itemIndex].reservationId = reservationResponse.data.reservationId;
      
      // Sepeti güncelle
      localStorage.setItem('cart', JSON.stringify(existingCart));
      
      // Sepet güncelleme olayını tetikle
      window.dispatchEvent(new Event('cartUpdated'));
      
      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  };

  // Sepeti temizle
  const clearCart = async () => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        
        // Tüm rezervasyonları iptal et
        for (const item of parsedCart) {
          if (item.reservationId) {
            await cancelReservation(item.reservationId);
          }
        }
      }
      
      localStorage.removeItem('cart');
      setCartItems([]);
      setCartCount(0);
      window.dispatchEvent(new Event('cartUpdated'));
      
      toast({
        title: "Bilgi",
        description: "Sepet temizlendi",
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Hata",
        description: "Sepet temizlenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Rezervasyonları siparişe dönüştür
  const convertReservationsToOrder = async () => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (!storedCart) return { success: true, message: "Cart is empty", reservationIds: [] };
      
      const parsedCart = JSON.parse(storedCart);
      const reservationIds = parsedCart
        .filter((item: CartItem) => item.reservationId)
        .map((item: CartItem) => item.reservationId);
      
      if (reservationIds.length === 0) return { success: true, message: "No reservations to convert", reservationIds: [] };
      
      console.log('Rezervasyonları siparişe dönüştürme işlemi başlatıldı:', reservationIds);
      
      try {
        // Rezervasyonları siparişe dönüştür (stoktan düşecek)
        const response = await axios.post('/api/stock/convert-reservations', { reservationIds });
        console.log('Rezervasyon dönüştürme yanıtı:', response.data);
        
        return { 
          success: true, 
          message: response.data.allConverted 
            ? "Tüm rezervasyonlar başarıyla dönüştürüldü" 
            : "Bazı rezervasyonlar dönüştürülemedi ama işlem devam edecek",
          reservationIds,
          apiResponse: response.data 
        };
      } catch (axiosError) {
        console.error('Error from API during reservation conversion:', axiosError);
        // API'den 500 hatası geldi ama işlem devam etmeli
        return { 
          success: false, 
          message: "Rezervasyon dönüştürme API hatası, ancak işlem devam edecek",
          error: axiosError,
          reservationIds
        };
      }
    } catch (error) {
      console.error('Error converting reservations to order:', error);
      // Hata olsa bile işleme devam etmek için hata fırlatmadan sonuç dönüyoruz
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error during reservation conversion",
        error,
        reservationIds: []
      };
    }
  };

  return {
    cartItems,
    cartCount,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    convertReservationsToOrder
  };
}; 