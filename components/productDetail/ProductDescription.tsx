import React, { useState, useEffect } from 'react'
import { Star, Truck, Package, Heart, Share2, BarChart2 } from 'lucide-react'
import Image from 'next/image'
import { ProductDetails } from '@/lib/types'
import ProductQuantityInput from './ProductQuantityInput'
import ProductShare from './ProductShare'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCompare } from '@/contexts/CompareContext'
import { useCart } from '@/hooks/useCart'
import Link from 'next/link'
import { cn, slugify } from '@/lib/utils'
import { useToast } from "@/components/ui/use-toast"

// Varyant değeri için tip tanımı
interface VariantValue {
  variantGroup?: {
    name: string;
  };
  value: string;
}

// Kategori ve marka tipleri
interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

function ProductDescription({
  productDetail
}: {
  productDetail: ProductDetails
}) {
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [availableStock, setAvailableStock] = useState<number>(parseInt(productDetail.stockCount) || 0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<string>(productDetail.priceRange)
  const [categoryData, setCategoryData] = useState<Category | null>(null)
  const [brandData, setBrandData] = useState<Brand | null>(null)
  const { toast } = useToast()
  
  // Karşılaştırma context'ini kullan
  const { addToCompare, isInCompare, toggleCompare } = useCompare()
  
  // useCart hook'unu kullan
  const { addToCart: addProductToCart, isLoading: cartLoading } = useCart()
  
  // Varyant gruplarını düzenle
  const variantGroups = productDetail.variantGroups || []
  
  useEffect(() => {
    // Eğer varyant yoksa fiyat aralığını göster
    if (!variantGroups || variantGroups.length === 0) {
      return;
    }
    
    // Varyant varsa, ilk varyantı seç
    if (productDetail.variants && productDetail.variants.length > 0) {
      // İlk varyantı seç
      const firstVariant = productDetail.variants[0];
      
      // Varyant değerlerini oluştur
      const initialSelections: Record<string, string> = {};
      
      if (firstVariant.variantValues && firstVariant.variantValues.length > 0) {
        firstVariant.variantValues.forEach((vv: VariantValue) => {
          if (vv.variantGroup && vv.variantGroup.name) {
            initialSelections[vv.variantGroup.name] = vv.value;
          }
        });
      }
      
      // Seçimleri ayarla
      setSelectedVariants(initialSelections);
      setSelectedVariantId(firstVariant.id);
      setAvailableStock(firstVariant.stock);
      setCurrentPrice(`${firstVariant.price.toFixed(2)} TL`);
    }
  }, [productDetail, variantGroups]);

  // Kategori ve marka verilerini getir
  useEffect(() => {
    const fetchCategoryAndBrand = async () => {
      try {
        // Kategori verilerini getir
        if (productDetail.originalData?.categoryId) {
          const categoryResponse = await fetch(`/api/categories/by-id/${productDetail.originalData.categoryId}`);
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            setCategoryData(categoryData);
          }
        }

        // Marka verilerini getir
        if (productDetail.originalData?.brandId) {
          const brandResponse = await fetch(`/api/brands/by-id/${productDetail.originalData.brandId}`);
          if (brandResponse.ok) {
            const brandData = await brandResponse.json();
            setBrandData(brandData);
          }
        }
      } catch (error) {
        console.error('Kategori veya marka bilgileri alınırken hata:', error);
      }
    };

    fetchCategoryAndBrand();
  }, [productDetail]);
  
  // Varyant seçildiğinde
  const handleVariantChange = (groupName: string, value: string) => {
    const newSelectedVariants = { ...selectedVariants, [groupName]: value }
    setSelectedVariants(newSelectedVariants)
    
    // Tüm varyant grupları için bir seçim yapıldıysa, uygun varyantı bul
    if (Object.keys(newSelectedVariants).length === variantGroups.length) {
      const matchingVariant = findMatchingVariant(newSelectedVariants)
      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id)
        setAvailableStock(matchingVariant.stock)
        // Seçilen varyantın fiyatını ayarla
        setCurrentPrice(`${matchingVariant.price.toFixed(2)} TL`)
      }
    }
  }
  
  // Seçilen varyantlara göre uygun varyantı bul
  const findMatchingVariant = (selections: Record<string, string>) => {
    if (!productDetail.variants) return null
    
    return productDetail.variants.find(variant => {
      // Her bir varyant değerinin seçimlerle eşleşip eşleşmediğini kontrol et
      const variantValues = variant.variantValues || []
      
      // Tüm grup seçimlerinin bu varyant için geçerli olup olmadığını kontrol et
      for (const groupName in selections) {
        const selectedValue = selections[groupName]
        const hasMatchingValue = variantValues.some((vv: VariantValue) => 
          vv.variantGroup?.name === groupName && vv.value === selectedValue
        )
        
        if (!hasMatchingValue) return false
      }
      
      return true
    })
  }
  
  // Sepete ekle
  const addToCart = () => {
    try {
      if (variantGroups?.length > 0 && !selectedVariantId) {
        toast({
          title: "Uyarı",
          description: 'Lütfen tüm seçenekleri belirleyin',
          variant: "destructive"
        });
        return;
      }
      
      if (availableStock < quantity) {
        toast({
          title: "Uyarı",
          description: 'Seçilen miktar stok miktarını aşıyor',
          variant: "destructive"
        });
        return;
      }

      const variantId = selectedVariantId ? Number(selectedVariantId) : undefined;
      
      // Variant ID kontrolü - sadece varyant grupları varsa kontrol ediyoruz
      if (variantGroups?.length > 0 && !variantId) {
        toast({
          title: "Uyarı",
          description: 'Geçerli bir varyant seçilmedi',
          variant: "destructive"
        });
        return;
      }
      
      // Ürünün varyantlara sahip olup olmadığına göre farklı ürün formatı oluştur
      let product;
      
      if (variantGroups?.length > 0 && variantId) {
        // Varyantlı ürün
        product = {
          id: productDetail.id || 0,
          name: productDetail.title,
          imageUrls: [productDetail.images.src1],
          variants: [
            {
              id: variantId,
              price: parseFloat(currentPrice.replace(/[^0-9.]/g, '')),
              stock: availableStock
            }
          ]
        };
      } else {
        // Varyantsız ürün
        product = {
          id: productDetail.id || 0,
          name: productDetail.title,
          imageUrls: [productDetail.images.src1],
          price: parseFloat(currentPrice.replace(/[^0-9.]/g, ''))
        };
      }
      
      // useCart hook'u ile sepete ekle
      addProductToCart(product, quantity, variantId);
    } catch (error) {
      console.error('Sepete ekleme işlemi sırasında hata:', error);
    }
  };
  
  // Favorilere ekle
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    toast({
      title: isFavorite ? 'Ürün favorilerden çıkarıldı' : 'Ürün favorilere eklendi',
      variant: "default",
    })
  }

  // Karşılaştırmaya ekle
  const handleCompare = () => {
    // Ürün bilgilerini hazırla
    const product = {
      id: productDetail.id || 0,
      name: productDetail.title,
      slug: productDetail.title.toLowerCase().replace(/\s+/g, '-'),
      price: parseFloat(currentPrice.replace(/[^0-9.]/g, '')) || 0,
      salePrice: undefined,
      imageUrl: productDetail.images.src1,
      inStock: availableStock > 0,
      attributes: {
        "Marka": "Bilinmiyor",
        "Model": productDetail.title,
        "Stok Durumu": availableStock > 0 ? "Var" : "Yok",
      }
    };
    
    // Karşılaştırmaya ekle/çıkar
    toggleCompare(product);
    
    // Bildirim göster
    toast({
      title: isInCompare(product.id) 
        ? 'Ürün karşılaştırmadan çıkarıldı' 
        : 'Ürün karşılaştırmaya eklendi',
      variant: "default",
    });
  }

  return (
    <div>
      <div className='mb-5 text-3xl font-semibold text-gray-900'>
        {productDetail.title}
      </div>

      <div className='mb-5 flex items-center gap-1'>
        <Star size={15} className="text-yellow-500 fill-yellow-500" />
        <Star size={15} className="text-yellow-500 fill-yellow-500" />
        <Star size={15} className="text-yellow-500 fill-yellow-500" />
        <Star size={15} className="text-yellow-500 fill-yellow-500" />
        <Star size={15} className="text-yellow-500 fill-yellow-500" />
        <div className='pl-2 leading-none'>
          {productDetail.rating}
          <span className='text-gray-900/40'>
            {' '}
            ({productDetail.totalRating}){' '}
          </span>
        </div>
      </div>
      
      <div className='mb-5 flex items-center justify-between border-b pb-8'>
        <span className='text-2xl font-normal text-red-600'>
          {currentPrice}
        </span>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={availableStock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {availableStock > 0 ? "Stokta Var" : "Stokta Yok"}
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            {productDetail.shipping}
          </Badge>
        </div>
      </div>
      
      {/* Kategori ve Marka Bilgileri */}
      <div className='mb-5 flex flex-wrap gap-4'>
        {categoryData && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">Kategori:</span>
            <Link href={`/kategoriler?category=${categoryData.slug}`} className="text-sm text-blue-600 hover:underline">
              {categoryData.name}
            </Link>
          </div>
        )}
        
        {brandData && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">Marka:</span>
            <Link href={`/kategoriler?brand=${brandData.slug}`} className="text-sm text-blue-600 hover:underline">
              {brandData.name}
            </Link>
          </div>
        )}
      </div>
      
      <div className='mb-5 '>
        <h1 className='text-md tracking-wide text-gray-600'>
          {productDetail.description}
        </h1>
      </div>
      
      {/* Varyant Seçimi */}
      {variantGroups.length > 0 && (
        <div className='mb-5'>
          <h3 className='mb-2 font-medium'>Seçenekler</h3>
          <div className="grid grid-cols-1 gap-4 mb-4">
            {variantGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{group.name}</label>
                <Select 
                  onValueChange={(value) => handleVariantChange(group.name, value)}
                  value={selectedVariants[group.name] || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`${group.name} seçin`} />
                  </SelectTrigger>
                  <SelectContent>
                    {group.values && group.values.map((value) => (
                      <SelectItem key={value.id} value={value.value}>
                        {value.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className='mb-5'>
        <h3 className='mb-2 font-medium'>Miktar</h3>
        <div className="flex gap-4 items-center">
          <ProductQuantityInput 
            quantity={quantity} 
            setQuantity={setQuantity}
            max={availableStock}
          />
          <span className="text-sm text-gray-500">
            {availableStock} adet stokta
          </span>
        </div>
      </div>
      
      <div className='mb-10 flex items-center justify-between'>
        <div className='flex w-full gap-4'>
          <Button 
            className='w-3/4 bg-black py-6 hover:bg-black/80'
            onClick={addToCart}
            disabled={availableStock <= 0}
          >
            {availableStock > 0 ? 'Sepete Ekle' : 'Stokta Yok'}
          </Button>
          
          <Button 
            variant="outline" 
            className='flex items-center justify-center gap-2'
            onClick={toggleFavorite}
          >
            <Heart 
              className={isFavorite ? "fill-red-500 text-red-500" : ""} 
              size={20} 
            />
            {isFavorite ? 'Favorilerde' : 'Favorilere Ekle'}
          </Button>
        </div>
      </div>
      
      {/* Karşılaştırma Butonu */}
      <div className='mb-5'>
        <Button 
          variant="outline" 
          className='flex w-full items-center justify-center gap-2 py-6'
          onClick={handleCompare}
        >
          <BarChart2 
            className={isInCompare(productDetail.id || 0) ? "fill-blue-500 text-blue-500" : ""} 
            size={20} 
          />
          {isInCompare(productDetail.id || 0) ? 'Karşılaştırmadan Çıkar' : 'Karşılaştırmaya Ekle'}
        </Button>
      </div>
      
      <Separator className="mb-5" />
      
      <div className='mb-5 flex items-center gap-5 border-b pb-8'>
        <div className='flex items-center gap-3'>
          <Truck className='text-gray-400' />
          <div className='space-y-1'>
            <h1 className='font-medium'>Teslimat</h1>
            <span className='text-sm text-gray-400'>
              {productDetail.delivers}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Package className='text-gray-400' />
          <div className='space-y-1'>
            <h1 className='font-medium'>Kargo</h1>
            <span className='text-sm text-gray-400'>{productDetail.shipping}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-5">
        <h3 className="font-medium">Paylaş:</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full w-9 h-9">
            <Share2 size={16} />
          </Button>
          <ProductShare />
        </div>
      </div>
    </div>
  )
}

export default ProductDescription
