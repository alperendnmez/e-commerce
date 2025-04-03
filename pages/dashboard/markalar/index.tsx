// pages/dashboard/markalar/index.tsx
import React, { ReactElement, useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  X, 
  Search,
  Image as ImageIcon,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Star,
  Loader2,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Download,
  FileJson,
  FileSpreadsheet,
  LayoutList,
  LayoutGrid,
  ToggleLeft,
  Edit
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import Image from 'next/image'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

// Marka şeması
const brandSchema = z.object({
  name: z.string().min(2, {
    message: 'Marka adı en az 2 karakter olmalıdır.',
  }),
  description: z.string().optional(),
  content: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().optional().default(0),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  archivedAt: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  showInHeader: z.boolean().default(true),
  showInFooter: z.boolean().default(false),
  showInSidebar: z.boolean().default(true),
  productListingType: z.string().optional(),
  productsPerPage: z.coerce.number().int().optional().default(12),
  defaultSortOrder: z.string().optional(),
})

type BrandFormValues = z.infer<typeof brandSchema>

// Marka tipi
interface Brand {
  id: number
  name: string
  description: string | null
  content: string | null
  slug: string
  logoUrl: string | null
  bannerUrl: string | null
  coverImageUrl: string | null
  isActive: boolean
  displayOrder: number
  isFeatured: boolean
  isArchived: boolean
  archivedAt: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  showInHeader: boolean
  showInFooter: boolean
  showInSidebar: boolean
  productListingType: string | null
  productsPerPage: number
  defaultSortOrder: string | null
  createdAt?: string
  updatedAt?: string
  productCount?: number
}

export default function BrandsPage() {
  const { toast } = useToast()
  
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showInactive, setShowInactive] = useState<boolean>(false)
  const [selectedBrands, setSelectedBrands] = useState<number[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState({
    isActive: 'all', // 'all', 'active', 'inactive'
    isFeatured: 'all', // 'all', 'featured', 'notFeatured'
    isArchived: 'all', // 'all', 'archived', 'notArchived'
    sortBy: 'displayOrder', // 'displayOrder', 'name', 'createdAt'
    sortOrder: 'asc', // 'asc', 'desc'
    dateRange: 'all', // 'all', 'today', 'thisWeek', 'thisMonth', 'thisYear'
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Form tanımla
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      description: '',
      content: '',
      logoUrl: '',
      isActive: true,
      displayOrder: 0,
      isFeatured: false,
      isArchived: false,
      archivedAt: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      showInHeader: true,
      showInFooter: false,
      showInSidebar: true,
      productListingType: 'grid',
      productsPerPage: 12,
      defaultSortOrder: 'name_asc',
    }
  })
  
  // Markaları yükle
  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/brands')
      setBrands(response.data)
      setError(null)
    } catch (err: any) {
      console.error('Markalar yüklenirken hata:', err)
      setError('Markalar yüklenirken bir hata oluştu')
      setBrands([])
    } finally {
      setLoading(false)
    }
  }
  
  // Sayfa yüklendiğinde markaları getir
  useEffect(() => {
    fetchBrands()
  }, [])
  
  // Görsel optimizasyonu
  const optimizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        const img = document.createElement('img');
        img.src = event.target.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          }, 'image/jpeg', 0.8); // 0.8 kalite ile JPEG olarak sıkıştır
        };
        img.onerror = () => {
          reject(new Error('Image loading failed'));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };
  
  // Logo değişimi
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }
  
  // Logo yükleme
  const handleLogoUpload = async () => {
    if (!logoFile) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Görsel optimizasyonu uygula
      const optimizedFile = await optimizeImage(logoFile);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('width', '300');
      formData.append('height', '300');
      formData.append('quality', '90');
      
      // Dosyayı özel logo endpoint'ine yükle
      const response = await axios.post('/api/upload/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        }
      });

      console.log('Logo upload response:', response.data);

      // Logo URL'sini form'a set et
      form.setValue('logoUrl', response.data.url);
      
      // Önizlemeyi temizle
      setLogoPreview(null);
      setLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'Başarılı',
        description: 'Logo başarıyla yüklendi',
      });
    } catch (err: any) {
      console.error('Logo yüklenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Logo yüklenirken bir hata oluştu'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Logo önizlemesini temizle
  const clearLogoPreview = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Form gönderme işlemi
  const onSubmit = async (values: BrandFormValues) => {
    try {
      // Kaydet butonuna basıldığını göstermek için konsola yazdır
      console.log('Kaydet butonuna basıldı, API isteği gönderiliyor...');
      console.log('Gönderilecek veriler:', {
        ...values,
        description: values.description || null,
        content: values.content || null,
        logoUrl: values.logoUrl || null,
        bannerUrl: values.bannerUrl || null,
        coverImageUrl: values.coverImageUrl || null,
        displayOrder: Number(values.displayOrder) || 0,
        isFeatured: Boolean(values.isFeatured),
        isArchived: Boolean(values.isArchived),
        archivedAt: values.archivedAt || null,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords || null,
        showInHeader: Boolean(values.showInHeader),
        showInFooter: Boolean(values.showInFooter),
        showInSidebar: Boolean(values.showInSidebar),
        productListingType: values.productListingType || null,
        productsPerPage: Number(values.productsPerPage) || 12,
        defaultSortOrder: values.defaultSortOrder || null,
      });

      const response = await axios.post('/api/brands', {
        ...values,
        description: values.description || null,
        content: values.content || null,
        logoUrl: values.logoUrl || null,
        bannerUrl: values.bannerUrl || null,
        coverImageUrl: values.coverImageUrl || null,
        displayOrder: Number(values.displayOrder) || 0,
        isFeatured: Boolean(values.isFeatured),
        isArchived: Boolean(values.isArchived),
        archivedAt: values.archivedAt || null,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords || null,
        showInHeader: Boolean(values.showInHeader),
        showInFooter: Boolean(values.showInFooter),
        showInSidebar: Boolean(values.showInSidebar),
        productListingType: values.productListingType || null,
        productsPerPage: Number(values.productsPerPage) || 12,
        defaultSortOrder: values.defaultSortOrder || null,
      });
      
      // Yanıtı konsola yazdır
      console.log('API yanıtı:', response.data);
      
      toast({
        title: 'Başarılı',
        description: 'Yeni marka eklendi',
      });
      
      // Markaları yeniden yükle
      fetchBrands();
      
      // Formu sıfırla ve dialogu kapat
      form.reset();
      setIsDialogOpen(false);
      
      // Logo önizlemesini temizle
      clearLogoPreview();
    } catch (err: any) {
      console.error('Marka eklenirken hata:', err);
      
      // Hata detaylarını konsola yazdır
      if (err.response) {
        // Sunucu yanıtı ile dönen hata
        console.error('Hata yanıtı:', err.response.data);
        console.error('Hata durumu:', err.response.status);
        console.error('Hata başlıkları:', err.response.headers);
      } else if (err.request) {
        // İstek yapıldı ama yanıt alınamadı
        console.error('İstek yapıldı ama yanıt alınamadı:', err.request);
      } else {
        // İstek oluşturulurken bir şeyler yanlış gitti
        console.error('Hata mesajı:', err.message);
      }
      
      toast({
        title: 'Hata!',
        description: err.response?.data?.error || err.message || 'Marka eklenirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  }
  
  // Marka silme işlemi
  const handleDelete = async (slug: string) => {
    if (!confirm('Bu markayı silmek istediğinize emin misiniz?')) {
      return
    }
    
    try {
      await axios.delete(`/api/brands/slug/${slug}`);
      toast({ 
        title: 'Başarılı', 
        description: 'Marka silindi' 
      })
      fetchBrands()
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: err.response?.data?.message || 'Marka silinirken hata oluştu',
        variant: 'destructive'
      })
    }
  }
  
  // Tek bir markanın durumunu değiştir (aktif/pasif)
  const toggleBrandStatus = async (slug: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/api/brands/slug/${slug}`, { isActive: !currentStatus });
      
      toast({
        title: 'Başarılı!',
        description: `Marka ${currentStatus ? 'pasif' : 'aktif'} duruma getirildi.`,
      });
      
      // Marka listesini yenile
      fetchBrands();
    } catch (err: any) {
      console.error('Marka durumu değiştirilirken hata:', err);
      toast({
        title: 'Hata!',
        description: 'Marka durumu değiştirilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }
  
  // Markayı seç/kaldır
  const toggleSelectBrand = (id: number) => {
    setSelectedBrands(prev => 
      prev.includes(id) ? prev.filter(brandId => brandId !== id) : [...prev, id]
    )
  }
  
  // Tüm markaları seç/kaldır
  const selectAllBrands = () => {
    const allBrandIds = brands.map(brand => brand.id)
    setSelectedBrands(prev => 
      prev.length === allBrandIds.length ? [] : allBrandIds
    )
  }
  
  // Seçili markaları toplu sil
  const bulkDelete = async () => {
    if (selectedBrands.length === 0) return;
    
    if (!confirm(`Seçilen ${selectedBrands.length} markayı silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      await Promise.all(selectedBrands.map(id => {
        const brand = brands.find(b => b.id === id);
        if (brand) {
          return axios.delete(`/api/brands/slug/${brand.slug}`);
        }
        return Promise.resolve();
      }));
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedBrands.length} marka başarıyla silindi` 
      });
      
      setSelectedBrands([]);
      fetchBrands();
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Markalar silinirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  };
  
  // Markaları içe aktar
  const importBrands = async (file: File) => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen bir dosya seçin."
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await axios.post('/api/brands/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;
      
      toast({
        title: "İçe Aktarma Tamamlandı",
        description: `Toplam: ${result.total}, Başarılı: ${result.success}, Başarısız: ${result.failed}`,
        variant: result.failed > 0 ? "destructive" : "default"
      });

      if (result.errors && result.errors.length > 0) {
        console.error('İçe aktarma hataları:', result.errors);
      }

      // Markaları yeniden yükle
      fetchBrands();
    } catch (err: any) {
      console.error('Markalar içe aktarılırken hata:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.message || "Markalar içe aktarılırken bir hata oluştu."
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Markaları dışa aktar
  const exportBrands = (format: 'json' | 'csv' | 'excel') => {
    if (!getFilteredBrands.length) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dışa aktarılacak marka bulunamadı."
      });
      return;
    }
    
    // JSON formatında dışa aktarma
    if (format === 'json') {
      const jsonData = JSON.stringify(getFilteredBrands, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `markalar_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // CSV formatında dışa aktarma
    else if (format === 'csv') {
      const headers = ['ID', 'Marka Adı', 'Açıklama', 'Slug', 'Logo URL', 'Durum', 'Sıralama', 'Öne Çıkan', 'Oluşturulma Tarihi'];
      const csvData = getFilteredBrands.map(brand => [
        brand.id,
        brand.name,
        brand.description || '',
        brand.slug,
        brand.logoUrl || '',
        brand.isActive ? 'Aktif' : 'Pasif',
        brand.displayOrder,
        brand.isFeatured ? 'Evet' : 'Hayır',
        brand.createdAt ? new Date(brand.createdAt).toLocaleDateString('tr-TR') : ''
      ]);
      
      let csvContent = headers.join(',') + '\n';
      csvData.forEach(row => {
        // Virgülleri ve yeni satırları temizle
        const cleanRow = row.map(cell => {
          const cellStr = String(cell);
          return cellStr.includes(',') || cellStr.includes('\n') 
            ? `"${cellStr.replace(/"/g, '""')}"` 
            : cellStr;
        });
        csvContent += cleanRow.join(',') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `markalar_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Excel formatında dışa aktarma (basit CSV olarak)
    else if (format === 'excel') {
      const headers = ['ID', 'Marka Adı', 'Açıklama', 'Slug', 'Logo URL', 'Durum', 'Sıralama', 'Öne Çıkan', 'Oluşturulma Tarihi'];
      const csvData = getFilteredBrands.map(brand => [
        brand.id,
        brand.name,
        brand.description || '',
        brand.slug,
        brand.logoUrl || '',
        brand.isActive ? 'Aktif' : 'Pasif',
        brand.displayOrder,
        brand.isFeatured ? 'Evet' : 'Hayır',
        brand.createdAt ? new Date(brand.createdAt).toLocaleDateString('tr-TR') : ''
      ]);
      
      let csvContent = headers.join('\t') + '\n';
      csvData.forEach(row => {
        // Tab karakterlerini ve yeni satırları temizle
        const cleanRow = row.map(cell => {
          const cellStr = String(cell);
          return cellStr.includes('\t') || cellStr.includes('\n') 
            ? cellStr.replace(/\t/g, ' ').replace(/\n/g, ' ') 
            : cellStr;
        });
        csvContent += cleanRow.join('\t') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `markalar_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  // Filtreleme ve sıralama işlemleri için brands dizisini kullan
  const getFilteredBrands = useMemo(() => {
    if (!brands) return [];
    
    return brands
      .filter(brand => {
        // Arama filtresi
        const matchesSearch = searchTerm === '' || 
          brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Aktif/Pasif filtresi
        const matchesActive = 
          filters.isActive === 'all' || 
          (filters.isActive === 'active' && brand.isActive) || 
          (filters.isActive === 'inactive' && !brand.isActive);
        
        // Öne çıkan filtresi
        const matchesFeatured = 
          filters.isFeatured === 'all' || 
          (filters.isFeatured === 'featured' && brand.isFeatured) || 
          (filters.isFeatured === 'notFeatured' && !brand.isFeatured);
        
        // Arşiv filtresi
        const matchesArchived = 
          filters.isArchived === 'all' || 
          (filters.isArchived === 'archived' && brand.isArchived) || 
          (filters.isArchived === 'notArchived' && !brand.isArchived);
        
        // Tarih aralığı filtresi
        let matchesDateRange = true;
        if (filters.dateRange !== 'all' && brand.createdAt) {
          const createdDate = new Date(brand.createdAt);
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (filters.dateRange === 'today') {
            matchesDateRange = createdDate >= today;
          } else if (filters.dateRange === 'thisWeek') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            matchesDateRange = createdDate >= weekStart;
          } else if (filters.dateRange === 'thisMonth') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            matchesDateRange = createdDate >= monthStart;
          } else if (filters.dateRange === 'thisYear') {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            matchesDateRange = createdDate >= yearStart;
          }
        }
        
        return matchesSearch && matchesActive && matchesFeatured && matchesArchived && matchesDateRange;
      })
      .sort((a, b) => {
        // Sıralama
        if (filters.sortBy === 'name') {
          return filters.sortOrder === 'asc' 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        } else if (filters.sortBy === 'createdAt') {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        } else { // displayOrder
          return filters.sortOrder === 'asc' 
            ? a.displayOrder - b.displayOrder 
            : b.displayOrder - a.displayOrder;
        }
      });
  }, [brands, searchTerm, filters]);
  
  // Seçili markaların durumunu değiştir (aktif/pasif)
  const toggleSelectedBrandsStatus = async () => {
    if (selectedBrands.length === 0) return;
    
    try {
      // Seçili markaların mevcut durumlarını kontrol et
      const selectedBrandObjects = brands.filter(brand => selectedBrands.includes(brand.id));
      
      // Eğer tüm seçili markalar aktifse, hepsini pasif yap; değilse hepsini aktif yap
      const allActive = selectedBrandObjects.every(brand => brand.isActive);
      const newStatus = !allActive;
      
      // Her bir marka için güncelleme yap
      await Promise.all(selectedBrandObjects.map(brand => 
        axios.patch(`/api/brands/slug/${brand.slug}`, { isActive: newStatus })
      ));
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedBrands.length} markanın durumu ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi` 
      });
      
      // Markaları yeniden yükle
      fetchBrands();
    } catch (err: any) {
      console.error('Marka durumları güncellenirken hata:', err);
      toast({
        title: 'Hata!',
        description: 'Marka durumları güncellenirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Markalar</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Yeni Marka
              </Button>
        </div>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Marka ara..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtreler
              {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sırala
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sıralama Kriteri</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup 
                  value={filters.sortBy} 
                  onValueChange={(value) => setFilters({...filters, sortBy: value})}
                >
                  <DropdownMenuRadioItem value="displayOrder">Sıralama Numarası</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">Marka Adı</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="createdAt">Oluşturulma Tarihi</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sıralama Yönü</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuRadioGroup 
                  value={filters.sortOrder} 
                  onValueChange={(value) => setFilters({...filters, sortOrder: value})}
                >
                  <DropdownMenuRadioItem value="asc">Artan</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">Azalan</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Dışa Aktar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportBrands('json')}>
                  <FileJson className="mr-2 h-4 w-4" />
                  <span>JSON Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBrands('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>CSV Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBrands('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>Excel Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <label className="flex w-full cursor-pointer items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    <span>CSV İçe Aktar</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          importBrands(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}>
              {viewMode === 'grid' ? (
                <>
                  <LayoutList className="mr-2 h-4 w-4" />
                  Tablo Görünümü
                </>
              ) : (
                <>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Ağaç Görünümü
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Seçili markalar için toplu işlem butonları */}
        {selectedBrands.length > 0 && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between mt-4">
            <div className="text-sm font-medium">
              {selectedBrands.length} marka seçildi
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedBrands([]);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Seçimi Temizle
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSelectedBrandsStatus}
              >
                <ToggleLeft className="mr-2 h-4 w-4" />
                Durumu Değiştir
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={bulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {selectedBrands.length === 1 ? 'Sil' : 'Toplu Sil'}
              </Button>
            </div>
          </div>
        )}
        
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle>Gelişmiş Filtreler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select 
                    value={filters.isActive} 
                    onValueChange={(value) => setFilters({...filters, isActive: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Öne Çıkan</Label>
                  <Select 
                    value={filters.isFeatured} 
                    onValueChange={(value) => setFilters({...filters, isFeatured: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Öne çıkan durumu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="featured">Öne Çıkanlar</SelectItem>
                      <SelectItem value="notFeatured">Öne Çıkarılmayanlar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Arşiv Durumu</Label>
                  <Select 
                    value={filters.isArchived} 
                    onValueChange={(value) => setFilters({...filters, isArchived: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Arşiv durumu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="archived">Arşivlenenler</SelectItem>
                      <SelectItem value="notArchived">Arşivlenmeyenler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Tarih Aralığı</Label>
                  <Select 
                    value={filters.dateRange} 
                    onValueChange={(value) => setFilters({...filters, dateRange: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tarih aralığı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Zamanlar</SelectItem>
                      <SelectItem value="today">Bugün</SelectItem>
                      <SelectItem value="thisWeek">Bu Hafta</SelectItem>
                      <SelectItem value="thisMonth">Bu Ay</SelectItem>
                      <SelectItem value="thisYear">Bu Yıl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({
                      isActive: 'all',
                      isFeatured: 'all',
                      isArchived: 'all',
                      sortBy: 'displayOrder',
                      sortOrder: 'asc',
                      dateRange: 'all',
                    });
                    setSearchTerm('');
                  }}
                >
                  Filtreleri Sıfırla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Marka listesi */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Marka Yönetimi</CardTitle>
          <CardDescription>
            Sistemdeki tüm markaları görüntüleyin, düzenleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" value={viewMode} onValueChange={(value: string) => setViewMode(value as 'table' | 'grid')}>
            <TabsContent value="table" className="mt-0">
      {loading ? (
                <div className="flex justify-center items-center py-8">
          <p>Yükleniyor...</p>
        </div>
      ) : error ? (
                <div className="text-center py-8 text-muted-foreground">
          <p className="text-red-500">{error}</p>
        </div>
      ) : brands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Hiç marka bulunamadı.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Marka Ekle
          </Button>
        </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={
                            getFilteredBrands.length > 0 && 
                            selectedBrands.length === getFilteredBrands.length
                          } 
                          onCheckedChange={selectAllBrands}
                        />
                      </TableHead>
                      <TableHead className="w-12">Logo</TableHead>
                      <TableHead>Marka Adı</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredBrands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedBrands.includes(brand.id)}
                            onCheckedChange={() => toggleSelectBrand(brand.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {brand.logoUrl ? (
                            <div className="relative h-10 w-10 rounded-md overflow-hidden">
                              <Image
                                src={brand.logoUrl}
                                alt={brand.name}
                                width={40}
                                height={40}
                                className="object-cover"
                                onError={(e) => {
                                  console.error('Logo yüklenirken hata:', brand.logoUrl);
                                  // Görsel yüklenemezse placeholder göster
                                  (e.target as any).src = 'https://via.placeholder.com/40x40?text=Logo';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-gray-100">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell>{brand.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={brand.isActive ? "outline" : "secondary"}>
                            {brand.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/markalar/${brand.slug}`}>
                                <Eye size={16} />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/markalar/edit/${brand.slug}`}>
                                <Edit size={16} />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleBrandStatus(brand.slug, brand.isActive)}
                            >
                              <Switch
                                checked={brand.isActive}
                                className="scale-75"
                              />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.slug)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="grid" className="mt-0">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <p>Yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Hiç marka bulunamadı.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Marka Ekle
                  </Button>
                </div>
              ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {getFilteredBrands.map((brand) => (
            <Card key={brand.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <Checkbox 
                    id={`select-brand-${brand.id}`}
                    checked={selectedBrands.includes(brand.id)}
                    onCheckedChange={() => toggleSelectBrand(brand.id)}
                    className="mr-2"
                  />
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {brand.logoUrl && brand.logoUrl.startsWith('http') ? (
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                          <Image
                            src={brand.logoUrl}
                            alt={brand.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              console.error('Logo yüklenirken hata:', brand.logoUrl);
                              // Görsel yüklenemezse placeholder göster
                              (e.target as any).src = 'https://via.placeholder.com/40x40?text=Logo';
                            }}
                          />
                        </div>
                      ) : brand.logoUrl && brand.logoUrl.startsWith('/uploads/') ? (
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                          <Image
                            src={brand.logoUrl}
                            alt={brand.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              console.error('Logo yüklenirken hata:', brand.logoUrl);
                              // Görsel yüklenemezse placeholder göster
                              (e.target as any).src = 'https://via.placeholder.com/40x40?text=Logo';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{brand.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {brand.productCount || 0} ürün
                        </div>
                      </div>
                    </div>
                  </CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={brand.isActive ? "outline" : "secondary"}>
                    {brand.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                  {brand.productCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {brand.productCount} ürün
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {brand.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {brand.description}
                  </p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/markalar/${brand.slug}`}>
                      <Eye className="mr-2 h-4 w-4" /> Görüntüle
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/markalar/edit/${brand.slug}`}>
                              <Edit className="mr-2 h-4 w-4" /> Düzenle
                    </Link>
                  </Button>
                </div>
                        <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                            onClick={() => toggleBrandStatus(brand.slug, brand.isActive)}
                            className="flex items-center"
                          >
                            <Switch
                              checked={brand.isActive}
                              className="mr-2 scale-75"
                            />
                            {brand.isActive ? "Aktif" : "Pasif"}
                      </Button>
                      <Button 
                        variant="outline" 
                            size="sm" 
                        onClick={() => handleDelete(brand.slug)}
                            className="text-red-500 hover:text-red-700"
                      >
                            <Trash2 className="mr-2 h-4 w-4" /> Sil
                      </Button>
                    </div>
                      </CardFooter>
                    </Card>
              ))}
        </div>
      )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Yeni marka ekleme dialog'u */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Yeni Marka Ekle</DialogTitle>
                <DialogDescription>
              Yeni bir marka eklemek için aşağıdaki formu doldurun.
                </DialogDescription>
              </DialogHeader>
          
              <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="general">
                <TabsList className="mb-4">
                  <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
                  <TabsTrigger value="media">Medya</TabsTrigger>
                  <TabsTrigger value="display">Görünüm</TabsTrigger>
                  <TabsTrigger value="products">Ürün Listesi</TabsTrigger>
                  <TabsTrigger value="content">İçerik</TabsTrigger>
                  <TabsTrigger value="seo">SEO Ayarları</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marka Adı*</FormLabel>
                        <FormControl>
                          <Input placeholder="Marka adı girin" {...field} />
                        </FormControl>
                        <FormDescription>
                          Bu isim marka listesinde ve ürün detaylarında görünecektir.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Marka hakkında kısa açıklama" 
                            className="resize-none" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Markanın ne yaptığına dair kısa bir açıklama.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                      name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Sıralama</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormDescription>
                            Markanın görüntülenme sırası. Düşük değerler daha önce gösterilir.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                    <div className="flex items-end">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 w-full">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Aktif</FormLabel>
                          <FormDescription>
                                Bu marka aktif olarak gösterilsin mi?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
        </div>
      </div>
      
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Öne Çıkan</FormLabel>
                          <FormDescription>
                            Bu markayı vitrin/anasayfada öne çıkar
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="media" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo</FormLabel>
                            <FormDescription>
                              Marka logosu yükleyin veya URL girin
                            </FormDescription>
                            
                            <div className="space-y-4">
                              <FormControl>
          <Input
                                  placeholder="https://example.com/logo.png" 
                                  {...field} 
                                  value={field.value || ''} 
                                />
                              </FormControl>
                              
                              <div className="flex flex-col space-y-2">
                                <div className="mt-2 flex items-center gap-4">
                                  <div className="relative h-24 w-24 overflow-hidden rounded-md border">
                                    {logoPreview ? (
                                      <Image
                                        src={logoPreview}
                                        alt="Logo önizleme"
                                        width={96}
                                        height={96}
                                        className="object-contain"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-muted">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      ref={fileInputRef}
                                      onChange={handleLogoChange}
                                      className="hidden"
                                      id="logo-upload"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                      >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Logo Seç
                                      </Button>
                                      {logoFile && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={handleLogoUpload}
                                          disabled={isUploading}
                                        >
                                          {isUploading ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Yükleniyor {uploadProgress}%
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="mr-2 h-4 w-4" />
                                              Yükle
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
        </div>
      </div>
      
                                {isUploading && (
                                  <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                    <div 
                                      className="bg-primary h-2.5 rounded-full" 
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <FormField
                        control={form.control}
                        name="bannerUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner</FormLabel>
                            <FormDescription>
                              Marka sayfasının üst kısmında görüntülenecek banner
                            </FormDescription>
                            <FormControl>
                              <Input placeholder="https://example.com/banner.jpg" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="mt-6">
                        <FormField
                          control={form.control}
                          name="coverImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kapak Görseli</FormLabel>
                              <FormDescription>
                                Marka sayfasında kullanılacak kapak görseli
                              </FormDescription>
                              <FormControl>
                                <Input placeholder="https://example.com/cover.jpg" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="display" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
                        <CardTitle>Görünüm Ayarları</CardTitle>
          <CardDescription>
                          Markanın sitede nerede görüntüleneceğini belirleyin
          </CardDescription>
        </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="showInHeader"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Header&apos;da Göster</FormLabel>
                                <FormDescription>
                                  Marka, sitenin üst menüsünde görüntülenecek
                                </FormDescription>
            </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="showInFooter"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Footer&apos;da Göster</FormLabel>
                                <FormDescription>
                                  Marka, sitenin alt kısmında görüntülenecek
                                </FormDescription>
            </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="showInSidebar"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Yan Menüde Göster</FormLabel>
                                <FormDescription>
                                  Marka, kategori sayfalarının yan menüsünde görüntülenecek
                                </FormDescription>
                          </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                          </div>
                </TabsContent>
                
                <TabsContent value="products" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ürün Listeleme Ayarları</CardTitle>
                      <CardDescription>
                        Marka sayfasında ürünlerin nasıl listeleneceğini belirleyin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="productListingType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Listeleme Tipi</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || 'grid'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Listeleme tipini seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="grid">Grid (Izgara)</SelectItem>
                                <SelectItem value="list">Liste</SelectItem>
                                <SelectItem value="compact">Kompakt</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Ürünlerin görüntülenme şekli
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="productsPerPage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sayfa Başına Ürün</FormLabel>
                            <FormControl>
                              <Input type="number" min="4" max="48" step="4" {...field} />
                            </FormControl>
                            <FormDescription>
                              Bir sayfada gösterilecek maksimum ürün sayısı
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="defaultSortOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Varsayılan Sıralama</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || 'newest'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sıralama tipini seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="newest">En Yeniler</SelectItem>
                                <SelectItem value="price_asc">Fiyat (Artan)</SelectItem>
                                <SelectItem value="price_desc">Fiyat (Azalan)</SelectItem>
                                <SelectItem value="name_asc">İsim (A-Z)</SelectItem>
                                <SelectItem value="name_desc">İsim (Z-A)</SelectItem>
                                <SelectItem value="popularity">Popülerlik</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Ürünlerin varsayılan sıralama düzeni
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marka İçeriği</FormLabel>
                        <FormDescription>
                          Marka hakkında detaylı bilgi, hikaye veya tanıtım metni
                        </FormDescription>
                        <div className="border rounded-md p-4">
                          <div className="flex gap-2 mb-2 border-b pb-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(end, text.length);
                                  const newText = before + '<h2>Başlık</h2>' + after;
                                  field.onChange(newText);
                                  textarea.focus();
                                  textarea.selectionStart = start + 4;
                                  textarea.selectionEnd = start + 10;
                                }
                              }}
                            >
                              H2
                                </Button>
                                <Button
                              type="button"
                                  variant="ghost"
                              size="sm"
                              onClick={() => {
                                const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(end, text.length);
                                  const newText = before + '<h3>Alt Başlık</h3>' + after;
                                  field.onChange(newText);
                                  textarea.focus();
                                  textarea.selectionStart = start + 4;
                                  textarea.selectionEnd = start + 13;
                                }
                              }}
                            >
                              H3
                                </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(end, text.length);
                                  const selection = text.substring(start, end);
                                  const newText = before + '<strong>' + (selection || 'Kalın Metin') + '</strong>' + after;
                                  field.onChange(newText);
                                  textarea.focus();
                                }
                              }}
                            >
                              B
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(end, text.length);
                                  const selection = text.substring(start, end);
                                  const newText = before + '<em>' + (selection || 'İtalik Metin') + '</em>' + after;
                                  field.onChange(newText);
                                  textarea.focus();
                                }
                              }}
                            >
                              I
                            </Button>
                        </div>
                          <FormControl>
                            <Textarea
                              id="content-editor"
                              placeholder="Marka içeriği..."
                              className="min-h-[200px] font-mono"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
            </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="seo" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Başlığı</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO Başlığı" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Tarayıcı sekmesinde ve arama sonuçlarında görünecek başlık. Boş bırakılırsa marka adı kullanılır.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Açıklaması</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="SEO Açıklaması"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Arama sonuçlarında görünecek açıklama. 150-160 karakter olması önerilir.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="seoKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Anahtar Kelimeleri</FormLabel>
                        <FormControl>
                          <Input placeholder="anahtar,kelime,virgülle,ayırın" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Arama motorları için anahtar kelimeler. Virgülle ayırın.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    clearLogoPreview();
                    setIsDialogOpen(false);
                  }}
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    'Kaydet'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

BrandsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}
