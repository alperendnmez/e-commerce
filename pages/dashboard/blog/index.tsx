import React, { ReactElement, useState, useEffect, useMemo } from 'react'
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
  Eye, 
  Search,
  Image as ImageIcon,
  Loader2,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Download,
  LayoutList,
  LayoutGrid,
  Calendar,
  Clock,
  Tag,
  BookOpen,
  Bookmark,
  Edit,
  ArrowLeft,
  X,
  ToggleLeft,
  MoreHorizontal,
  FileJson,
  FileSpreadsheet
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
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// Blog tipi
interface BlogPost {
  id: string // ID string (UUID) tipi olarak değiştirildi
  title: string
  slug: string
  excerpt?: string | null
  content: string
  featuredImage?: string | null
  categoryId?: string | null // kategori ID'si de string oldu
  categoryName?: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  viewCount: number
  authorId: number
  authorName?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string | null
  tags: string[]
}

// BlogCategory tipi
interface BlogCategory {
  id: string // Kategori ID'si string
  name: string
  slug: string
  description?: string | null
  isActive: boolean
}

// Ana sayfa bileşeni
function BlogPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // State'ler
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string>('publishedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null)
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',    // 'all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'
    category: 'all',  // 'all' veya kategori ID
    dateRange: 'all', // 'all', 'today', 'thisWeek', 'thisMonth', 'thisYear'
    sortBy: 'publishedAt', // 'title', 'publishedAt', 'viewCount', 'createdAt'
    sortOrder: 'desc' // 'asc', 'desc'
  })
  
  // Blog yazılarını yükle
  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/dashboard/blog')
      setPosts(response.data)
    } catch (error) {
      console.error('Blog yazıları yüklenirken hata:', error)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Blog yazıları yüklenirken bir sorun oluştu.'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Kategorileri yükle
  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/dashboard/blog/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('Blog kategorileri yüklenirken hata:', error)
    }
  }
  
  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [])
  
  // Sütun başlığına tıklandığında sıralama
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }
  
  // Blog yazısı silme işlemi
  const handleDeletePost = async (post: BlogPost) => {
    setPostToDelete(post)
    setIsDeleteDialogOpen(true)
  }
  
  // Blog yazısı silme onayı
  const confirmDelete = async () => {
    if (!postToDelete) return
    
    try {
      await axios.delete(`/api/dashboard/blog/${postToDelete.id}`)
      toast({
        title: 'Başarılı',
        description: 'Blog yazısı başarıyla silindi.'
      })
      fetchPosts() // Listeyi yenile
    } catch (error) {
      console.error('Blog yazısı silinirken hata:', error)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Blog yazısı silinirken bir sorun oluştu.'
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setPostToDelete(null)
    }
  }
  
  // Durum etiketinin rengini belirle
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
      case 'PUBLISHED': return 'default'
      case 'DRAFT': return 'secondary'
      case 'ARCHIVED': return 'destructive'
      default: return 'outline'
    }
  }
  
  // Yazıyı seç/kaldır
  const toggleSelectPost = (id: string) => {
    setSelectedPosts(prev => 
      prev.includes(id) ? prev.filter(postId => postId !== id) : [...prev, id]
    )
  }
  
  // Tüm yazıları seç/kaldır
  const selectAllPosts = () => {
    const allPostIds = filteredPosts.map(post => post.id)
    setSelectedPosts(prev => 
      prev.length === allPostIds.length ? [] : allPostIds
    )
  }
  
  // Seçili yazıları toplu sil
  const bulkDelete = async () => {
    if (selectedPosts.length === 0) return;
    
    if (!confirm(`Seçilen ${selectedPosts.length} yazıyı silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      await Promise.all(selectedPosts.map(id => axios.delete(`/api/dashboard/blog/${id}`)));
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedPosts.length} yazı başarıyla silindi` 
      });
      
      setSelectedPosts([]);
      fetchPosts();
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Yazılar silinirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  };
  
  // Seçili yazıların durumunu toplu değiştir
  const toggleSelectedPostsStatus = async (id: string, newStatus: 'DRAFT' | 'PUBLISHED') => {
    try {
      await axios.patch(`/api/dashboard/blog/${id}`, {
        published: newStatus === 'PUBLISHED'
      });
      
      toast({ 
        title: 'Başarılı', 
        description: `Blog yazısının durumu "${newStatus}" olarak güncellendi` 
      });
      
      fetchPosts();
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Yazının durumu değiştirilirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  };
  
  // Filtrelenmiş blogları hesapla (useMemo içinde tanımlanacak)
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
    // Arama filtresi
      if (searchTerm && !post.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
    }
    
    // Durum filtresi
      if (statusFilter !== 'all' && post.status !== statusFilter) {
        return false;
    }
    
    // Kategori filtresi
      if (categoryFilter !== 'all' && post.categoryId !== categoryFilter) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
    // Sıralama
      if (sortColumn === 'title') {
        return sortDirection === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      
      if (sortColumn === 'publishedAt') {
        // Yayınlanmamış yazıları en sona koy
        if (!a.publishedAt) return sortDirection === 'asc' ? -1 : 1;
        if (!b.publishedAt) return sortDirection === 'asc' ? 1 : -1;
        
        return sortDirection === 'asc'
          ? new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
          : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      
      if (sortColumn === 'viewCount') {
        return sortDirection === 'asc'
          ? a.viewCount - b.viewCount
          : b.viewCount - a.viewCount;
      }
      
      // Varsayılan sıralama
      return 0;
    });
  }, [posts, searchTerm, statusFilter, categoryFilter, sortColumn, sortDirection]);
  
  // Blog yazılarını dışa aktar
  const exportPosts = (format: 'json' | 'csv' | 'excel') => {
    let dataStr = '';
    let filename = '';
    
    if (format === 'json') {
      // JSON formatında dışa aktar
      const data = filteredPosts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        category: post.categoryName || '',
        status: post.status,
        publishedAt: post.publishedAt || '',
        viewCount: post.viewCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        tags: post.tags || []
      }));
      
      dataStr = JSON.stringify(data, null, 2);
      filename = `blog-posts-${new Date().toISOString().slice(0, 10)}.json`;
    } else if (format === 'csv' || format === 'excel') {
      // CSV formatında dışa aktar
      const headers = ['ID', 'Başlık', 'Slug', 'Özet', 'Kategori', 'Durum', 'Yayın Tarihi', 'Görüntülenme', 'Oluşturulma Tarihi', 'Güncelleme Tarihi', 'Etiketler'];
      const rows = filteredPosts.map(post => [
        post.id,
        `"${post.title.replace(/"/g, '""')}"`,
        post.slug,
        `"${(post.excerpt || '').replace(/"/g, '""')}"`,
        post.categoryName || '',
        post.status,
        post.publishedAt || '',
        post.viewCount.toString(),
        post.createdAt,
        post.updatedAt,
        `"${(post.tags || []).join(', ')}"`
      ]);
      
      dataStr = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `blog-posts-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    }
    
    // Dosyayı indir
    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: 'Dışa Aktarma Başarılı',
      description: `Blog yazıları ${format.toUpperCase()} formatında dışa aktarıldı.`,
    });
  }
  
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
                  <Skeleton className="h-12 w-12 rounded-full" />
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
    )
  }
  
  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blog Yazıları</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
          </Link>
            </Button>
          <Button asChild>
            <Link href="/dashboard/blog/new">
              <Plus className="mr-2 h-4 w-4" /> Yeni Yazı
          </Link>
          </Button>
        </div>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
              placeholder="Blog yazısı ara..."
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
                  <DropdownMenuRadioItem value="title">Başlık</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="publishedAt">Yayın Tarihi</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="viewCount">Görüntülenme</DropdownMenuRadioItem>
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
                <DropdownMenuItem onClick={() => exportPosts('json')}>
                  <FileJson className="mr-2 h-4 w-4" />
                  <span>JSON Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPosts('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>CSV Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPosts('excel')}>
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
                  Kart Görünümü
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Seçili blog yazıları için toplu işlem butonları */}
        {selectedPosts.length > 0 && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between mt-4">
            <div className="text-sm font-medium">
              {selectedPosts.length} yazı seçildi
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedPosts([]);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Seçimi Temizle
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const targetStatus = prompt('Yeni durum (PUBLISHED, DRAFT, ARCHIVED):', 'PUBLISHED');
                  if (targetStatus && ['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(targetStatus)) {
                    selectedPosts.forEach(id => toggleSelectedPostsStatus(id, targetStatus as 'DRAFT' | 'PUBLISHED'));
                  }
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
                {selectedPosts.length === 1 ? 'Sil' : 'Toplu Sil'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Gelişmiş filtreler */}
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
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="PUBLISHED">Yayında</SelectItem>
                  <SelectItem value="DRAFT">Taslak</SelectItem>
                  <SelectItem value="ARCHIVED">Arşivlenmiş</SelectItem>
                </SelectContent>
              </Select>
                </div>
              
                <div className="space-y-2">
                  <Label>Kategori</Label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                  {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
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
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    setFilters({
                      status: 'all',
                      category: 'all',
                      dateRange: 'all',
                      sortBy: 'publishedAt',
                      sortOrder: 'desc'
                    });
                  }}
                >
                  Filtreleri Temizle
                  </Button>
            </div>
            </CardContent>
          </Card>
        )}
          </div>
          
      {/* Tablo veya grid görünümü */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <Card>
              <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllPosts();
                            } else {
                              setSelectedPosts([]);
                            }
                          }}
                          aria-label="Tüm yazıları seç"
                        />
                      </TableHead>
                    <TableHead className="min-w-[300px]">
                        <div className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort('title')}>
                        Başlık
                          {sortColumn === 'title' && (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                        ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                        )}
                          {sortColumn !== 'title' && <ArrowUpDown className="h-4 w-4" />}
                      </div>
                    </TableHead>
                      <TableHead>Kategori</TableHead>
                    <TableHead>
                        <div className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort('publishedAt')}>
                          Yayın Tarihi
                          {sortColumn === 'publishedAt' && (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          )}
                          {sortColumn !== 'publishedAt' && <ArrowUpDown className="h-4 w-4" />}
                      </div>
                    </TableHead>
                    <TableHead>
                        <div className="flex items-center gap-1 cursor-pointer" 
                          onClick={() => handleSort('viewCount')}>
                        Görüntülenme
                          {sortColumn === 'viewCount' && (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                        ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                        )}
                          {sortColumn !== 'viewCount' && <ArrowUpDown className="h-4 w-4" />}
                      </div>
                    </TableHead>
                      <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPosts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-32">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <BookOpen className="h-10 w-10 mb-2" />
                            <p>Hiç blog yazısı bulunamadı</p>
                            <p className="text-sm mt-1">
                              Yeni bir blog yazısı oluşturmak için 'Yeni Yazı' butonuna tıklayın.
                            </p>
                          </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                      filteredPosts.map((post, index) => (
                      <TableRow key={post.id}>
                        <TableCell>
                            <Checkbox
                              checked={selectedPosts.includes(post.id)}
                              onCheckedChange={() => toggleSelectPost(post.id)}
                              aria-label={`${post.title} yazısını seç`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {post.featuredImage ? (
                                <div className="h-8 w-8 rounded overflow-hidden bg-muted">
                                  <img
                                  src={post.featuredImage}
                                  alt={post.title}
                                    className="h-full w-full object-cover"
                                />
                                </div>
                              ) : (
                                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                              )}
                              <div>
                                <p className="font-medium truncate max-w-[260px]">
                                  {post.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {post.slug}
                                </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                            {post.categoryName ? (
                              <Badge variant="outline">{post.categoryName}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                        </TableCell>
                        <TableCell>
                            {post.publishedAt ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(new Date(post.publishedAt), 'dd MMMM yyyy', { locale: tr })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{post.viewCount}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusBadgeVariant(post.status)}>
                              {post.status === 'PUBLISHED' ? 'Yayında' : 
                               post.status === 'DRAFT' ? 'Taslak' : 'Arşivlenmiş'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/blog/${post.slug}`} target="_blank">
                                  <Eye size={16} />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/blog/edit/${post.id}`}>
                                  <Edit size={16} />
                                </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                                onClick={() => {
                                  const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
                                  toggleSelectedPostsStatus(post.id, newStatus);
                                }}
                              >
                                <Switch
                                  checked={post.status === 'PUBLISHED'}
                                  className="scale-75"
                                />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePost(post)}
                            >
                                <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground py-12">
                  <BookOpen className="h-10 w-10 mb-2" />
                  <p>Hiç blog yazısı bulunamadı</p>
                  <p className="text-sm mt-1">
                    Yeni bir blog yazısı oluşturmak için 'Yeni Yazı' butonuna tıklayın.
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <div className="relative h-40 bg-muted">
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedPosts.includes(post.id)}
                          onCheckedChange={() => toggleSelectPost(post.id)}
                          aria-label={`${post.title} yazısını seç`}
                        />
                      </div>
                      {post.featuredImage ? (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge
                        variant={getStatusBadgeVariant(post.status)}
                        className="absolute top-2 right-2"
                      >
                        {post.status === 'PUBLISHED' ? 'Yayında' : 
                         post.status === 'DRAFT' ? 'Taslak' : 'Arşivlenmiş'}
                      </Badge>
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                      <CardDescription className="flex gap-2 items-center text-xs">
                        <Calendar className="h-3 w-3" />
                          {post.publishedAt 
                          ? format(new Date(post.publishedAt), 'dd MMMM yyyy', { locale: tr })
                          : 'Yayınlanmamış'
                        }
                        <span className="flex gap-1 items-center">
                          <Eye className="h-3 w-3" />
                          {post.viewCount}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-2 mb-3">
                      {post.categoryName && (
                          <Badge variant="outline" className="font-normal">
                            <Bookmark className="h-3 w-3 mr-1" />
                            {post.categoryName}
                          </Badge>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <Badge variant="outline" className="font-normal">
                            <Tag className="h-3 w-3 mr-1" />
                            {post.tags.length} etiket
                          </Badge>
                          )}
                        </div>
                      
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {post.excerpt}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" /> Görüntüle
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/blog/edit/${post.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Düzenle
                          </Link>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                      <Button
                          variant="outline" 
                        size="sm"
                          onClick={() => {
                            const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
                            toggleSelectedPostsStatus(post.id, newStatus);
                          }}
                          className="flex items-center"
                        >
                          <Switch
                            checked={post.status === 'PUBLISHED'}
                            className="mr-2 scale-75"
                          />
                          {post.status === 'PUBLISHED' ? "Yayında" : "Taslak"}
                      </Button>
                        <Button
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeletePost(post)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Sil
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
      
      {/* Silme onay dialog'u */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blog Yazısını Sil</DialogTitle>
            <DialogDescription>
              "{postToDelete?.title}" başlıklı blog yazısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

BlogPage.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default BlogPage 