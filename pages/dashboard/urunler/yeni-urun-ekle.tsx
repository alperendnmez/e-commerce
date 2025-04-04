// app/(admin)/products/new/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/router'
import axios from 'axios'
import { toast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageIcon, Trash2 } from 'lucide-react'

type VariantGroup = {
  name: string
  values: string[]
}

// Kategori ve marka için tip tanımları
type Category = {
  id: number;
  name: string;
  slug: string;
}

type Brand = {
  id: number;
  name: string;
  slug: string;
}

// API'ye gönderilecek varyant tipi
type ProductVariant = {
  price: number;
  comparativePrice: number | null;
  costPerItem: number | null;
  stock: number;
  imageUrls: string[];
  sku: string | null;
  barcode: string | null;
  variantValues: Array<{
    value: string;
    variantGroupId: number;
  }>;
};

export default function NewProductPage() {
  const [step, setStep] = useState<number>(1)
  const router = useRouter()
  const { brandId, categoryId } = router.query
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Ürünün temel bilgileri
  const [productData, setProductData] = useState<{
    name: string
    description: string
    seoTitle: string
    seoDescription: string
    brandId: string
    categoryId: string
    published: boolean
    basePrice: number | string // Varyantı olmayan ürünler için temel fiyat
    comparativePrice: number | string // Karşılaştırma fiyatı
    taxIncluded: boolean // Vergi dahil mi
    costPerItem: number | string // Ürün başına maliyet
    stock: number | string // Varyantı olmayan ürünler için stok
    imageUrls: string[] // Varyantı olmayan ürünler için görseller
    sku: string // SKU (Stock Keeping Unit)
    barcode: string // Barkod
    isPhysicalProduct: boolean // Fiziksel ürün mü
    weight: number | string // Ürün ağırlığı
    weightUnit: string // Ağırlık birimi (kg, g, lb, oz)
    countryOfOrigin: string // Menşe ülke/bölge
    hsCode: string // Armonize Sistem (HS) kodu
  }>({
    name: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    brandId: '',
    categoryId: '',
    published: false,
    basePrice: 0, // Varsayılan değer
    comparativePrice: 0, // Varsayılan değer
    taxIncluded: true, // Varsayılan olarak vergi dahil
    costPerItem: 0, // Varsayılan değer
    stock: 0, // Varsayılan değer
    imageUrls: [], // Boş array
    sku: '', // Boş SKU
    barcode: '', // Boş Barkod
    isPhysicalProduct: true, // Varsayılan olarak fiziksel ürün
    weight: '', // Boş ağırlık
    weightUnit: 'kg', // Varsayılan birim kg
    countryOfOrigin: '', // Boş menşe ülke
    hsCode: '' // Boş HS kodu
  })

  // Varyant grupları ve değerleri
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  
  // SKU ve Barkod alanlarını gösterme durumu
  const [showSkuBarcodeFields, setShowSkuBarcodeFields] = useState<boolean>(false)

  // Oluşacak kombinasyonlar
  const combinations: string[][] = generateCombinations(variantGroups)

  // Every combination has price, stock, costPerItem, images
  const [variantsData, setVariantsData] = useState<
    Record<string, { 
      price: number; 
      comparativePrice: number; 
      costPerItem: number; 
      stock: number; 
      images: string[];
      sku: string;
      barcode: string;
    }>
  >({})

  // Kategori ve marka verileri için state
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Kategori ve markaları yükle
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Kategorileri yükle
        const categoriesResponse = await axios.get('/api/categories');
        setCategories(categoriesResponse.data);
        
        // Markaları yükle
        const brandsResponse = await axios.get('/api/brands');
        setBrands(brandsResponse.data);
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Sayfa yüklendiğinde brandId veya categoryId parametresi varsa, onları seçili hale getir
  useEffect(() => {
    // Marka ID'si kontrolü
    if (brandId && typeof brandId === 'string') {
      const brandIdNumber = parseInt(brandId, 10)
      if (!isNaN(brandIdNumber)) {
        setProductData(prev => ({
          ...prev,
          brandId: brandIdNumber.toString()
        }))
      }
    }
    
    // Kategori ID'si kontrolü
    if (categoryId && typeof categoryId === 'string') {
      const categoryIdNumber = parseInt(categoryId, 10)
      if (!isNaN(categoryIdNumber)) {
        setProductData(prev => ({
          ...prev,
          categoryId: categoryIdNumber.toString()
        }))
      }
    }
  }, [brandId, categoryId])

  function generateCombinations(groups: VariantGroup[]): string[][] {
    if (groups.length === 0) return []
    return cartesian(...groups.map(g => g.values))
  }

  // Kartezyen çarpımı fonksiyonu
  function cartesian(...arrays: string[][]): string[][] {
    return arrays.reduce<string[][]>(
      (acc, curr) => {
        const result: string[][] = []
        for (const a of acc) {
          for (const c of curr) {
            result.push([...a, c])
          }
        }
        return result
      },
      [[]]
    )
  }

  // Resim yükleme işleyicisi - Düzeltilmiş versiyon
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, variantKey: string) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    
    // Dosya boyutu kontrolü
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Hata",
        description: `Bazı dosyalar çok büyük (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Resim tipini kontrol et
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const invalidFiles = files.filter(file => !validTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        toast({
          title: "Hata",
          description: `Desteklenmeyen dosya tipi: ${invalidFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Yükleme başladığını bildir
      toast({
        title: "Bilgi",
        description: `${files.length} resim yükleniyor ve optimize ediliyor...`,
      });
      
      // Resimleri sıkıştır
      const compressedImages = await Promise.all(
        files.map(file => compressImage(file))
      );

      // Varyant verilerini güncelle
      setVariantsData(prev => {
        const updatedData = { ...prev };
        const currentImages = updatedData[variantKey]?.images || [];
        updatedData[variantKey] = {
          ...updatedData[variantKey],
          images: [...currentImages, ...compressedImages],
          price: updatedData[variantKey]?.price || 0,
          stock: updatedData[variantKey]?.stock || 0
        };
        return updatedData;
      });
      
      toast({
        title: "Başarılı",
        description: `${files.length} resim yüklendi ve optimize edildi.`,
      });
      
      // Input field'ı temizle
      event.target.value = '';
    } catch (error) {
      console.error("Resim sıkıştırma hatası:", error);
      toast({
        title: "Hata",
        description: "Resim yüklenirken bir hata oluştu",
        variant: "destructive"
      });
      
      // Input field'ı temizle
      event.target.value = '';
    }
  };

  // Resim boyutunu küçültmek için yardımcı fonksiyon
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Resmin orijinal boyutlarını al
          let width = img.width;
          let height = img.height;
          
          // En-boy oranını koru
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * maxHeight / height);
              height = maxHeight;
            }
          }
          
          // Canvas oluştur
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Resmi canvas'a çiz
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context oluşturulamadı'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Canvas içeriğini base64 formatında al
          let format = 'image/jpeg';
          if (file.type === 'image/png') {
            format = 'image/png';
          } else if (file.type === 'image/webp') {
            format = 'image/webp';
          }
          
          resolve(canvas.toDataURL(format, quality));
        };
        img.onerror = () => {
          reject(new Error('Resim yüklenirken hata oluştu'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Resim okunamadı'));
      };
    });
  };

  // Ürün kaydetme işlevi ve yönlendirme
  const saveProduct = async () => {
    setIsSaving(true)
    
    try {
      // Form doğrulaması
      if (!productData.name) {
        throw new Error('Ürün adı gereklidir.')
      }
      
      if (!productData.categoryId) {
        throw new Error('Kategori seçimi gereklidir.')
      }
      
      // Slug oluştur
      const timestamp = new Date().getTime();
      const randomPart = Math.floor(Math.random() * 10000);
      const baseSlug = productData.name.toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const generatedSlug = `${baseSlug}-${randomPart}`;

      // Varyant oluştur (varyant grupları varsa)
      let productVariants: ProductVariant[] = []
      
      // Görsel URL'leri topla
      let allImageUrls: string[] = [];
      
      if (variantGroups.length > 0 && combinations.length > 0) {
        // Her kombinasyon için varyant verilerini oluştur
        productVariants = combinations.map(combo => {
          const comboKey = combo.join('-')
          const variantData = variantsData[comboKey] || { 
            price: 0, 
            comparativePrice: 0, 
            costPerItem: 0, 
            stock: 0, 
            images: [],
            sku: '',
            barcode: ''
          }
          
          // Varyant resimlerini tüm resim listesine ekle
          if (variantData.images && variantData.images.length > 0) {
            allImageUrls = [...allImageUrls, ...variantData.images]
          }
          
          // Varyant değerlerinin referanslarını oluştur
          const variantValues = combo.map((value, index) => ({
            value,
            variantGroupId: index  // Bu sadece geçici bir ID, backend'de doğru ID'ler atanacak
          }))
          
          return {
            price: variantData.price || 0,
            comparativePrice: variantData.comparativePrice || null,
            costPerItem: variantData.costPerItem !== undefined && variantData.costPerItem !== null && variantData.costPerItem !== 0 ? variantData.costPerItem : null,
            stock: variantData.stock || 0,
            imageUrls: variantData.images || [],
            sku: variantData.sku || null,
            barcode: variantData.barcode || null,
            variantValues
          }
        })
    } else {
        // Basit ürün - varyantı yok
        // Ana ürün resmini kullan, varsa
        // Burada basit ürün için bir görsel ekleme işlemi yapılabilir
      }
      
      // API'ye gönderilecek veri
      const productPayload = {
      ...productData,
        brandId: productData.brandId ? parseInt(productData.brandId as string) : null,
        categoryId: parseInt(productData.categoryId as string),
        basePrice: parseFloat(productData.basePrice as string),
        comparativePrice: productData.comparativePrice ? parseFloat(productData.comparativePrice as string) : null,
        taxIncluded: productData.taxIncluded,
        costPerItem: productData.costPerItem && productData.costPerItem !== "" ? parseFloat(productData.costPerItem as string) : null,
        stock: variantGroups.length === 0 ? parseInt(productData.stock as string) : 0,
        slug: generatedSlug,
        variantGroups: variantGroups.map(group => ({
          name: group.name,
          values: group.values
        })),
        variants: productVariants,
        imageUrls: variantGroups.length === 0 ? productData.imageUrls : allImageUrls,
        sku: productData.sku, // SKU (Stok Kodu)
        barcode: productData.barcode // Barkod
      }
      
      console.log('Gönderilen ürün verisi:', productPayload)
      
      // API'ye istek gönder
      const response = await axios.post('/api/products', productPayload)
      
      toast({
        title: "Başarılı",
        description: "Ürün başarıyla oluşturuldu",
      })
      
      // Başarılı ise yönlendir
      router.push('/dashboard/urunler')
    } catch (error) {
      console.error('Ürün kaydetme hatası:', error)
      
      let errorMessage = 'Ürün kaydedilirken bir hata oluştu.'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const [groupName, setGroupName] = useState<string>('')
  const [valueInput, setValueInput] = useState<string>('')

  function addGroup() {
    if (!groupName) return
    setVariantGroups([...variantGroups, { name: groupName, values: [] }])
    setGroupName('')
  }

  function addValueToGroup(index: number) {
    if (!valueInput) return
    const newGroups = [...variantGroups]
    if (!newGroups[index].values.includes(valueInput)) {
      newGroups[index].values.push(valueInput)
      setVariantGroups(newGroups)
      setValueInput('')
    } else {
      toast({
        title: "Uyarı",
        description: `"${valueInput}" değeri zaten eklenmiş.`,
        variant: "destructive"
      })
    }
  }

  const [bulkPrice, setBulkPrice] = useState<string>('')
  const [bulkStock, setBulkStock] = useState<string>('')

  // Toplu fiyat uygulama
  const applyBulkPrice = () => {
    const bulkPriceInput = document.getElementById('bulkPrice') as HTMLInputElement;
    if (!bulkPriceInput || !bulkPriceInput.value) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir fiyat değeri girin.",
        variant: "destructive"
      });
      return;
    }
    
    const price = parseFloat(bulkPriceInput.value);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen geçerli bir fiyat değeri girin.",
        variant: "destructive"
      });
      return;
    }
    
    // Tüm kombinasyonlara aynı fiyatı uygula
    setVariantsData(prev => {
      const updated = { ...prev };
      combinations.forEach(combo => {
        const key = combo.join('-');
        updated[key] = {
          ...updated[key] || { comparativePrice: 0, costPerItem: 0, stock: 0, images: [], sku: '', barcode: '' },
          price
        };
      });
      return updated;
    });
    
    toast({
      title: "Başarılı",
      description: `Tüm kombinasyonlara ${price.toLocaleString('tr-TR')}₺ fiyatı uygulandı.`
    });
  };

  // Toplu stok uygulama
  const applyBulkStock = () => {
    const bulkStockInput = document.getElementById('bulkStock') as HTMLInputElement;
    if (!bulkStockInput || !bulkStockInput.value) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir stok değeri girin.",
        variant: "destructive"
      });
      return;
    }
    
    const stock = parseInt(bulkStockInput.value);
    if (isNaN(stock) || stock < 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen geçerli bir stok değeri girin.",
        variant: "destructive"
      });
      return;
    }
    
    // Tüm kombinasyonlara aynı stok değerini uygula
    setVariantsData(prev => {
      const updated = { ...prev };
      combinations.forEach(combo => {
        const key = combo.join('-');
        updated[key] = {
          ...updated[key] || { price: 0, comparativePrice: 0, costPerItem: 0, images: [], sku: '', barcode: '' },
          stock
        };
      });
      return updated;
    });
    
    toast({
      title: "Başarılı",
      description: `Tüm kombinasyonlara ${stock} adet stok uygulandı.`
    });
  };

  // Kar ve marj hesaplama fonksiyonu
  const calculateProfit = (price: number, cost: number): { profit: number; margin: number } => {
    if (!price || !cost || price <= 0 || cost <= 0) {
      return { profit: 0, margin: 0 };
    }
    
    const profit = price - cost;
    const margin = (profit / price) * 100;
    
    return { profit, margin };
  };

  // Varyant verilerini güncelleme
  const handleVariantDataChange = (comboKey: string, field: 'price' | 'stock' | 'comparativePrice' | 'costPerItem' | 'sku' | 'barcode', value: number | string) => {
    setVariantsData(prev => {
      const updated = { ...prev };
      if (!updated[comboKey]) {
        updated[comboKey] = { price: 0, stock: 0, comparativePrice: 0, costPerItem: 0, images: [], sku: '', barcode: '' };
      }
      
      updated[comboKey] = {
        ...updated[comboKey],
        [field]: value
      };
      
      return updated;
    });
  };

  // Toplu karşılaştırma fiyatı uygulama
  const applyBulkComparativePrice = () => {
    const bulkComparativePriceInput = document.getElementById('bulkComparativePrice') as HTMLInputElement;
    if (!bulkComparativePriceInput || !bulkComparativePriceInput.value) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir karşılaştırma fiyatı girin.",
        variant: "destructive"
      });
      return;
    }
    
    const comparativePrice = parseFloat(bulkComparativePriceInput.value);
    if (isNaN(comparativePrice) || comparativePrice < 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen geçerli bir karşılaştırma fiyatı girin.",
        variant: "destructive"
      });
      return;
    }
    
    // Tüm kombinasyonlara aynı karşılaştırma fiyatını uygula
    setVariantsData(prev => {
      const updated = { ...prev };
      combinations.forEach(combo => {
        const key = combo.join('-');
        updated[key] = {
          ...updated[key] || { price: 0, costPerItem: 0, stock: 0, images: [], sku: '', barcode: '' },
          comparativePrice
        };
      });
      return updated;
    });
    
    toast({
      title: "Başarılı",
      description: `Tüm kombinasyonlara ${comparativePrice.toLocaleString('tr-TR')}₺ karşılaştırma fiyatı uygulandı.`
    });
  };

  // Toplu maliyet uygulama
  const applyBulkCost = () => {
    const bulkCostInput = document.getElementById('bulkCost') as HTMLInputElement;
    if (!bulkCostInput || !bulkCostInput.value) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir maliyet değeri girin.",
        variant: "destructive"
      });
      return;
    }
    
    const costPerItem = parseFloat(bulkCostInput.value);
    if (isNaN(costPerItem) || costPerItem < 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen geçerli bir maliyet değeri girin.",
        variant: "destructive"
      });
      return;
    }
    
    // Tüm kombinasyonlara aynı maliyet değerini uygula
    setVariantsData(prev => {
      const updated = { ...prev };
      combinations.forEach(combo => {
        const key = combo.join('-');
        updated[key] = {
          ...updated[key] || { price: 0, comparativePrice: 0, stock: 0, images: [], sku: '', barcode: '' },
          costPerItem
        };
      });
      return updated;
    });
    
    toast({
      title: "Başarılı",
      description: `Tüm kombinasyonlara ${costPerItem.toLocaleString('tr-TR')}₺ maliyet uygulandı.`
    });
  };

  // Toplu SKU öneki uygulama
  const applyBulkSkuPrefix = () => {
    const bulkSkuPrefixInput = document.getElementById('bulkSkuPrefix') as HTMLInputElement;
    if (!bulkSkuPrefixInput || !bulkSkuPrefixInput.value) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir SKU öneki girin.",
        variant: "destructive"
      });
      return;
    }
    
    const prefix = bulkSkuPrefixInput.value.trim();
    
    // Tüm kombinasyonlara SKU öneki + numarasını uygula
    setVariantsData(prev => {
      const updated = { ...prev };
      combinations.forEach((combo, index) => {
        const key = combo.join('-');
        const variantNumber = (index + 1).toString().padStart(2, '0'); // 01, 02, 03, ...
        
        updated[key] = {
          ...updated[key] || { price: 0, comparativePrice: 0, costPerItem: 0, stock: 0, images: [], barcode: '' },
          sku: `${prefix}-${variantNumber}`
        };
      });
      return updated;
    });
    
    toast({
      title: "Başarılı",
      description: `Tüm kombinasyonlara "${prefix}" SKU öneki uygulandı.`
    });
  };

  // Toplu barkod öneki uygulama
  const applyBulkBarcodePrefix = () => {
    const bulkBarcodePrefixInput = document.getElementById('bulkBarcodePrefix') as HTMLInputElement;
    if (!bulkBarcodePrefixInput || !bulkBarcodePrefixInput.value) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir barkod öneki girin.",
        variant: "destructive"
      });
      return;
    }
    
    const prefix = bulkBarcodePrefixInput.value.trim();
    
    // Tüm kombinasyonlara barkod öneki + numarasını uygula
    setVariantsData(prev => {
      const updated = { ...prev };
      combinations.forEach((combo, index) => {
        const key = combo.join('-');
        const variantNumber = (index + 1).toString().padStart(3, '0'); // 001, 002, 003, ...
        
        updated[key] = {
          ...updated[key] || { price: 0, comparativePrice: 0, costPerItem: 0, stock: 0, images: [], sku: '' },
          barcode: `${prefix}${variantNumber}`
        };
      });
      return updated;
    });
    
    toast({
      title: "Başarılı",
      description: `Tüm kombinasyonlara "${prefix}" barkod öneki uygulandı.`
    });
  };

  // Varyantsız ürün için görsel yükleme
  const handleSimpleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    
    // Dosya boyutu kontrolü
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Hata",
        description: `Bazı dosyalar çok büyük (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Resim tipini kontrol et
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const invalidFiles = files.filter(file => !validTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        toast({
          title: "Hata",
          description: `Desteklenmeyen dosya tipi: ${invalidFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Yükleme başladığını bildir
      toast({
        title: "Bilgi",
        description: `${files.length} resim yükleniyor ve optimize ediliyor...`,
      });
      
      // Resimleri sıkıştır
      const compressedImages = await Promise.all(
        files.map(file => compressImage(file))
      );
      
      // ProductData'yı güncelle
      setProductData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...compressedImages]
      }));
      
      toast({
        title: "Başarılı",
        description: `${files.length} resim yüklendi ve optimize edildi.`,
      });
      
      // Input field'ı temizle
      event.target.value = '';
    } catch (error) {
      console.error("Resim yükleme hatası:", error);
      toast({
        title: "Hata",
        description: "Resim yüklenirken bir hata oluştu",
        variant: "destructive"
      });
      
      // Input field'ı temizle
      event.target.value = '';
    }
  };

  // Varyantsız ürün görseli silme işlevi
  const removeSimpleProductImage = (index: number) => {
      setProductData(prev => ({
        ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
      }));
  };

  return (
    <div className='container mx-auto py-8 px-4 md:px-6 lg:px-8'>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Yeni Ürün Ekle</h1>
        <p className="text-muted-foreground">Ürün bilgilerini girerek yeni bir ürün oluşturun.</p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-blue-800">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          <div>
            <h3 className="font-medium text-blue-800">Ürün Ekleme İpuçları</h3>
            <ul className="mt-1 text-sm list-disc list-inside ml-1">
              <li>Ürün adı ve kategori seçimi zorunludur.</li>
              <li>Varyant eklediğinizde, her kombinasyon için fiyat ve stok bilgisi girmelisiniz.</li>
              <li>Ürün görselleri 5MB'dan küçük olmalıdır.</li>
              <li>Varyant eklemek isteğe bağlıdır.</li>
            </ul>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <Card className="flex items-center justify-center p-8 min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent mb-4"></div>
            <p className="text-muted-foreground">Veriler yükleniyor...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Adım göstergeleri - iyileştirilmiş UI */}
          <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-2">
              <div className={`flex flex-col items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                <span className="text-sm font-medium">Ürün Bilgileri</span>
              </div>
              <div className="grow mx-2 flex items-center">
                <div className={`h-1.5 w-full rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
              </div>
              <div className={`flex flex-col items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                <span className="text-sm font-medium">Varyantlar</span>
              </div>
              <div className="grow mx-2 flex items-center">
                <div className={`h-1.5 w-full rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
              </div>
              <div className={`flex flex-col items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
                <span className="text-sm font-medium">Kombinasyonlar</span>
              </div>
            </div>
          </div>

          <Card className="mb-8 shadow-sm">
            {step === 1 && (
              <>
                <CardHeader className="border-b">
                  <CardTitle>Ürün Bilgileri</CardTitle>
                  <CardDescription>Ürünün temel bilgilerini girin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 p-6">
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Temel Bilgiler</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Ürün Adı <span className="text-red-500">*</span></Label>
                        <Input
                          id="name"
                          value={productData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="Ürün adı"
                          className="h-10"
                          required
                        />
                      </div>
                      
                      {/* Varyant grubu yoksa basePrice göster */}
                      {variantGroups.length === 0 && (
                        <>
                        <div className="space-y-2">
                            <Label htmlFor="basePrice" className="text-sm font-medium">Ürün Fiyatı (₺) <span className="text-red-500">*</span></Label>
                          <Input
                            id="basePrice"
                            type="number"
                            value={productData.basePrice}
                            onChange={(e) => handleChange('basePrice', e.target.value)}
                            placeholder="Ürün fiyatı"
                            className="h-10"
                            required
                          />
                          <p className="text-xs text-muted-foreground">Varyantı olmayan ürünler için temel fiyat</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="stock" className="text-sm font-medium">Stok Miktarı <span className="text-red-500">*</span></Label>
                            <Input
                              id="stock"
                              type="number"
                              value={productData.stock}
                              onChange={(e) => handleChange('stock', e.target.value)}
                              placeholder="Stok miktarı"
                              className="h-10"
                              required
                            />
                            <p className="text-xs text-muted-foreground">Varyantı olmayan ürünler için stok miktarı</p>
                          </div>
                        </>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="comparativePrice" className="text-sm font-medium">Karşılaştırma Fiyatı (₺)</Label>
                        <Input
                          id="comparativePrice"
                          type="number"
                          placeholder="Karşılaştırma fiyatını girin..."
                          value={productData.comparativePrice.toString()}
                          onChange={(e) => handleChange('comparativePrice', e.target.value)}
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Önceki fiyat veya piyasa fiyatı girebilirsiniz.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="costPerItem" className="text-sm font-medium">Ürün Başına Maliyet (₺)</Label>
                        <Input
                          id="costPerItem"
                          type="number"
                          placeholder="Ürün maliyetini girin..."
                          value={productData.costPerItem.toString()}
                          onChange={(e) => handleChange('costPerItem', e.target.value)}
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Ürün başına düşen maliyet</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="categoryId" className="text-sm font-medium">Kategori <span className="text-red-500">*</span></Label>
                        <Select
                          value={productData.categoryId}
                          onValueChange={(value) => setProductData({ ...productData, categoryId: value })}
                        >
                          <SelectTrigger id="categoryId" className="h-10">
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Kategori seçilmedi</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Ürünün kategorisini seçin
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="brandId" className="text-sm font-medium">Marka</Label>
                        <Select
                          value={productData.brandId}
                          onValueChange={(value) => {
                            setProductData({
                              ...productData,
                              brandId: value
                            })
                          }}
                        >
                          <SelectTrigger id="brandId" className="h-10">
                            <SelectValue placeholder="Marka seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Marka seçilmedi</SelectItem>
                            {brands.length > 0 ? (
                              brands.map((brand) => (
                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                  {brand.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no_brands" disabled>
                                Marka bulunamadı. Önce marka ekleyin.
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Ürünün markasını seçin
                        </p>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full flex items-center justify-center h-10"
                          onClick={() => setShowSkuBarcodeFields(!showSkuBarcodeFields)}
                        >
                          {showSkuBarcodeFields ? "SKU ve Barkod Alanlarını Gizle" : "SKU veya Barkod Ekle"}
                        </Button>
                      </div>
                      
                      {showSkuBarcodeFields && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="sku" className="text-sm font-medium">SKU (Stok Kodu)</Label>
                            <Input
                              id="sku"
                              placeholder="SKU kodunu girin..."
                              value={productData.sku}
                              onChange={(e) => handleChange('sku', e.target.value)}
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">Stok takibi için benzersiz ürün kodu</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="barcode" className="text-sm font-medium">Barkod</Label>
                            <Input
                              id="barcode"
                              placeholder="Barkod numarasını girin..."
                              value={productData.barcode}
                              onChange={(e) => handleChange('barcode', e.target.value)}
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">Ürün barkod numarası (EAN, UPC, vb.)</p>
                          </div>
                        </>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="taxIncluded" className="text-sm font-medium">Bu üründen vergi al</Label>
                          <Switch
                            id="taxIncluded"
                            checked={productData.taxIncluded}
                            onCheckedChange={(checked) => setProductData(prev => ({ ...prev, taxIncluded: checked }))}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Ürün fiyatına KDV dahil edilecek</p>
                      </div>
                      
                      {/* Kar ve Kar marjı hesaplaması - yalnızca taxIncluded false ise */}
                      {!productData.taxIncluded && productData.costPerItem && productData.basePrice && variantGroups.length === 0 && (
                        <div className="p-4 border rounded-md bg-muted/10 col-span-2">
                          <h3 className="text-sm font-medium mb-3">Kar Hesabı</h3>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Maliyet:</span>
                              <span className="ml-2 font-medium">
                                {Number(productData.costPerItem).toLocaleString('tr-TR')}₺
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Kar:</span>
                              <span className="ml-2 font-medium">
                                {(Number(productData.basePrice) - Number(productData.costPerItem)).toLocaleString('tr-TR')}₺
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Kar Marjı:</span>
                              <span className="ml-2 font-medium">
                                %{calculateProfit(Number(productData.basePrice), Number(productData.costPerItem)).margin.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                 
                  {/* Kargo Bilgileri */}
                  <div className="space-y-6 pt-4 border-t">
                    <h2 className="text-lg font-semibold">Kargo Bilgileri</h2>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isPhysicalProduct" className="text-sm font-medium">Bu bir fiziksel üründür</Label>
                        <Switch
                          id="isPhysicalProduct"
                          checked={productData.isPhysicalProduct}
                          onCheckedChange={(checked) => setProductData(prev => ({ ...prev, isPhysicalProduct: checked }))}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Dijital ürünler için kapatın</p>
                    </div>

                    {productData.isPhysicalProduct && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="md:col-span-2 grid grid-cols-3 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="weight" className="text-sm font-medium">Ağırlık</Label>
                            <Input
                              id="weight"
                              type="number"
                              step="0.01"
                              placeholder="Ürün ağırlığı"
                              value={productData.weight.toString()}
                              onChange={(e) => handleChange('weight', e.target.value)}
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">Ürünün paketlenmiş ağırlığı</p>
                          </div>
                          <div className="col-span-1 space-y-2">
                            <Label htmlFor="weightUnit" className="text-sm font-medium">Birim</Label>
                            <Select
                              value={productData.weightUnit}
                              onValueChange={(value) => setProductData({ ...productData, weightUnit: value })}
                            >
                              <SelectTrigger id="weightUnit" className="h-10">
                                <SelectValue placeholder="Birim seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                                <SelectItem value="oz">oz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="countryOfOrigin" className="text-sm font-medium">Menşe Ülke/Bölge</Label>
                          <Select
                            value={productData.countryOfOrigin}
                            onValueChange={(value) => setProductData({ ...productData, countryOfOrigin: value })}
                          >
                            <SelectTrigger id="countryOfOrigin" className="h-10">
                              <SelectValue placeholder="Menşe ülke seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TR">Türkiye</SelectItem>
                              <SelectItem value="CN">Çin</SelectItem>
                              <SelectItem value="US">Amerika Birleşik Devletleri</SelectItem>
                              <SelectItem value="DE">Almanya</SelectItem>
                              <SelectItem value="IT">İtalya</SelectItem>
                              <SelectItem value="FR">Fransa</SelectItem>
                              <SelectItem value="GB">Birleşik Krallık</SelectItem>
                              <SelectItem value="JP">Japonya</SelectItem>
                              <SelectItem value="KR">Güney Kore</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Ürünün üretildiği veya geldiği ülke</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="hsCode" className="text-sm font-medium">Armonize Sistem (HS) Kodu</Label>
                          <Input
                            id="hsCode"
                            placeholder="HS kodunu girin..."
                            value={productData.hsCode}
                            onChange={(e) => handleChange('hsCode', e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-muted-foreground">Uluslararası gönderimler için gereklidir</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Ürün Görselleri */}
                  <div className="space-y-6 pt-4 border-t">
                    <h2 className="text-lg font-semibold">Ürün Görselleri</h2>
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md bg-muted/10">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <div className="text-center space-y-2 mb-4">
                        <h3 className="font-medium">Görselleri buraya sürükleyin</h3>
                        <p className="text-sm text-muted-foreground">
                          veya bilgisayarınızdan seçin (Maksimum 5MB)
                        </p>
                      </div>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={false}
                          size="sm"
                        >
                          Görsel Seç
                        </Button>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleSimpleProductImageUpload(e)}
                        />
                      </div>
                    </div>

                    {/* Varyantsız ürün için yüklenen görseller */}
                    {productData.imageUrls.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium mb-3">Yüklenen Görseller ({productData.imageUrls.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {productData.imageUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-md overflow-hidden border border-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Ürün görseli ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7"
                                onClick={() => removeSimpleProductImage(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Ürün Açıklaması */}
                  <div className="space-y-6 pt-4 border-t">
                    <h2 className="text-lg font-semibold">Ürün Açıklaması</h2>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Ürün Açıklaması</Label>
                      <Textarea
                        id="description"
                        placeholder='Ürün açıklamasını girin'
                        value={productData.description}
                        onChange={e => setProductData({ ...productData, description: e.target.value })}
                        className="min-h-[120px] resize-y"
                      />
                    </div>
                  </div>
                  
                  {/* SEO Bilgileri */}
                  <div className="space-y-6 pt-4 border-t">
                    <h2 className="text-lg font-semibold">SEO Bilgileri</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="seoTitle" className="text-sm font-medium">SEO Başlığı</Label>
                        <Input
                          id="seoTitle"
                          placeholder='SEO başlığını girin'
                          value={productData.seoTitle}
                          onChange={e => setProductData({ ...productData, seoTitle: e.target.value })}
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Arama motorlarında görünecek başlık
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="seoDescription" className="text-sm font-medium">SEO Açıklaması</Label>
                        <Textarea
                          id="seoDescription"
                          placeholder='SEO açıklamasını girin'
                          value={productData.seoDescription}
                          onChange={e => setProductData({ ...productData, seoDescription: e.target.value })}
                          className="min-h-[80px] resize-y"
                        />
                        <p className="text-xs text-muted-foreground">
                          Arama motorlarında görünecek açıklama
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Yayın Durumu */}
                  <div className="flex items-center space-x-2 pt-4 border-t">
                    <Checkbox 
                      id="published" 
                      checked={productData.published}
                      onCheckedChange={(checked) => 
                        setProductData({ ...productData, published: checked === true })
                      } 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="published"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Ürünü yayınla
                      </label>
                      <p className="text-xs text-muted-foreground">
                        İşaretlenirse ürün sitede görünür olacaktır
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t py-4 px-6">
                  <Button variant="outline" disabled className="min-w-[100px]">
                    Geri
                  </Button>
                  <Button
                    onClick={() => {
                      // Temel bilgileri doğrula
                      if (!productData.name) {
                        toast({
                          title: "Uyarı",
                          description: "Lütfen ürün adını girin.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      if (!productData.categoryId || productData.categoryId === "0") {
                        toast({
                          title: "Uyarı",
                          description: "Lütfen bir kategori seçin.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // Bir sonraki adıma geç
                      setStep(2);
                    }}
                    className="min-w-[150px]"
                  >
                    Devam Et
                  </Button>
                </CardFooter>
              </>
            )}

            {/* Varyantlar Adımı - İyileştirilmiş */}
            {step === 2 && (
              <>
                <CardHeader className="border-b">
                  <CardTitle>Varyant Grupları</CardTitle>
                  <CardDescription>Ürün varyantlarını ekleyin (renk, beden, vb.)</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="groupName" className="text-sm font-medium">Varyant Grubu Adı</Label>
                          <Input
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Örn: Renk, Beden, Malzeme"
                            className="h-10"
                          />
                        </div>
                        <Button 
                          onClick={addGroup}
                          disabled={!groupName}
                          className="h-10"
                        >
                          Grup Ekle
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {variantGroups.map((group, i) => (
                          <Card key={i} className="overflow-hidden shadow-sm">
                            <CardHeader className="py-3 px-4 bg-muted/20 flex flex-row items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{group.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {group.values.length} değer
                                </Badge>
                              </div>
                              <Button
                                variant="ghost" 
                                size="sm"
                                className="h-8 text-destructive hover:text-destructive/90"
                                onClick={() => {
                                  setVariantGroups(groups => groups.filter((_, index) => index !== i));
                                }}
                              >
                                Sil
                              </Button>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div>
                                <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3">
                                  <div className="space-y-2 flex-1">
                                    <Label htmlFor={`valueInput-${i}`} className="text-sm font-medium">Değer Ekle</Label>
                                    <Input
                                      id={`valueInput-${i}`}
                                      value={valueInput}
                                      onChange={(e) => setValueInput(e.target.value)}
                                      placeholder="Örn: Kırmızı, XL, Pamuklu"
                                      className="h-10"
                                    />
                                  </div>
                                  <Button 
                                    size="sm"
                                    onClick={() => addValueToGroup(i)}
                                    disabled={!valueInput}
                                    className="h-10"
                                  >
                                    Değer Ekle
                                  </Button>
                                </div>
                                
                                {group.values.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-4">
                                    {group.values.map((val, j) => (
                                      <Badge key={j} variant="secondary" className="pl-3 pr-2 py-1.5 text-sm gap-1.5 flex items-center">
                                        {val}
                                        <button 
                                          className="ml-1 text-muted-foreground hover:text-destructive rounded-full flex items-center justify-center w-4 h-4"
                                          onClick={() => {
                                            const newGroups = [...variantGroups];
                                            newGroups[i].values = newGroups[i].values.filter((_, index) => index !== j);
                                            setVariantGroups(newGroups);
                                          }}
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground mt-2">Henüz değer eklenmedi</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    {variantGroups.length === 0 && (
                      <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/10">
                        <div className="text-center p-4">
                          <p className="text-muted-foreground font-medium mb-2">Henüz varyant grubu eklenmedi</p>
                          <p className="text-sm text-muted-foreground">Varyant eklemezseniz, tek bir ürün kaydedilecektir</p>
                          <p className="text-xs text-muted-foreground mt-4">Örn: Renk, Beden, Malzeme vb.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t py-4 px-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="min-w-[100px]"
                  >
                    Geri
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Varyant grubu olmadan doğrudan kaydet
                        if (!productData.basePrice || parseFloat(String(productData.basePrice)) <= 0) {
                          toast({
                            title: "Uyarı",
                            description: "Varyantı olmayan ürünler için geçerli bir fiyat girmelisiniz.",
                            variant: "destructive"
                          });
                          setStep(1);
                          return;
                        }
                        
                        // Varyant olmadan ilerliyoruz, boş array kullanarak
                        setVariantGroups([]);
                        setStep(3);
                        toast({
                          title: "Bilgi",
                          description: "Varyant olmadan ürün eklenecek.",
                        });
                      }}
                      className="min-w-[140px]"
                    >
                      Varyantları Atla
                    </Button>
                    <Button 
                      onClick={() => {
                        if (variantGroups.length === 0) {
                          toast({
                            title: "Uyarı",
                            description: "Lütfen en az bir varyant grubu ekleyin.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Boş değer kontrolü
                        const emptyGroups = variantGroups.filter(g => g.values.length === 0);
                        if (emptyGroups.length > 0) {
                          toast({
                            title: "Uyarı",
                            description: `Lütfen tüm varyant gruplarına en az bir değer ekleyin: ${emptyGroups.map(g => g.name).join(', ')}`,
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        setStep(3);
                      }}
                      disabled={variantGroups.length === 0}
                      className="min-w-[180px]"
                    >
                      Kombinasyon Oluştur
                    </Button>
                  </div>
                </CardFooter>
              </>
            )}

            {/* Kombinasyonlar Adımı - İyileştirilmiş */}
            {step === 3 && (
              <>
                <CardHeader className="border-b">
                  <CardTitle>Varyant Kombinasyonları</CardTitle>
                  <CardDescription>Her kombinasyon için fiyat, stok ve görsel bilgilerini girin</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {combinations.length === 0 && (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/10">
                      <div className="text-center p-6">
                        {variantGroups.length === 0 ? (
                          <>
                            <p className="text-muted-foreground font-medium mb-2">Bu ürün varyantları olmadan kaydedilecek.</p>
                            <p className="text-muted-foreground mt-3">Ürün fiyatı: <span className="font-medium">{parseFloat(String(productData.basePrice)).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'})}</span></p>
                            <Button 
                              variant="outline" 
                              className="mt-6"
                              onClick={() => setStep(1)}
                            >
                              Fiyatı Düzenle
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground font-medium mb-2">Varyant grupları eklenmedi veya değer girilmedi.</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setStep(2)}
                            >
                              Varyant Ekle
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {combinations.length > 0 && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-800">
                        <h3 className="text-sm font-medium mb-2">Bilgi</h3>
                        <p className="text-sm">
                          Varyant gruplarınıza göre oluşturulan tüm kombinasyonlar aşağıda listelenmiştir. Her kombinasyon için fiyat, stok ve görsel bilgilerini girmeniz gerekmektedir.
                        </p>
                      </div>
                      
                      {/* Toplu İşlemler Paneli - İyileştirilmiş */}
                      <Card className="shadow-sm">
                        <CardHeader className="py-3 px-4 border-b">
                          <CardTitle className="text-base">Toplu İşlemler</CardTitle>
                          <CardDescription>Tüm kombinasyonlara aynı değerleri uygulamak için kullanın</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Toplu Fiyat */}
                            <div className="space-y-2">
                              <Label htmlFor="bulkPrice" className="text-sm font-medium">Tüm Kombinasyonlar İçin Fiyat</Label>
                              <div className="flex space-x-2">
                                  <Input
                                    id="bulkPrice"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Fiyat"
                                    className="h-10"
                                  />
                                <Button onClick={applyBulkPrice} size="sm" className="h-10">
                                  Uygula
                                </Button>
                              </div>
                            </div>
                            
                            {/* Toplu Karşılaştırma Fiyatı */}
                            <div className="space-y-2">
                              <Label htmlFor="bulkComparativePrice" className="text-sm font-medium">Tüm Kombinasyonlar İçin Karşılaştırma Fiyatı</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="bulkComparativePrice"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Karşılaştırma Fiyatı"
                                  className="h-10"
                                />
                                <Button onClick={applyBulkComparativePrice} size="sm" className="h-10">
                                  Uygula
                                </Button>
                              </div>
                            </div>
                            
                            {/* Toplu Stok */}
                            <div className="space-y-2">
                              <Label htmlFor="bulkStock" className="text-sm font-medium">Tüm Kombinasyonlar İçin Stok</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="bulkStock"
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="Stok miktarı"
                                  className="h-10"
                                />
                                <Button onClick={applyBulkStock} size="sm" className="h-10">
                                  Uygula
                                </Button>
                              </div>
                            </div>

                            {/* Toplu Maliyet */}
                            <div className="space-y-2">
                              <Label htmlFor="bulkCost" className="text-sm font-medium">Tüm Kombinasyonlar İçin Maliyet</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="bulkCost"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Maliyet"
                                  className="h-10"
                                />
                                <Button onClick={applyBulkCost} size="sm" className="h-10">
                                  Uygula
                                </Button>
                              </div>
                            </div>
                        
                            {/* Toplu SKU Öneki */}
                            <div className="space-y-2">
                              <Label htmlFor="bulkSkuPrefix" className="text-sm font-medium">SKU Öneki + Varyant ID</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="bulkSkuPrefix"
                                  type="text"
                                  placeholder="SKU Öneki (ör: TSHIRT-001)"
                                  className="h-10"
                                />
                                <Button onClick={applyBulkSkuPrefix} size="sm" className="h-10">
                                  Uygula
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">Her varyant için öneke "-1", "-2", ... eklenir</p>
                            </div>
                            
                            {/* Toplu Barkod Öneki */}
                            <div className="space-y-2">
                              <Label htmlFor="bulkBarcodePrefix" className="text-sm font-medium">Barkod Öneki + Varyant ID</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="bulkBarcodePrefix"
                                  type="text"
                                  placeholder="Barkod Öneki (ör: 978000)"
                                  className="h-10"
                                />
                                <Button onClick={applyBulkBarcodePrefix} size="sm" className="h-10">
                                  Uygula
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">Her varyant için öneke "001", "002", ... eklenir</p>
                            </div>

                            {/* Bu üründen vergi al */}
                            <div className="space-y-2 md:col-span-3 pt-2 border-t mt-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="taxIncludedVariants" className="text-sm font-medium">Bu üründen vergi al</Label>
                                <Switch
                                  id="taxIncludedVariants"
                                  checked={productData.taxIncluded}
                                  onCheckedChange={(checked) => setProductData(prev => ({ ...prev, taxIncluded: checked }))}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">Ürün fiyatına KDV dahil edilecek</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Varyant kombinasyonları tablosu - İyileştirilmiş */}
                      <div className="border rounded-md shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30 border-b">
                              <th className="py-3 px-4 text-left font-medium">Kombinasyon</th>
                              <th className="py-3 px-4 text-right font-medium">Fiyat (₺)</th>
                              <th className="py-3 px-4 text-right font-medium">Karşılaştırma Fiyatı (₺)</th>
                              <th className="py-3 px-4 text-right font-medium">Maliyet (₺)</th>
                              <th className="py-3 px-4 text-right font-medium">Stok</th>
                              <th className="py-3 px-4 text-right font-medium">SKU</th>
                              <th className="py-3 px-4 text-right font-medium">Barkod</th>
                              <th className="py-3 px-4 text-right font-medium">Görseller</th>
                              {!productData.taxIncluded && <th className="py-3 px-4 text-right font-medium">Kar / Marj</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {combinations.map((combo, index) => {
                              const comboKey = combo.join('-');
                              const variantData = variantsData[comboKey] || { price: 0, comparativePrice: 0, costPerItem: 0, stock: 0, images: [], sku: '', barcode: '' };
                              const { profit, margin } = calculateProfit(variantData.price, variantData.costPerItem);
                              
                              return (
                                <tr 
                                  key={comboKey}
                                  className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                                >
                                  <td className="py-3 px-4">
                                    {combo.map((value, i) => (
                                      <span key={i} className="inline-block">
                                        {i > 0 && <span className="text-muted-foreground mx-1">/</span>}
                                        <Badge variant="outline" className="font-medium">{value}</Badge>
                                      </span>
                                    ))}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                      <Input
                                      type="number"
                                        min="0"
                                        step="0.01"
                                      value={variantData.price || 0}
                                      onChange={(e) => 
                                        handleVariantDataChange(comboKey, 'price', parseFloat(e.target.value))
                                      }
                                      className="w-24 h-9 ml-auto"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={variantData.comparativePrice || 0}
                                      onChange={(e) => 
                                        handleVariantDataChange(comboKey, 'comparativePrice', parseFloat(e.target.value))
                                      }
                                      className="w-24 h-9 ml-auto"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={variantData.costPerItem || 0}
                                      onChange={(e) => 
                                        handleVariantDataChange(comboKey, 'costPerItem', parseFloat(e.target.value))
                                      }
                                      className="w-24 h-9 ml-auto"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={variantData.stock || 0}
                                      onChange={(e) => 
                                        handleVariantDataChange(comboKey, 'stock', parseInt(e.target.value))
                                      }
                                      className="w-24 h-9 ml-auto"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="text"
                                      value={variantData.sku || ''}
                                      onChange={(e) => 
                                        handleVariantDataChange(comboKey, 'sku', e.target.value)
                                      }
                                      className="w-24 h-9 ml-auto"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="text"
                                      value={variantData.barcode || ''}
                                      onChange={(e) => 
                                        handleVariantDataChange(comboKey, 'barcode', e.target.value)
                                      }
                                      className="w-24 h-9 ml-auto"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                      <div className="flex-shrink-0">
                                        {variantData.images && variantData.images.length > 0 && (
                                          <Badge variant="outline">
                                            {variantData.images.length} görsel
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0">
                                        <label className="block w-auto cursor-pointer px-2 py-1 text-xs border border-muted rounded hover:bg-muted/20 transition-colors text-center">
                                          Görsel Seç
                                          <input
                                            type="file" 
                                            accept="image/*" 
                                            multiple
                                            onChange={(e) => handleImageUpload(e, comboKey)} 
                                            className="hidden"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </td>
                                  {!productData.taxIncluded && (
                                    <td className="py-3 px-4 text-right">
                                      <div className="text-xs">
                                        <div className="font-medium">{profit.toFixed(2)}₺</div>
                                        <div className="text-muted-foreground">%{margin.toFixed(2)}</div>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t py-4 px-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(2)}
                    disabled={isSaving}
                    className="min-w-[100px]"
                  >
                    Geri
                  </Button>
                  <Button
                    onClick={saveProduct}
                    disabled={variantGroups.length > 0 && combinations.length === 0 || isSaving}
                    className="min-w-[150px]"
                  >
                    {isSaving ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                        Kaydediliyor...
                      </>
                    ) : (
                      "Ürünü Kaydet"
                    )}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </>
      )}

      {/* Resim yükleme input'ları için CSS gizleme */}
      <style jsx>{`
        .hidden-file-input {
          display: none;
        }
      `}</style>
    </div>
  )
}
