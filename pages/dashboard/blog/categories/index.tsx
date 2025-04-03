import React, { ReactElement, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Search,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Folders,
  Edit,
  FolderTree,
  LayoutList,
  LayoutGrid,
  ToggleLeft,
  Filter,
  Download,
  FileJson,
  FileSpreadsheet,
  Eye
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
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Label
} from '@/components/ui/label'

// Blog kategori şeması
const categorySchema = z.object({
  name: z.string().min(2, {
    message: 'Kategori adı en az 2 karakter olmalıdır.',
  }),
  slug: z.string().min(2, {
    message: 'Kategori slug\'ı en az 2 karakter olmalıdır ve özel karakter içermelidir.',
  }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug sadece küçük harfler, sayılar ve tire (-) içerebilir.'
  }),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

// BlogCategory tipi
interface BlogCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    posts: number
  }
}

// Ana sayfa bileşeni
function BlogCategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State'ler
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    isActive: 'all',
    postCount: 'all',
    sortBy: 'name_asc',
    dateRange: 'all'
  });
  const [error, setError] = useState<string | null>(null);

  // Sütun başlıkları
  const columns = [
    { key: 'name', label: 'Kategori Adı' },
    { key: 'slug', label: 'Slug' },
    { key: 'postCount', label: 'Yazı Sayısı' },
    { key: 'isActive', label: 'Durum' },
    { key: 'createdAt', label: 'Oluşturulma' },
    { key: 'actions', label: 'İşlemler' }
  ];

  // Form tanımı
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      isActive: true
    }
  });

  // Kategorileri yükle
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/dashboard/blog/categories');
      const categoriesWithCounts = response.data;
      setCategories(categoriesWithCounts);
      setError(null);
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
      setError('Kategoriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sayfa yüklendiğinde kategorileri getir
  useEffect(() => {
    fetchCategories();
  }, []);

  // Sütun başlığına tıklandığında sıralama
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Kategori silme işlemi
  const handleDeleteCategory = (category: BlogCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  // Kategori silme onayı
  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      await axios.delete(`/api/dashboard/blog/categories/${categoryToDelete.id}`);
      
      toast({
        title: 'Başarılı',
        description: 'Kategori başarıyla silindi.'
      });
      
      fetchCategories();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error === 'CATEGORY_HAS_POSTS') {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Bu kategoriye ait blog yazıları olduğu için silinemez. Önce yazıları başka kategorilere taşıyın.'
        });
      } else if (error.response?.status === 400 && error.response?.data?.error === 'CATEGORY_HAS_CHILDREN') {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Bu kategorinin alt kategorileri olduğu için silinemez. Önce alt kategorileri silin veya taşıyın.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Kategori silinirken bir sorun oluştu.'
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  // Kategori düzenleme modalını aç
  const handleEditCategory = (category: BlogCategory) => {
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isActive: category.isActive
    });
    setCategoryToDelete(category);
    setIsEditDialogOpen(true);
  };

  // Yeni kategori ekleme modalını aç
  const handleNewCategory = () => {
    form.reset({
      name: '',
      slug: '',
      description: '',
      isActive: true
    });
    setIsNewDialogOpen(true);
  };

  // Slug oluşturma yardımcısı
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // İsim değiştiğinde otomatik slug oluştur
  const nameFieldValue = form.watch('name');

  useEffect(() => {
    if (isNewDialogOpen && nameFieldValue) {
      const generatedSlug = generateSlug(nameFieldValue);
      form.setValue('slug', generatedSlug);
    }
  }, [nameFieldValue, isNewDialogOpen, form]);

  // Kategori kaydet
  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    try {
      if (isEditDialogOpen && categoryToDelete) {
        // Mevcut kategoriyi güncelle
        await axios.put(`/api/dashboard/blog/categories/${categoryToDelete.id}`, values);
        toast({
          title: 'Başarılı',
          description: 'Kategori başarıyla güncellendi.'
        });
      } else {
        // Yeni kategori ekle
        await axios.post('/api/dashboard/blog/categories', values);
        toast({
          title: 'Başarılı',
          description: 'Kategori başarıyla eklendi.'
        });
      }
      
      // Listeyi yenile ve modalları kapat
      fetchCategories();
      setIsEditDialogOpen(false);
      setIsNewDialogOpen(false);
      setCategoryToDelete(null);
      form.reset();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error === 'SLUG_EXISTS') {
        form.setError('slug', { 
          type: 'manual',
          message: 'Bu slug zaten kullanılıyor. Lütfen başka bir slug girin.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Kategori kaydedilirken bir sorun oluştu.'
        });
      }
    }
  };

  // Filtrelenmiş ve sıralanmış kategoriler
  const filteredAndSortedCategories = React.useMemo(() => {
    // Önce filtreleme işlemini yap
    let result = [...categories];
    
    // Arama filtresi
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(category => 
        category.name.toLowerCase().includes(searchLower) ||
        (category.description && category.description.toLowerCase().includes(searchLower)) ||
        category.slug.toLowerCase().includes(searchLower)
      );
    }
    
    // Aktif/Pasif filtresi (Dropdown menü filtresi)
    if (filters.isActive !== 'all') {
      result = result.filter(category => {
        if (filters.isActive === 'active') return category.isActive;
        if (filters.isActive === 'inactive') return !category.isActive;
        return true;
      });
    }
    
    // Button bar filtresi (Aktif, Pasif, Tümü butonları)
    if (activeFilter !== null) {
      result = result.filter(category => category.isActive === activeFilter);
    }
    
    // Yazı sayısı filtresi
    if (filters.postCount !== 'all') {
      result = result.filter(category => {
        const postCount = category._count?.posts || 0;
        if (filters.postCount === 'with_posts') return postCount > 0;
        if (filters.postCount === 'without_posts') return postCount === 0;
        return true;
      });
    }
    
    // Sıralama
    return result.sort((a, b) => {
      // Sıralama dropdown'dan gelen sıralama yöntemine göre sırala
      if (filters.sortBy) {
        const [field, direction] = filters.sortBy.split('_');
        const isAsc = direction === 'asc';
        
        if (field === 'name') {
          return isAsc 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        }
        
        if (field === 'posts') {
          const aCount = a._count?.posts || 0;
          const bCount = b._count?.posts || 0;
          return isAsc ? aCount - bCount : bCount - aCount;
        }
        
        if (field === 'date') {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return isAsc ? aDate - bDate : bDate - aDate;
        }
      }
      
      // Varsayılan olarak sütun başlığından gelen sıralama yönünü kullan
      let valueA: any;
      let valueB: any;
      
      // Sıralama sütununa göre değerleri belirle
      switch(sortColumn) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'slug':
          valueA = a.slug.toLowerCase();
          valueB = b.slug.toLowerCase();
          break;
        case 'postCount':
          valueA = a._count?.posts || 0;
          valueB = b._count?.posts || 0;
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      // Sıralama yönüne göre sonucu belirle
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }, [categories, searchTerm, activeFilter, sortColumn, sortDirection, filters]);

  // Kategori durumunu değiştir (aktif/pasif)
  const toggleCategoryStatus = async (id: string, isActive: boolean) => {
    try {
      // Optimistik UI güncellemesi yapma
      setCategories(prevCategories => 
        prevCategories.map(category => 
          category.id === id 
            ? { ...category, isActive: !isActive } 
            : category
        )
      );
      
      // API çağrısı
      await axios.put(`/api/dashboard/blog/categories/${id}`, {
        isActive: !isActive
      });
      
      toast({
        title: 'Başarılı!',
        description: `Kategori ${isActive ? 'pasif' : 'aktif'} duruma getirildi.`,
      });
      
      // Hata durumunda tekrar veri çekmek için fetchCategories fonksiyonunu yorum satırına alıyorum
      // fetchCategories();
    } catch (err: any) {
      console.error('Kategori durumu değiştirilirken hata:', err);
      toast({
        title: 'Hata!',
        description: 'Kategori durumu değiştirilirken bir hata oluştu.',
        variant: 'destructive',
      });
      
      // Hata durumunda UI'ı eski haline getir
      setCategories(prevCategories => 
        prevCategories.map(category => 
          category.id === id 
            ? { ...category, isActive: isActive } 
            : category
        )
      );
      
      // Veri çekme
      fetchCategories();
    }
  };

  // Kategoriyi seç/kaldır
  const toggleSelectCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
    )
  }
  
  // Tüm kategorileri seç/kaldır
  const selectAllCategories = () => {
    const allCategoryIds = filteredAndSortedCategories.map(category => category.id)
    setSelectedCategories(prev => 
      prev.length === allCategoryIds.length ? [] : allCategoryIds
    )
  }
  
  // Seçili kategorileri toplu sil
  const deleteSelectedCategories = async () => {
    if (selectedCategories.length === 0) return;
    
    if (!confirm(`Seçilen ${selectedCategories.length} kategoriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }
    
    try {
      await Promise.all(selectedCategories.map(id => axios.delete(`/api/dashboard/blog/categories/${id}`)));
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedCategories.length} kategori başarıyla silindi` 
      });
      
      setSelectedCategories([]);
      fetchCategories();
    } catch (err: any) {
      const hasPostsError = selectedCategories.some(id => 
        err.response?.data?.error === 'CATEGORY_HAS_POSTS'
      );
      
      if (hasPostsError) {
        toast({
          title: 'Hata!',
          description: 'Bazı kategorilere ait blog yazıları olduğu için silinemedi. Önce yazıları başka kategorilere taşıyın.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Hata!',
          description: 'Kategoriler silinirken bir hata oluştu',
          variant: 'destructive'
        });
      }
    }
  };

  // Kategorileri dışa aktar
  const exportCategories = (format: 'json' | 'csv' | 'excel') => {
    if (!filteredAndSortedCategories.length) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dışa aktarılacak kategori bulunamadı."
      });
      return;
    }
    
    // JSON formatında dışa aktarma
    if (format === 'json') {
      const jsonData = JSON.stringify(filteredAndSortedCategories, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
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
      const headers = ['ID', 'Kategori Adı', 'Açıklama', 'Slug', 'Durum', 'Yazı Sayısı', 'Oluşturulma Tarihi'];
      const csvData = filteredAndSortedCategories.map(category => [
        category.id,
        category.name,
        category.description || '',
        category.slug,
        category.isActive ? 'Aktif' : 'Pasif',
        category._count?.posts || 0,
        category.createdAt ? new Date(category.createdAt).toLocaleDateString('tr-TR') : ''
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
      a.download = `kategoriler_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Excel formatında dışa aktarma (basit CSV olarak)
    else if (format === 'excel') {
      const headers = ['ID', 'Kategori Adı', 'Açıklama', 'Slug', 'Durum', 'Yazı Sayısı', 'Oluşturulma Tarihi'];
      const csvData = filteredAndSortedCategories.map(category => [
        category.id,
        category.name,
        category.description || '',
        category.slug,
        category.isActive ? 'Aktif' : 'Pasif',
        category._count?.posts || 0,
        category.createdAt ? new Date(category.createdAt).toLocaleDateString('tr-TR') : ''
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
      a.download = `kategoriler_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Yükleme durumunda iskelet görünümü
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Arayüz
  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blog Kategorileri</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/blog">
              <ArrowLeft className="mr-2 h-4 w-4" /> Blog
          </Link>
          </Button>
        <Button onClick={handleNewCategory}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Kategori
        </Button>
        </div>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
              placeholder="Kategori ara..."
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
                  value={filters.sortBy.split('_')[0]} 
                  onValueChange={(value) => {
                    const direction = filters.sortBy.includes('desc') ? 'desc' : 'asc';
                    setFilters({...filters, sortBy: `${value}_${direction}`});
                  }}
                >
                  <DropdownMenuRadioItem value="name">Kategori Adı</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="posts">Yazı Sayısı</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="date">Oluşturulma Tarihi</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sıralama Yönü</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuRadioGroup 
                  value={filters.sortBy.includes('desc') ? 'desc' : 'asc'} 
                  onValueChange={(value) => {
                    const field = filters.sortBy.split('_')[0];
                    setFilters({...filters, sortBy: `${field}_${value}`});
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
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? (
                <>
                  <LayoutList className="mr-2 h-4 w-4" />
                  Tablo Görünümü
                </>
              ) : (
                <>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Grid Görünümü
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
                  <Label>Yazı Sayısı</Label>
                  <Select 
                    value={filters.postCount} 
                    onValueChange={(value) => setFilters({...filters, postCount: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Yazı sayısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="with_posts">Yazısı Olanlar</SelectItem>
                      <SelectItem value="without_posts">Yazısı Olmayanlar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Oluşturulma Tarihi</Label>
                  <Select 
                    value={filters.dateRange || 'all'} 
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
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(false)}>
                <X className="mr-2 h-4 w-4" />
                Kapat
              </Button>
              <Button
                variant="default" 
                size="sm"
                onClick={() => {
                  setFilters({
                    isActive: 'all',
                    postCount: 'all',
                    sortBy: 'name_asc',
                    dateRange: 'all'
                  });
                  setSearchTerm('');
                }}
              >
                Filtreleri Sıfırla
              </Button>
            </CardFooter>
          </Card>
        )}
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
                if (selectedCategories.length > 0) {
                  const targetStatus = !filteredAndSortedCategories.find(c => c.id === selectedCategories[0])?.isActive;
                  selectedCategories.forEach(id => toggleCategoryStatus(id, !targetStatus));
                }
              }}
            >
              <ToggleLeft className="mr-2 h-4 w-4" />
              Durumu Değiştir
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={deleteSelectedCategories}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {selectedCategories.length === 1 ? 'Sil' : 'Toplu Sil'}
              </Button>
            </div>
          </div>
      )}

      {/* Kategoriler Listesi */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Kategori Yönetimi</CardTitle>
          <CardDescription>
            Sistemdeki tüm blog kategorilerini görüntüleyin, düzenleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="list" value={viewMode} onValueChange={(value: string) => setViewMode(value as 'list' | 'grid')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="h-9">
                <TabsTrigger value="list" className="flex items-center px-3">
                  <LayoutList className="h-4 w-4 mr-2" />
                  Liste
                </TabsTrigger>
                <TabsTrigger value="grid" className="flex items-center px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="list" className="mt-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={
                            filteredAndSortedCategories.length > 0 && 
                            selectedCategories.length === filteredAndSortedCategories.length
                          } 
                          onCheckedChange={selectAllCategories}
                          aria-label="Tüm kategorileri seç"
                        />
                      </TableHead>
                      <TableHead className="w-12">Sıra</TableHead>
                  <TableHead className="min-w-[200px]">
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      Kategori Adı
                      {sortColumn === 'name' ? (
                        sortDirection === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => handleSort('slug')}
                    >
                      Slug
                      {sortColumn === 'slug' ? (
                        sortDirection === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => handleSort('postCount')}
                    >
                      Yazı Sayısı
                      {sortColumn === 'postCount' ? (
                        sortDirection === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Gösterilecek kategori bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedCategories.map((category, index) => (
                    <TableRow key={category.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={() => toggleSelectCategory(category.id)}
                              aria-label={`${category.name} kategorisini seç`}
                            />
                          </TableCell>
                          <TableCell>
                            {index + 1}
                          </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{category.name}</div>
                            {category.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {category.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {category.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                            {category._count?.posts || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                              variant={category.isActive ? "default" : "secondary"}
                        >
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="Görüntüle"
                              >
                                <Link href={`/dashboard/blog/categories/${category.slug}`}>
                                  <Eye size={16} />
                                </Link>
                              </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                            title="Düzenle"
                          >
                                <Edit size={16} />
                            <span className="sr-only">Düzenle</span>
                          </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleCategoryStatus(category.id, category.isActive)}
                                title={category.isActive ? "Pasife Al" : "Aktife Al"}
                              >
                                <Switch
                                  checked={category.isActive}
                                  className="scale-75"
                                />
                              </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category)}
                            title="Sil"
                          >
                                <Trash2 size={16} />
                            <span className="sr-only">Sil</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
              </div>
            </TabsContent>

            <TabsContent value="grid" className="mt-0">
              {filteredAndSortedCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Gösterilecek kategori bulunamadı.</p>
                  <Button variant="outline" className="mt-4" onClick={handleNewCategory}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Kategori Ekle
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredAndSortedCategories.map((category) => (
                    <Card key={category.id} className="overflow-hidden">
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <Checkbox 
                            id={`select-category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => toggleSelectCategory(category.id)}
                            className="mr-2"
                          />
                          <div className="flex-1 ml-2">
                            <div className="font-medium">{category.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {category._count?.posts || 0} yazı
                            </div>
                          </div>
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs">
                            {category.slug}
                          </code>
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {category.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          ID: {category.id.substring(0, 8)}...
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                        <div className="flex justify-between w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Düzenle
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteCategory(category)}
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between w-full">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full"
                            onClick={() => toggleCategoryStatus(category.id, category.isActive)}
                          >
                            <Switch
                              checked={category.isActive}
                              className="mr-2 scale-75"
                            />
                            {category.isActive ? "Aktif" : "Pasif"}
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

      {/* Silme Onay Modalı */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyi Sil</DialogTitle>
            <DialogDescription>
              Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {categoryToDelete && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                  <FolderTree className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{categoryToDelete.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {categoryToDelete._count?.posts || 0} yazı
                  </div>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{categoryToDelete.slug}</code>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Düzenleme / Yeni Kategori Modalı */}
      <Dialog 
        open={isEditDialogOpen || isNewDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsEditDialogOpen(false);
            setIsNewDialogOpen(false);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? 'Kategori bilgilerini düzenleyin ve kaydedin.'
                : 'Yeni bir blog kategorisi oluşturun.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="general">
                <TabsList className="mb-4">
                  <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
                  <TabsTrigger value="advanced">Gelişmiş Ayarlar</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                        <FormLabel>Kategori Adı*</FormLabel>
                    <FormControl>
                      <Input placeholder="Örnek: Teknoloji" {...field} />
                    </FormControl>
                    <FormDescription>
                      Kategorinin görüntülenecek adı.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                        <FormLabel>SEO Slug*</FormLabel>
                    <FormControl>
                      <Input placeholder="teknoloji" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL'de görünecek kategori kodu. Küçük harfler, sayılar ve tire (-) kullanabilirsiniz.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                            Kategoriyi aktif veya pasif olarak ayarlayın. Pasif kategoriler blogda görüntülenmez.
                    </FormDescription>
                        </div>
                  </FormItem>
                )}
              />
                </TabsContent>
              
                <TabsContent value="advanced" className="space-y-6">
              <FormField
                control={form.control}
                    name="description"
                render={({ field }) => (
                  <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                          <Textarea 
                            placeholder="Bu kategori hakkında kısa bir açıklama..." 
                            className="resize-none min-h-[150px]"
                            {...field}
                            value={field.value || ''}
                          />
                    </FormControl>
                    <FormDescription>
                          Kategori hakkında kısa bir açıklama (isteğe bağlı).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setIsNewDialogOpen(false);
                  form.reset();
                }}>
                  İptal
                </Button>
                <Button type="submit">
                  {isEditDialogOpen ? (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Güncelle
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Ekle
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

BlogCategoriesPage.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default BlogCategoriesPage; 