// pages/dashboard/kategoriler/index.tsx
import React, { ReactElement, useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from '@/lib/axios'
import { toast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Trash2, 
  Edit, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Eye,
  Download,
  MoreHorizontal,
  Save,
  Upload,
  FileJson,
  FileSpreadsheet,
  ChevronUp,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  X,
  ToggleLeft,
  ArrowLeft,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { slugify } from '@/lib/slugify'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { useRouter } from 'next/router'
import { useAuthDebug } from '@/hooks/use-auth-debug'

// Shadcn Select bileşenini import ediyoruz
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import AddNewItemButton from '@/components/AddNewItemButton'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'

const CategorySchema = z.object({
  name: z.string().min(2, "Kategori adı en az 2 karakter olmalıdır"),
  description: z.string().optional(),
  parentSlug: z.string().optional(),
  slug: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showInSlider: z.boolean().default(false),
  displayOrder: z.coerce.number().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  bannerUrl: z.string().optional(),
  showInHeader: z.boolean().default(false),
  showInFooter: z.boolean().default(false),
  showInSidebar: z.boolean().default(true),
  allowProductComparison: z.boolean().default(true),
  maxCompareProducts: z.coerce.number().default(4),
  compareAttributes: z.string().optional(),
  productsPerPage: z.coerce.number().default(12),
  showOutOfStock: z.boolean().default(true),
  freeShipping: z.boolean().default(false),
  freeShippingThreshold: z.coerce.number().optional()
})

type Category = {
  id: number
  name: string
  slug: string
  description?: string
  parentId?: number
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  bannerUrl?: string
  isActive?: boolean
  isFeatured?: boolean
  isArchived?: boolean
  archivedAt?: string
  showInHeader?: boolean
  showInFooter?: boolean
  showInSidebar?: boolean
  productsPerPage?: number
  defaultSortOrder?: string
  customFilters?: string
  featuredProducts?: string
  displayOrder?: number
  createdAt?: string
  updatedAt?: string
  children: Category[]
}

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [showInactive, setShowInactive] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [filters, setFilters] = useState<{
    sortBy: 'displayOrder' | 'name' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    dateRange: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear'
  }>({
    sortBy: 'displayOrder',
    sortOrder: 'asc',
    dateRange: 'all'
  })
  const [statusFilter, setStatusFilter] = useState<string>("tümü")
  const router = useRouter()
  const { isAuthenticated, isAdmin, status, session, debugInfo } = useAuthDebug()
  
  // Form tanımla
  const form = useForm<z.infer<typeof CategorySchema>>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      displayOrder: 0,
      isFeatured: false,
      showInSlider: false,
      showInHeader: false,
      showInFooter: false,
      showInSidebar: true,
      seoKeywords: '',
      allowProductComparison: true,
      maxCompareProducts: 4,
      productsPerPage: 12,
      showOutOfStock: true,
      freeShipping: false
    }
  });
  
  // Form durumunu al
  const { formState: { isSubmitting } } = form;
  
  const handleFormSubmit = async (data: z.infer<typeof CategorySchema>) => {
    try {
      // Gönderiyi loglama
      console.log('Kategori ekleme formu gönderiliyor...', data);
      
      // axios ile post isteği gönder (fetch yerine)
      const response = await axios.post('/api/categories', {
        name: data.name,
        description: data.description || null,
        parentSlug: data.parentSlug === 'none' ? null : data.parentSlug,
        slug: data.slug ? slugify(data.slug) : slugify(data.name),
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        displayOrder: Number(data.displayOrder) || 0,
        isActive: Boolean(data.isActive),
        isFeatured: Boolean(data.isFeatured),
        showInSlider: Boolean(data.showInSlider),
        showInHeader: Boolean(data.showInHeader),
        showInFooter: Boolean(data.showInFooter),
        showInSidebar: Boolean(data.showInSidebar),
        allowProductComparison: Boolean(data.allowProductComparison),
        maxCompareProducts: Number(data.maxCompareProducts) || 4,
        compareAttributes: data.compareAttributes || null,
        productsPerPage: Number(data.productsPerPage) || 12,
        showOutOfStock: Boolean(data.showOutOfStock),
        freeShipping: Boolean(data.freeShipping),
        freeShippingThreshold: data.freeShippingThreshold || null
      });

      // Yanıtı loglama
      console.log('API yanıtı:', response.data);
      
      toast({
        title: 'Başarılı',
        description: 'Kategori başarıyla eklendi'
      });

      // Formu sıfırla
      form.reset();
      
      // Dialog'u kapat
      setIsDialogOpen(false);
      
      // Kategorileri yeniden yükle
      fetchCategories();
    } catch (err: any) {
      console.error('Kategori eklenirken hata:', err);
      
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
        variant: 'destructive',
        title: 'Hata!',
        description: err.response?.data?.error || err.message || 'Kategori eklenirken bir hata oluştu'
      });
    }
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kategoriler alınırken hata oluştu')
      toast({
        title: 'Hata!',
        description: error || 'Kategoriler alınırken hata oluştu',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [setCategories, setLoading, setError, error, toast])

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filtreleme ve sıralama işlemleri için categories dizisini kullan
  const getFilteredCategories = useMemo(() => {
    if (!categories) return [];
    
    return categories
      .filter(category => {
        // Arama filtresi
    const matchesSearch = !searchTerm || 
                          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
        // Aktif/Pasif filtresi
        const matchesActive = showInactive || category.isActive !== false;
        
        // Tarih aralığı filtresi
        let matchesDateRange = true;
        if (filters.dateRange && filters.dateRange !== 'all') {
          const createdAt = category.createdAt ? new Date(category.createdAt) : null;
          if (!createdAt) return false;
          
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (filters.dateRange === 'today') {
            matchesDateRange = createdAt >= today;
          } else if (filters.dateRange === 'thisWeek') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            matchesDateRange = createdAt >= weekStart;
          } else if (filters.dateRange === 'thisMonth') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            matchesDateRange = createdAt >= monthStart;
          } else if (filters.dateRange === 'thisYear') {
            const yearStart = new Date(today.getFullYear(), 0, 1);
            matchesDateRange = createdAt >= yearStart;
          }
        }
        
        return matchesSearch && matchesActive && matchesDateRange;
      })
      .sort((a, b) => {
        // Sıralama
        if (filters.sortBy === 'name') {
          return filters.sortOrder === 'asc' 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        } else if (filters.sortBy === 'displayOrder') {
          const aOrder = a.displayOrder || 0;
          const bOrder = b.displayOrder || 0;
          return filters.sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
        } else if (filters.sortBy === 'createdAt') {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return filters.sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }
        return 0;
      });
  }, [categories, searchTerm, showInactive, filters]);

  // Kategori ağacını oluşturma
  const buildCategoryTree = (categories: Category[], parentId: number | null = null): Category[] => {
    return categories
      .filter(category => parentId === null ? !category.parentId : category.parentId === parentId)
      .map(category => ({
        ...category,
        children: buildCategoryTree(categories, category.id)
      }));
  };

  const categoryTree = buildCategoryTree(getFilteredCategories);

  // Toggle kategori açılma durumu
  const toggleCategory = (slug: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }));
  };

  // Seçilen kategorileri yönetme
  const toggleSelectCategory = (id: number) => {
    setSelectedCategories(prev => 
      prev.includes(id) 
        ? prev.filter(catId => catId !== id)
        : [...prev, id]
    );
  };

  const selectAllCategories = () => {
    if (selectedCategories.length === getFilteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(getFilteredCategories.map(cat => cat.id));
    }
  };

  // Düzenleme ve silme fonksiyonları
  const handleDelete = async (id: number, slug: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;

    try {
      // Delete işlemini başlat
      const response = await axios.delete(`/api/categories/slug/${slug}`);
      console.log('Kategori silme yanıtı:', response.data);
      
      toast({ 
        title: 'Başarılı', 
        description: 'Kategori başarıyla silindi'
      });
      
      // Kategori listesini yenile
      fetchCategories();
    } catch (err: any) {
      console.error('Kategori silme hatası:', err);
      
      const errorMessage = err.response?.data?.error || 'Kategori silinirken hata oluştu';
      const errorDetails = err.response?.data?.details;
      
      // Alt kategorisi olan bir kategoriyi silmeye çalışıyorsa özel mesaj göster
      if (err.response?.status === 400 && err.response?.data?.childCount) {
        toast({
          title: 'İşlem Yapılamadı!',
          description: `Bu kategorinin ${err.response.data.childCount} alt kategorisi var. Önce alt kategorileri silmelisiniz.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Hata!',
          description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
          variant: 'destructive'
        });
      }
    }
  }

  // Toplu işlemler
  const bulkDelete = async () => {
    if (!selectedCategories.length) return;
    
    if (!confirm(`${selectedCategories.length} kategoriyi silmek istediğinizden emin misiniz?`)) return;
    
    try {
      // İlerleme durumu için değişkenler
      let successCount = 0;
      let errorCount = 0;
      let childrenErrors = 0;
      
      // Her kategori için sırayla silme işlemini gerçekleştir
      for (const id of selectedCategories) {
        const category = getFilteredCategories.find(c => c.id === id);
        if (!category) continue;
        
        try {
          console.log(`Kategori siliniyor: ${category.slug}`);
          await axios.delete(`/api/categories/slug/${category.slug}`);
          successCount++;
        } catch (err: any) {
          errorCount++;
          console.error(`Kategori silme hatası (${category.slug}):`, err);
          
          // Alt kategorisi olan bir kategori ise bunu kaydet
          if (err.response?.status === 400 && err.response?.data?.childCount) {
            childrenErrors++;
          }
        }
      }
      
      // Sonuç mesajını oluştur
      let resultMessage = `İşlem tamamlandı: ${successCount} kategori silindi`;
      if (errorCount > 0) {
        resultMessage += `, ${errorCount} kategori silinemedi`;
      }
      
      // Özel durum mesajları
      if (childrenErrors > 0) {
        resultMessage += `. ${childrenErrors} kategori alt kategorilere sahip olduğu için silinemedi.`;
      }
      
      // Toast mesajını göster
      toast({ 
        title: errorCount > 0 ? 'Kısmen Başarılı' : 'Başarılı', 
        description: resultMessage,
        variant: errorCount > 0 ? 'destructive' : 'default'
      });
      
      // Seçimleri temizle ve kategori listesini güncelle
      setSelectedCategories([]);
      fetchCategories();
    } catch (err: any) {
      console.error('Toplu silme işleminde genel hata:', err);
      toast({
        title: 'Hata!',
        description: 'Kategoriler silinirken beklenmeyen bir hata oluştu',
        variant: 'destructive'
      });
    }
  };

  // Kategorileri içe aktar
  const importCategories = async (file: File) => {
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
      const response = await axios.post('/api/categories/import', formData, {
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

      // Kategorileri yeniden yükle
      fetchCategories();
    } catch (err: any) {
      console.error('Kategoriler içe aktarılırken hata:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.message || "Kategoriler içe aktarılırken bir hata oluştu."
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCategories = (format: 'json' | 'csv' | 'excel' = 'json') => {
    const dataToExport = selectedCategories.length > 0
      ? getFilteredCategories.filter(cat => selectedCategories.includes(cat.id))
      : getFilteredCategories;
    
    if (!dataToExport.length) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dışa aktarılacak kategori bulunamadı."
      });
      return;
    }
    
    // JSON formatında dışa aktarma
    if (format === 'json') {
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
      a.download = `kategoriler_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    }
    
    // CSV formatında dışa aktarma
    else if (format === 'csv') {
      // CSV başlık satırı
      let csvContent = "id,name,slug,description,parentId,seoTitle,seoDescription,displayOrder,isActive\n";
      
      // Her kategori için bir satır ekle
      dataToExport.forEach(cat => {
        // Virgül ve yeni satır içeren alanları tırnak içine al
        const description = cat.description ? `"${cat.description.replace(/"/g, '""')}"` : '';
        const seoTitle = cat.seoTitle ? `"${cat.seoTitle.replace(/"/g, '""')}"` : '';
        const seoDescription = cat.seoDescription ? `"${cat.seoDescription.replace(/"/g, '""')}"` : '';
        
        csvContent += `${cat.id},`;
        csvContent += `"${cat.name.replace(/"/g, '""')}",`;
        csvContent += `${cat.slug},`;
        csvContent += `${description},`;
        csvContent += `${cat.parentId || ''},`;
        csvContent += `${seoTitle},`;
        csvContent += `${seoDescription},`;
        csvContent += `${cat.displayOrder || 0},`;
        csvContent += `${cat.isActive !== false}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `kategoriler_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Excel formatında dışa aktarma (aslında CSV formatında ama Excel uyumlu)
    else if (format === 'excel') {
      // Excel başlık satırı
      let excelContent = "id\tname\tslug\tdescription\tparentId\tseoTitle\tseoDescription\tdisplayOrder\tisActive\n";
      
      // Her kategori için bir satır ekle
      dataToExport.forEach(cat => {
        // Tab ve yeni satır içeren alanları düzenle
        const description = cat.description ? cat.description.replace(/\t/g, ' ').replace(/\n/g, ' ') : '';
        const seoTitle = cat.seoTitle ? cat.seoTitle.replace(/\t/g, ' ').replace(/\n/g, ' ') : '';
        const seoDescription = cat.seoDescription ? cat.seoDescription.replace(/\t/g, ' ').replace(/\n/g, ' ') : '';
        
        excelContent += `${cat.id}\t`;
        excelContent += `${cat.name.replace(/\t/g, ' ')}\t`;
        excelContent += `${cat.slug}\t`;
        excelContent += `${description}\t`;
        excelContent += `${cat.parentId || ''}\t`;
        excelContent += `${seoTitle}\t`;
        excelContent += `${seoDescription}\t`;
        excelContent += `${cat.displayOrder || 0}\t`;
        excelContent += `${cat.isActive !== false}\n`;
      });
      
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `kategoriler_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Render ağaç görünümü için rekursif fonksiyon
  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map(category => (
      <React.Fragment key={category.id}>
        <div 
          className={`flex items-center py-2 ${level > 0 ? 'pl-' + (level * 6) : ''}`}
          style={{ paddingLeft: level > 0 ? `${level * 1.5}rem` : '0.5rem' }}
        >
          <div className="flex items-center group">
            {category.children.length > 0 ? (
              <button 
                onClick={() => toggleCategory(category.slug)}
                className="mr-2 focus:outline-none"
              >
                {expandedCategories[category.slug] ? 
                  <ChevronDown size={16} /> : 
                  <ChevronRight size={16} />
                }
              </button>
            ) : (
              <span className="w-6 mr-2"></span>
            )}
            
            <Checkbox 
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={() => toggleSelectCategory(category.id)}
              className="mr-2"
            />
            
            <span className={`flex-1 ${!category.isActive ? 'text-gray-400' : ''}`}>
              {category.name}
              {category.isActive !== false ? (
                <Badge variant="outline" className="ml-2">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-2">
                  Pasif
                </Badge>
              )}
              {category.isFeatured && (
                <Badge variant="default" className="ml-2 bg-yellow-500 hover:bg-yellow-600">
                  Öne Çıkan
                </Badge>
              )}
            </span>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/kategoriler/${category.slug}`}>
                  <Eye size={16} />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/kategoriler/edit/${category.slug}`}>
                  <Edit size={16} />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleCategoryStatus(category.slug, category.isActive !== false)}
              >
                <Switch
                  checked={category.isActive !== false}
                  className="scale-75"
                />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id, category.slug)}>
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
        
        {expandedCategories[category.slug] && category.children.length > 0 && (
          renderCategoryTree(category.children, level + 1)
        )}
      </React.Fragment>
    ));
  };

  // Düzenleme ve silme fonksiyonları
  const handleEdit = (category: Category) => {
    router.push(`/dashboard/kategoriler/${category.slug}/edit`);
  }

  // Tek bir kategorinin durumunu değiştir (aktif/pasif)
  const toggleCategoryStatus = async (slug: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/api/categories/slug/${slug}`, { isActive: !currentStatus });
      
      toast({
        title: 'Başarılı!',
        description: `Kategori ${currentStatus ? 'pasif' : 'aktif'} duruma getirildi.`,
      });
      
      // Kategori listesini yenile
      fetchCategories();
    } catch (err: any) {
      console.error('Kategori durumu değiştirilirken hata:', err);
      toast({
        title: 'Hata!',
        description: 'Kategori durumu değiştirilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }

  // Seçili kategorilerin durumunu değiştir (aktif/pasif)
  const toggleSelectedCategoriesStatus = async () => {
    if (selectedCategories.length === 0) return;
    
    try {
      // Seçili kategorilerin mevcut durumlarını kontrol et
      const selectedCategoryObjects = getFilteredCategories.filter(category => selectedCategories.includes(category.id));
      
      // Eğer tüm seçili kategoriler aktifse, hepsini pasif yap; değilse hepsini aktif yap
      const allActive = selectedCategoryObjects.every(category => category.isActive !== false);
      const newStatus = !allActive;
      
      console.log('Seçili kategoriler:', selectedCategoryObjects);
      console.log('Yeni durum:', newStatus);
      
      // Her bir kategori için güncelleme yap
      const updatePromises = selectedCategoryObjects.map(category => {
        console.log(`Kategori güncelleniyor: ${category.slug}, yeni durum: ${newStatus}`);
        return axios.patch(`/api/categories/slug/${category.slug}`, { isActive: newStatus })
          .then(response => {
            console.log(`Kategori güncelleme yanıtı:`, response.data);
            return response;
          })
          .catch(error => {
            console.error(`Kategori güncelleme hatası (${category.slug}):`, error);
            throw error;
          });
      });
      
      await Promise.all(updatePromises);
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedCategories.length} kategorinin durumu ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi` 
      });
      
      // Kategorileri yeniden yükle
      fetchCategories();
    } catch (err: any) {
      console.error('Kategori durumları güncellenirken hata:', err);
      toast({
        title: 'Hata!',
        description: 'Kategori durumları güncellenirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-6 bg-background">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Kategoriler</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Kategori
            </Button>
          </div>
        </div>

        {/* Seçili kategoriler için toplu işlem butonları */}
        {selectedCategories.length > 0 && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between mt-4">
            <div className="text-sm font-medium">
              {selectedCategories.length} kategori seçildi
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedCategories([]);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Seçimi Temizle
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  toggleSelectedCategoriesStatus();
                }}
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
                {selectedCategories.length === 1 ? 'Sil' : 'Toplu Sil'}
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kategori ara..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              Filtreler
              {showFilters ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
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
                  onValueChange={(value) => {
                    const sortBy = value as 'displayOrder' | 'name' | 'createdAt';
                    setFilters({...filters, sortBy});
                  }}
                >
                  <DropdownMenuRadioItem value="displayOrder">Sıralama Numarası</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">Kategori Adı</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="createdAt">Oluşturma Tarihi</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sıralama Yönü</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuRadioGroup 
                  value={filters.sortOrder} 
                  onValueChange={(value) => {
                    const sortOrder = value as 'asc' | 'desc';
                    setFilters({...filters, sortOrder});
                  }}
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
                <DropdownMenuItem onClick={() => exportCategories('json')}>
                  <FileJson className="mr-2 h-4 w-4" />
                  <span>JSON Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCategories('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>CSV Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCategories('excel')}>
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
                          importCategories(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" onClick={() => setViewMode(viewMode === 'tree' ? 'table' : 'tree')}>
              {viewMode === 'tree' ? (
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
                    value={showInactive ? 'all' : 'active'} 
                    onValueChange={(value) => setShowInactive(value === 'all')}
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
                  <Label>Tarih Aralığı</Label>
                  <Select 
                    value={filters.dateRange} 
                    onValueChange={(value: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear') => setFilters({...filters, dateRange: value})}
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
                      sortBy: 'displayOrder',
                      sortOrder: 'asc',
                      dateRange: 'all',
                    });
                    setShowInactive(false);
                    setSearchTerm('');
                  }}
                >
                  Filtreleri Sıfırla
                </Button>
                </div>
            </CardContent>
          </Card>
        )}

        {/* Kategori listesi */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Kategori Yönetimi</CardTitle>
            <CardDescription>
              Sistemdeki tüm kategorileri görüntüleyin, düzenleyin ve yönetin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table" value={viewMode} onValueChange={(value: string) => setViewMode(value as 'table' | 'tree')}>
              <div className="flex justify-between items-center mb-4">
                {/* Removing the TabsList with duplicate buttons */}
              </div>

              <TabsContent value="table" className="mt-0">
        {loading ? (
                  <p>Yükleniyor...</p>
        ) : error ? (
                  <p className="text-red-500">{error}</p>
        ) : (
                  <Table>
            <TableHeader>
              <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={
                              getFilteredCategories.length > 0 && 
                              selectedCategories.length === getFilteredCategories.length
                            } 
                            onCheckedChange={selectAllCategories}
                          />
                        </TableHead>
                        <TableHead>Kategori Adı</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                      {getFilteredCategories.length > 0 ? (
                        getFilteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                              <Checkbox 
                                checked={selectedCategories.includes(category.id)}
                                onCheckedChange={() => toggleSelectCategory(category.id)}
                              />
                  </TableCell>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    {category.isActive !== false ? (
                      <Badge variant="outline">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Pasif
                      </Badge>
                    )}
                  </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/dashboard/kategoriler/${category.slug}`}>
                                    <Eye size={16} />
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/dashboard/kategoriler/edit/${category.slug}`}>
                                    <Edit size={16} />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleCategoryStatus(category.slug, category.isActive !== false)}
                                >
                                  <Switch
                                    checked={category.isActive !== false}
                                    className="scale-75"
                                  />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id, category.slug)}>
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            Kategori bulunamadı
                  </TableCell>
                </TableRow>
                      )}
            </TableBody>
          </Table>
        )}
              </TabsContent>

              <TabsContent value="tree" className="mt-0">
                {loading ? (
                  <p>Yükleniyor...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : (
                  <div className="border rounded-md">
                    <div className="bg-muted py-2 px-4 font-medium flex items-center">
                      <Checkbox 
                        checked={
                          getFilteredCategories.length > 0 && 
                          selectedCategories.length === getFilteredCategories.length
                        } 
                        onCheckedChange={selectAllCategories}
                        className="mr-2"
                      />
                      <span className="flex-1">Kategori Adı</span>
                      <span className="w-24 text-right">İşlemler</span>
                    </div>
                    <div className="p-2">
                      {categoryTree.length > 0 ? (
                        renderCategoryTree(categoryTree)
                      ) : (
                        <p className="text-center py-4">Kategori bulunamadı</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Yeni kategori ekleme dialog'u */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Yeni Kategori Ekle</DialogTitle>
              <DialogDescription>
                Kataloğunuza yeni bir kategori ekleyin. Ürünlerinizi kategorilere ayırarak müşterilerinizin ürünleri daha kolay bulmasını sağlayabilirsiniz.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <Tabs defaultValue="basic">
                  <TabsList className="mb-4">
                    <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                    <TabsTrigger value="display">Görünüm</TabsTrigger>
                    <TabsTrigger value="comparison">Karşılaştırma</TabsTrigger>
                    <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Temel Bilgiler</CardTitle>
                        <CardDescription>
                          Kategori temel bilgilerini girin
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kategori Adı*</FormLabel>
                              <FormControl>
                                <Input placeholder="Kategori adı girin" {...field} />
                              </FormControl>
                              <FormDescription>
                                Bu isim kategori listesinde ve ürün detaylarında görünecektir.
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
                                  placeholder="Kategori hakkında kısa açıklama" 
                                  className="resize-none" 
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Kategorinin içeriğine dair kısa bir açıklama.
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
                                  Kategorinin görüntülenme sırası. Düşük değerler daha önce gösterilir.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="parentSlug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Üst Kategori</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Üst kategori seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Üst Kategori Yok</SelectItem>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.slug}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Bu kategori bir üst kategorinin alt kategorisi olacaksa seçin.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Aktif</FormLabel>
                                <FormDescription>
                                  Bu kategori aktif olarak gösterilsin mi?
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="seo" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>SEO Bilgileri</CardTitle>
                        <CardDescription>
                          Arama motorları için SEO ayarları
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="seoTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SEO Başlığı</FormLabel>
                              <FormControl>
                                <Input placeholder="SEO başlığı" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormDescription>
                                Sayfa başlığı olarak görünecek metin (boş bırakılırsa kategori adı kullanılır)
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
                                  placeholder="SEO açıklaması" 
                                  className="resize-none" 
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Arama motorlarında görünecek kategori açıklaması
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
                                <Input placeholder="anahtar,kelimeler,virgülle,ayrılmış" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormDescription>
                                Virgülle ayrılmış SEO anahtar kelimeleri
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="display" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Görünüm Ayarları</CardTitle>
                        <CardDescription>
                          Kategorinin sitede nerede görüntüleneceğini belirleyin
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  <FormLabel>Öne Çıkan Kategori</FormLabel>
                                  <FormDescription>
                                    Bu kategoriyi vitrin/anasayfada öne çıkar
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="showInSlider"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Slider'da Göster</FormLabel>
                                  <FormDescription>
                                    Bu kategoriyi ana sayfa sliderında göster
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                                  <FormLabel>Header'da Göster</FormLabel>
                                  <FormDescription>
                                    Kategori, sitenin üst menüsünde görüntülenecek
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
                                  <FormLabel>Footer'da Göster</FormLabel>
                                  <FormDescription>
                                    Kategori, sitenin alt kısmında görüntülenecek
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
                                  <FormLabel>Sidebar'da Göster</FormLabel>
                                  <FormDescription>
                                    Kategori, yan menüde görüntülenecek
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="comparison" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Karşılaştırma Ayarları</CardTitle>
                        <CardDescription>
                          Bu kategorideki ürün karşılaştırma özellikleri
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="allowProductComparison"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Ürün Karşılaştırmasına İzin Ver</FormLabel>
                                <FormDescription>
                                  Bu kategorideki ürünlerin karşılaştırılmasını sağlar
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="maxCompareProducts"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maksimum Karşılaştırılabilir Ürün</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" max="10" placeholder="4" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Bu kategoride en fazla kaç ürünün karşılaştırılabileceğini belirler
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Gelişmiş Ayarlar</CardTitle>
                        <CardDescription>
                          Kategorinin gelişmiş ayarları
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="productsPerPage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sayfa Başına Ürün</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" max="100" placeholder="12" {...field} />
                              </FormControl>
                              <FormDescription>
                                Kategori sayfasında kaç ürün gösterileceğini belirler
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="showOutOfStock"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Stokta Olmayan Ürünleri Göster</FormLabel>
                                <FormDescription>
                                  Stokta olmayan ürünlerin bu kategori sayfasında gösterilip gösterilmeyeceğini belirler
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="freeShipping"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Ücretsiz Kargo</FormLabel>
                                <FormDescription>
                                  Bu kategorideki ürünler için ücretsiz kargo sağlanıp sağlanmayacağını belirler
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="freeShippingThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ücretsiz Kargo Limiti</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" placeholder="250" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormDescription>
                                  Bu değerin üzerindeki siparişler için ücretsiz kargo sağlanır (TL)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

CategoriesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default CategoriesPage

