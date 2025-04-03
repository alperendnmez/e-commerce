import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  imageUrl: string;
  attributes: Record<string, any>;
  inStock: boolean;
}

interface CompareContextType {
  compareProducts: Product[];
  addToCompare: (product: Product, maxCompare?: number) => void;
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isInCompare: (productId: number) => boolean;
  toggleCompare: (product: Product, maxCompare?: number) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  // LocalStorage'dan karşılaştırma listesini yükle
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('compareProducts');
      if (savedProducts) {
        setCompareProducts(JSON.parse(savedProducts));
      }
    } catch (error) {
      console.error('Karşılaştırma listesi yüklenirken hata oluştu:', error);
    }
  }, []);

  // Karşılaştırma listesi değiştiğinde localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem('compareProducts', JSON.stringify(compareProducts));
    } catch (error) {
      console.error('Karşılaştırma listesi kaydedilirken hata oluştu:', error);
    }
  }, [compareProducts]);

  // Ürünü karşılaştırma listesine ekle
  const addToCompare = (product: Product, maxCompare: number = 4) => {
    if (compareProducts.length >= maxCompare) {
      toast({
        title: "Karşılaştırma listesi dolu",
        description: `En fazla ${maxCompare} ürün karşılaştırabilirsiniz.`,
        variant: "destructive",
      });
      return;
    }

    if (isInCompare(product.id)) {
      toast({
        title: "Ürün zaten listede",
        description: "Bu ürün zaten karşılaştırma listenizde bulunuyor.",
      });
      return;
    }

    setCompareProducts((prev) => [...prev, product]);
    toast({
      title: "Ürün eklendi",
      description: "Ürün karşılaştırma listenize eklendi.",
    });
  };

  // Ürünü karşılaştırma listesinden çıkar
  const removeFromCompare = (productId: number) => {
    setCompareProducts((prev) => prev.filter((p) => p.id !== productId));
    toast({
      title: "Ürün çıkarıldı",
      description: "Ürün karşılaştırma listenizden çıkarıldı.",
    });
  };

  // Karşılaştırma listesini temizle
  const clearCompare = () => {
    setCompareProducts([]);
    toast({
      title: "Liste temizlendi",
      description: "Karşılaştırma listeniz temizlendi.",
    });
  };

  // Ürün karşılaştırma listesinde mi kontrol et
  const isInCompare = (productId: number) => {
    return compareProducts.some((p) => p.id === productId);
  };

  // Ürünü karşılaştırma listesine ekle/çıkar
  const toggleCompare = (product: Product, maxCompare: number = 4) => {
    if (isInCompare(product.id)) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product, maxCompare);
    }
  };

  return (
    <CompareContext.Provider
      value={{
        compareProducts,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        toggleCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
} 