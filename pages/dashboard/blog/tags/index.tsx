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
  Tag,
  Edit,
  LayoutList,
  LayoutGrid,
  Filter,
  Download,
  FileJson,
  FileSpreadsheet,
  Eye,
  ToggleLeft
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
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// Blog etiket şeması
const tagSchema = z.object({
  name: z.string().min(2, {
    message: 'Etiket adı en az 2 karakter olmalıdır.',
  }),
  slug: z.string().min(2, {
    message: 'Etiket slug\'ı en az 2 karakter olmalıdır ve özel karakter içermemelidir.',
  }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug sadece küçük harfler, sayılar ve tire (-) içerebilir.'
  })
});

// BlogTag tipi
interface BlogTag {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  _count?: {
    posts: number
  }
}

// Ana sayfa bileşeni
function BlogTagsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State'ler
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<BlogTag | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    postCount: 'all',
    sortBy: 'name_asc',
    dateRange: 'all'
  });

  // Sütun başlıkları
  const columns = [
    { key: 'name', label: 'Etiket Adı' },
    { key: 'slug', label: 'Slug' },
    { key: 'postCount', label: 'Yazı Sayısı' },
    { key: 'createdAt', label: 'Oluşturulma' },
    { key: 'actions', label: 'İşlemler' }
  ];

  // Form tanımı
  const form = useForm<z.infer<typeof tagSchema>>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      slug: ''
    }
  });

  // Etiketleri yükle
  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/dashboard/blog/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Etiketler yüklenirken hata:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Etiketler yüklenirken bir sorun oluştu.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sayfa yüklendiğinde etiketleri getir
  useEffect(() => {
    fetchTags();
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

  // Etiket silme işlemi
  const handleDeleteTag = (tag: BlogTag) => {
    setTagToDelete(tag);
    setIsDeleteDialogOpen(true);
  };

  // Etiket silme onayı
  const confirmDelete = async () => {
    if (!tagToDelete) return;
    
    try {
      await axios.delete(`/api/dashboard/blog/tags/${tagToDelete.id}`);
      
      toast({
        title: 'Başarılı',
        description: 'Etiket başarıyla silindi.'
      });
      
      fetchTags();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error === 'TAG_HAS_POSTS') {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Bu etikete ait blog yazıları olduğu için silinemez.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Etiket silinirken bir sorun oluştu.'
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setTagToDelete(null);
    }
  };

  // Etiket düzenleme modalını aç
  const handleEditTag = (tag: BlogTag) => {
    form.reset({
      name: tag.name,
      slug: tag.slug
    });
    setTagToDelete(tag);
    setIsEditDialogOpen(true);
  };

  // Yeni etiket ekleme modalını aç
  const handleNewTag = () => {
    form.reset({
      name: '',
      slug: ''
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

  // Etiket kaydet
  const onSubmit = async (values: z.infer<typeof tagSchema>) => {
    try {
      if (isEditDialogOpen && tagToDelete) {
        // Mevcut etiketi güncelle
        await axios.put(`/api/dashboard/blog/tags/${tagToDelete.id}`, values);
        toast({
          title: 'Başarılı',
          description: 'Etiket başarıyla güncellendi.'
        });
      } else {
        // Yeni etiket ekle
        await axios.post('/api/dashboard/blog/tags', values);
        toast({
          title: 'Başarılı',
          description: 'Etiket başarıyla eklendi.'
        });
      }
      
      // Listeyi yenile ve modalları kapat
      fetchTags();
      setIsEditDialogOpen(false);
      setIsNewDialogOpen(false);
      setTagToDelete(null);
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
          description: 'Etiket kaydedilirken bir sorun oluştu.'
        });
      }
    }
  };

  // Filtrelenmiş ve sıralanmış etiketler
  const filteredAndSortedTags = React.useMemo(() => {
    // Önce filtreleme işlemini yap
    let result = [...tags];
    
    // Arama filtresi
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(tag => 
        tag.name.toLowerCase().includes(searchLower) ||
        tag.slug.toLowerCase().includes(searchLower)
      );
    }
    
    // Yazı sayısı filtresi
    if (filters.postCount !== 'all') {
      result = result.filter(tag => {
        const postCount = tag._count?.posts || 0;
        if (filters.postCount === 'with_posts') return postCount > 0;
        if (filters.postCount === 'without_posts') return postCount === 0;
        return true;
      });
    }
    
    // Tarih filtresi
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (filters.dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (filters.dateRange === 'thisWeek') {
        const day = startDate.getDay() || 7;
        if (day !== 1) {
          startDate.setHours(-24 * (day - 1));
        }
        startDate.setHours(0, 0, 0, 0);
      } else if (filters.dateRange === 'thisMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filters.dateRange === 'thisYear') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      
      result = result.filter(tag => {
        const tagDate = new Date(tag.createdAt);
        return tagDate >= startDate && tagDate <= now;
      });
    }
    
    // Sıralama
    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split('_');
      const isAsc = direction === 'asc';
      
      return result.sort((a, b) => {
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
        
        // Varsayılan sıralama
        let valueA: any = a.name.toLowerCase();
        let valueB: any = b.name.toLowerCase();
        
        // Sıralama yönüne göre sonucu belirle
        if (isAsc) {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });
    } else {
      // Eski sıralama mantığı (sütun başlığından gelen)
      return result.sort((a, b) => {
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
    }
  }, [tags, searchTerm, sortColumn, sortDirection, filters]);

  // Etiketi seç/kaldır
  const toggleSelectTag = (id: string) => {
    setSelectedTags(prev => 
      prev.includes(id) ? prev.filter(tagId => tagId !== id) : [...prev, id]
    )
  }
  
  // Tüm etiketleri seç/kaldır
  const selectAllTags = () => {
    const allTagIds = filteredAndSortedTags.map(tag => tag.id)
    setSelectedTags(prev => 
      prev.length === allTagIds.length ? [] : allTagIds
    )
  }
  
  // Seçili etiketleri toplu sil
  const deleteSelectedTags = async () => {
    if (selectedTags.length === 0) return;
    
    if (!confirm(`Seçilen ${selectedTags.length} etiketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }
    
    try {
      await Promise.all(selectedTags.map(id => axios.delete(`/api/dashboard/blog/tags/${id}`)));
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedTags.length} etiket başarıyla silindi` 
      });
      
      setSelectedTags([]);
      fetchTags();
    } catch (err: any) {
      const hasPostsError = selectedTags.some(id => 
        err.response?.data?.error === 'TAG_HAS_POSTS'
      );
      
      if (hasPostsError) {
        toast({
          title: 'Hata!',
          description: 'Bazı etiketlere ait blog yazıları olduğu için silinemedi.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Hata!',
          description: 'Etiketler silinirken bir hata oluştu',
          variant: 'destructive'
        });
      }
    }
  };
  
  // Etiketleri dışa aktar
  const exportTags = (format: 'json' | 'csv' | 'excel') => {
    if (!filteredAndSortedTags.length) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dışa aktarılacak etiket bulunamadı."
      });
      return;
    }
    
    // JSON formatında dışa aktarma
    if (format === 'json') {
      const jsonData = JSON.stringify(filteredAndSortedTags, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiketler_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // CSV formatında dışa aktarma
    else if (format === 'csv') {
      const headers = ['ID', 'Etiket Adı', 'Slug', 'Yazı Sayısı', 'Oluşturulma Tarihi'];
      const csvData = filteredAndSortedTags.map(tag => [
        tag.id,
        tag.name,
        tag.slug,
        tag._count?.posts || 0,
        tag.createdAt ? new Date(tag.createdAt).toLocaleDateString('tr-TR') : ''
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
      a.download = `etiketler_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Excel formatında dışa aktarma (basit CSV olarak)
    else if (format === 'excel') {
      const headers = ['ID', 'Etiket Adı', 'Slug', 'Yazı Sayısı', 'Oluşturulma Tarihi'];
      const csvData = filteredAndSortedTags.map(tag => [
        tag.id,
        tag.name,
        tag.slug,
        tag._count?.posts || 0,
        tag.createdAt ? new Date(tag.createdAt).toLocaleDateString('tr-TR') : ''
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
      a.download = `etiketler_${new Date().toISOString().split('T')[0]}.xls`;
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
        <h1 className="text-3xl font-bold">Blog Etiketleri</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/blog">
              <ArrowLeft className="mr-2 h-4 w-4" /> Blog
            </Link>
          </Button>
          <Button onClick={handleNewTag}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Etiket
          </Button>
        </div>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Etiket ara..."
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
                  <DropdownMenuRadioItem value="name">Etiket Adı</DropdownMenuRadioItem>
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
                <DropdownMenuItem onClick={() => exportTags('json')}>
                  <FileJson className="mr-2 h-4 w-4" />
                  <span>JSON Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTags('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>CSV Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTags('excel')}>
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
      </div>
      
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Gelişmiş Filtreler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      
      {/* Seçili etiketler için toplu işlem butonları */}
      {selectedTags.length > 0 && (
        <div className="bg-muted p-2 rounded-md flex items-center justify-between mt-4 mb-6">
          <div className="text-sm font-medium">
            {selectedTags.length} etiket seçildi
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSelectedTags([]);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Seçimi Temizle
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={deleteSelectedTags}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {selectedTags.length === 1 ? 'Sil' : 'Toplu Sil'}
            </Button>
          </div>
        </div>
      )}
      
      {/* Etiketler Listesi */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Etiket Yönetimi</CardTitle>
          <CardDescription>
            Sistemdeki tüm blog etiketlerini görüntüleyin, düzenleyin ve yönetin.
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
                            filteredAndSortedTags.length > 0 && 
                            selectedTags.length === filteredAndSortedTags.length
                          } 
                          onCheckedChange={selectAllTags}
                          aria-label="Tüm etiketleri seç"
                        />
                      </TableHead>
                      <TableHead className="w-12">Sıra</TableHead>
                      <TableHead className="min-w-[200px]">
                        <div 
                          className="flex items-center cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          Etiket Adı
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
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Gösterilecek etiket bulunamadı.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedTags.map((tag, index) => (
                        <TableRow key={tag.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedTags.includes(tag.id)}
                              onCheckedChange={() => toggleSelectTag(tag.id)}
                              aria-label={`${tag.name} etiketini seç`}
                            />
                          </TableCell>
                          <TableCell>
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="font-medium">{tag.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                              {tag.slug}
                            </code>
                          </TableCell>
                          <TableCell>
                            {tag._count?.posts || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTag(tag)}
                                title="Düzenle"
                              >
                                <Edit size={16} />
                                <span className="sr-only">Düzenle</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTag(tag)}
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
              {filteredAndSortedTags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Gösterilecek etiket bulunamadı.</p>
                  <Button variant="outline" className="mt-4" onClick={handleNewTag}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Etiket Ekle
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredAndSortedTags.map((tag, index) => (
                    <Card key={tag.id} className="overflow-hidden">
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <Checkbox 
                            id={`select-tag-${tag.id}`}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => toggleSelectTag(tag.id)}
                            className="mr-2"
                          />
                          <div className="flex-1 ml-2">
                            <div className="font-medium">{tag.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {tag._count?.posts || 0} yazı
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs">
                            {tag.slug}
                          </code>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          ID: {tag.id.substring(0, 8)}...
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                        <div className="flex justify-between w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditTag(tag)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Düzenle
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteTag(tag)}
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <DialogTitle>Etiketi Sil</DialogTitle>
            <DialogDescription>
              Bu etiketi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {tagToDelete && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{tagToDelete.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {tagToDelete._count?.posts || 0} yazı
                  </div>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{tagToDelete.slug}</code>
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

      {/* Düzenleme / Yeni Etiket Modalı */}
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
              {isEditDialogOpen ? 'Etiketi Düzenle' : 'Yeni Etiket Ekle'}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? 'Etiket bilgilerini düzenleyin ve kaydedin.'
                : 'Yeni bir blog etiketi oluşturun.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etiket Adı*</FormLabel>
                    <FormControl>
                      <Input placeholder="Örnek: Teknoloji" {...field} />
                    </FormControl>
                    <FormDescription>
                      Etiketin görüntülenecek adı.
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
                      URL'de görünecek etiket kodu. Küçük harfler, sayılar ve tire (-) kullanabilirsiniz.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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

BlogTagsPage.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default BlogTagsPage; 