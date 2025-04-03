import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Veritabanından ve localStorage'dan favorileri yükle
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        // Önce localStorage'dan yükle
        const storedFavorites = localStorage.getItem('favoriteIds');
        if (storedFavorites) {
          setFavoriteIds(JSON.parse(storedFavorites));
        }
        
        // Eğer kullanıcı giriş yapmışsa, API'den de yükle
        if (status === 'authenticated') {
          try {
            const response = await axios.get('/api/user/favorites');
            if (response.data && response.data.favorites) {
              const apiProductIds = response.data.favorites.map((favorite: any) => favorite.id);
              // localStorage ve API favorilerini birleştir
              const combinedSet = new Set([...favoriteIds, ...apiProductIds]);
              const combinedFavorites = Array.from(combinedSet);
              
              // Yeni favorileri API'ye kaydet
              for (const productId of combinedFavorites) {
                if (!apiProductIds.includes(productId)) {
                  await axios.post('/api/user/favorites', { productId });
                }
              }
              
              setFavoriteIds(combinedFavorites);
              localStorage.setItem('favoriteIds', JSON.stringify(combinedFavorites));
            }
          } catch (apiError) {
            console.error('API favorites fetch error:', apiError);
          }
        }
      } catch (error) {
        console.error('Favoriler yüklenirken hata oluştu:', error);
      }
    };

    loadFavorites();

    // Favoriler güncellendiğinde dinle
    const handleFavoritesUpdated = () => loadFavorites();
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
    };
  }, [status]);

  // Favorilere ekleme/çıkarma
  const toggleFavorite = async (productId: number) => {
    setIsLoading(true);
    try {
      // Ürün favorilerde mi kontrol et
      const isFavorite = favoriteIds.includes(productId);
      
      // Kullanıcı giriş yapmış mı kontrol et
      if (status === 'authenticated') {
        try {
          if (isFavorite) {
            // Favorilerden çıkar
            await axios.delete(`/api/user/favorites?productId=${productId}`);
          } else {
            // Favorilere ekle
            await axios.post('/api/user/favorites', { productId });
          }
        } catch (apiError: any) {
          console.error('API error toggling favorite:', apiError);
          
          // 401 Unauthorized hatası kontrolü
          if (apiError.response && apiError.response.status === 401) {
            toast({
              title: "Oturum süresi doldu",
              description: "Favorileriniz yerel olarak kaydedildi. Tam işlevsellik için lütfen giriş yapın.",
              variant: "destructive",
            });
            // Kullanıcıyı giriş sayfasına yönlendir
            router.push('/giris-yap');
            return false;
          }
          
          // Diğer API hataları için kullanıcıya bilgi ver
          toast({
            title: "API Hatası",
            description: "Favorileriniz yerel olarak kaydedildi, ancak sunucu ile senkronize edilemedi.",
            variant: "destructive",
          });
        }
      } 
      // Kullanıcı giriş yapmamışsa, giriş yapmasını öner
      else if (status === 'unauthenticated' && !isFavorite) {
        toast({
          title: "Bilgi",
          description: "Favorileriniz yerel olarak kaydedildi. Kaydetmek için lütfen giriş yapın.",
          variant: "default",
        });
        
        // Kullanıcıya giriş yapma seçeneği sun
        const shouldLogin = window.confirm("Favorilerinizi kaydetmek için giriş yapmanız gerekiyor. Giriş sayfasına yönlendirilmek ister misiniz?");
        if (shouldLogin) {
          router.push('/giris-yap');
          return true;
        }
      }
      
      // Her durumda yerel favoriler listesini güncelle
      if (isFavorite) {
        // Favorilerden çıkar
        const newFavorites = favoriteIds.filter(id => id !== productId);
        setFavoriteIds(newFavorites);
        localStorage.setItem('favoriteIds', JSON.stringify(newFavorites));
        
        toast({
          title: "Bilgi",
          description: "Ürün favorilerden çıkarıldı.",
        });
      } else {
        // Favorilere ekle
        const newFavorites = [...favoriteIds, productId];
        setFavoriteIds(newFavorites);
        localStorage.setItem('favoriteIds', JSON.stringify(newFavorites));
        
        toast({
          title: "Başarılı",
          description: "Ürün favorilere eklendi.",
        });
      }
      
      // Favori güncelleme olayını tetikle
      window.dispatchEvent(new Event('favoritesUpdated'));
      
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Hata",
        description: "Favoriler güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Ürün favorilerde mi kontrol et
  const isFavorite = (productId: number): boolean => {
    return favoriteIds.includes(productId);
  };

  return {
    favoriteIds,
    isLoading,
    toggleFavorite,
    isFavorite
  };
}; 