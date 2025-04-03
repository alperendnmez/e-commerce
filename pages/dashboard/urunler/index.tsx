import React, { ReactElement, useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import axios from '@/lib/axios'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { 
  Edit, 
  Plus, 
  Trash2, 
  Eye, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Upload,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  ToggleLeft,
  LayoutGrid,
  LayoutList
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type Product = {
  id: number
  name: string
  slug: string
  published: boolean
  createdAt: string
  price?: number
  stock?: number
  categoryId?: number
  brandId?: number
  imageUrls?: string[]
}

type SortField = 'id' | 'name' | 'createdAt' | 'published';
type SortOrder = 'asc' | 'desc';

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  const [publishedFilter, setPublishedFilter] = useState<string>('all')
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showImportModal, setShowImportModal] = useState<boolean>(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)

  const fetchProducts = async (page = 1) => {
    setLoading(true)
    try {
      // Filtreleme, arama, sıralama ve sayfalama parametrelerini ekleyin
      const response = await axios.get('/api/products', {
        params: { 
          page, 
          limit: itemsPerPage,
          search: searchTerm,
          published: publishedFilter !== 'all' ? publishedFilter : undefined,
          sortField,
          sortOrder
        }
      })
      
      if (response.data.products) {
        setProducts(response.data.products)
        setTotalProducts(response.data.total || response.data.products.length)
      } else {
        setProducts(response.data)
        setTotalProducts(response.data.length)
      }
    } catch (err: any) {
      console.error('Ürünler yüklenirken hata:', err)
      toast({
        title: 'Hata!',
        description: 'Ürünler yüklenirken bir hata oluştu.',
        variant: 'destructive'
      })
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Arama ve filtre değiştiğinde ürünleri getir
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1)
      setCurrentPage(1)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm, publishedFilter, itemsPerPage, sortField, sortOrder])

  // Sayfa yüklendiğinde ürünleri getir
  useEffect(() => {
    fetchProducts()
  }, [])

  // Ürün seçme işlemleri
  const toggleSelectProduct = (id: number) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(productId => productId !== id))
    } else {
      setSelectedProducts([...selectedProducts, id])
    }
  }

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      const allProductIds = products.map(product => product.id)
      setSelectedProducts(allProductIds)
    } else {
      setSelectedProducts([])
    }
  }

  // Toplu silme işlemi
  const deleteSelectedProducts = async () => {
    if (selectedProducts.length === 0) return
    
    if (!confirm(`${selectedProducts.length} ürünü silmek istediğinize emin misiniz?`)) {
      return
    }
    
    try {
      await axios.post('/api/products/bulk-delete', { ids: selectedProducts })
      
      toast({
        title: 'Başarılı!',
        description: `${selectedProducts.length} ürün başarıyla silindi.`
      })
      
      setSelectedProducts([])
      fetchProducts(currentPage)
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Ürünler silinirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  // Toplu durum değiştirme
  const toggleSelectedProductsStatus = async () => {
    if (selectedProducts.length === 0) return
    
    try {
      await axios.post('/api/products/bulk-toggle-status', { ids: selectedProducts })
      
      toast({
        title: 'Başarılı!',
        description: `${selectedProducts.length} ürünün durumu değiştirildi.`
      })
      
      fetchProducts(currentPage)
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Ürün durumları güncellenirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  // Tekil ürün silme
  const handleDelete = async (id: number) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      return
    }
    
    try {
      await axios.delete(`/api/products/${id}`)
      
      toast({
        title: 'Başarılı!',
        description: 'Ürün başarıyla silindi.'
      })
      
      fetchProducts(currentPage)
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Ürün silinirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  // Tekil ürün durum değiştirme
  const toggleProductStatus = async (id: number, currentStatus: boolean) => {
    try {
      await axios.put(`/api/products/by-id/${id}`, { published: !currentStatus })
      
      toast({
        title: 'Başarılı!',
        description: 'Ürün durumu güncellendi.'
      })
      
      fetchProducts(currentPage)
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Ürün durumu güncellenirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  // Sayfa değiştiğinde ürünleri tekrar getir
  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  // Sıralama işlemi
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Aynı alan için sıralama yönünü değiştir
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Farklı alan için varsayılan sıralama yönü
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sıralama ikonunu göster
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  // Ürünleri CSV olarak dışa aktar
  const exportProductsToCSV = () => {
    // CSV başlıkları
    const headers = ['ID', 'Ürün Adı', 'Slug', 'Durum', 'Oluşturulma Tarihi'];
    
    // Ürün verilerini CSV formatına dönüştür
    const csvData = products.map(product => [
      product.id,
      product.name,
      product.slug,
      product.published ? 'Yayında' : 'Taslak',
      new Date(product.createdAt).toLocaleDateString('tr-TR')
    ]);
    
    // Başlıkları ve verileri birleştir
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // CSV dosyasını indir
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `urunler-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Başarılı!',
      description: `${products.length} ürün CSV olarak dışa aktarıldı.`
    });
  };

  // Tabloda gösterilen sayfa numaraları
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  // CSV'den ürün içe aktarma
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  const importProductsFromCSV = async () => {
    if (!importFile) {
      toast({
        title: 'Hata!',
        description: 'Lütfen bir CSV dosyası seçin.',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await axios.post('/api/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setImportResults(response.data);
      
      toast({
        title: 'Başarılı!',
        description: `${response.data.success} ürün başarıyla içe aktarıldı.`,
      });

      // İçe aktarma sonrası ürünleri yenile
      fetchProducts(currentPage);
    } catch (error: any) {
      console.error('Ürünler içe aktarılırken hata:', error);
      toast({
        title: 'Hata!',
        description: 'Ürünler içe aktarılırken bir hata oluştu.',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ürünler</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <Button onClick={() => window.location.href = "/dashboard/urunler/yeni-urun-ekle"}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Ürün Listesi</CardTitle>
          <CardDescription>
            Sistemde kayıtlı tüm ürünleri görüntüleyin, düzenleyin veya silin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex flex-col md:flex-row gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün ara..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
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
                    <DropdownMenuLabel>Sıralama Seçenekleri</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSortField('id'); setSortOrder('asc'); }}>
                      ID (Artan)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('id'); setSortOrder('desc'); }}>
                      ID (Azalan)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('name'); setSortOrder('asc'); }}>
                      İsim (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('name'); setSortOrder('desc'); }}>
                      İsim (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('createdAt'); setSortOrder('desc'); }}>
                      En Yeni
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('createdAt'); setSortOrder('asc'); }}>
                      En Eski
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      Veri Aktarımı
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Aktarım Seçenekleri</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportProductsToCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      CSV olarak dışa aktar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      CSV'den içe aktar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="outline" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
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
              <Card className="p-4 border border-dashed">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sort-field">Sıralama Alanı</Label>
                    <Select
                      value={sortField}
                      onValueChange={(value) => setSortField(value as SortField)}
                    >
                      <SelectTrigger id="sort-field">
                        <SelectValue placeholder="Sıralama Alanı" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">ID</SelectItem>
                        <SelectItem value="name">Ürün Adı</SelectItem>
                        <SelectItem value="createdAt">Oluşturulma Tarihi</SelectItem>
                        <SelectItem value="published">Durum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sort-order">Sıralama Yönü</Label>
                    <Select
                      value={sortOrder}
                      onValueChange={(value) => setSortOrder(value as SortOrder)}
                    >
                      <SelectTrigger id="sort-order">
                        <SelectValue placeholder="Sıralama Yönü" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Artan</SelectItem>
                        <SelectItem value="desc">Azalan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="items-per-page">Sayfa Başına</Label>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => setItemsPerPage(Number(value))}
                    >
                      <SelectTrigger id="items-per-page">
                        <SelectValue placeholder="Sayfa başına" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Ürün</SelectItem>
                        <SelectItem value="10">10 Ürün</SelectItem>
                        <SelectItem value="20">20 Ürün</SelectItem>
                        <SelectItem value="50">50 Ürün</SelectItem>
                        <SelectItem value="100">100 Ürün</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="published-filter">Durum Filtresi</Label>
                    <Select
                      value={publishedFilter}
                      onValueChange={setPublishedFilter}
                      id="published-filter"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Durum Filtresi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Ürünler</SelectItem>
                        <SelectItem value="true">Yayında</SelectItem>
                        <SelectItem value="false">Taslak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}
            
            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                <div className="text-sm">
                  <span className="font-medium">{selectedProducts.length}</span> ürün seçildi
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleSelectedProductsStatus}
                  >
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    Durumu Değiştir
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={deleteSelectedProducts}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Seçilenleri Sil
                  </Button>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Ürün bulunamadı.</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedProducts.length === products.length && products.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('id')}>
                        <div className="flex items-center">
                          ID
                          {getSortIcon('id')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[300px] cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center">
                          Ürün Adı
                          {getSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center">
                          Oluşturulma
                          {getSortIcon('createdAt')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('published')}>
                        <div className="flex items-center">
                          Durum
                          {getSortIcon('published')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => toggleSelectProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                            {product.slug}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(product.createdAt).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.published ? "default" : "secondary"}>
                            {product.published ? 'Yayında' : 'Taslak'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/urunler/detay/${product.slug}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/urunler/${product.slug}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Switch 
                              checked={product.published}
                              onCheckedChange={() => toggleProductStatus(product.id, product.published)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Toplam {totalProducts} ürün
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            {pageNumbers.map(pageNumber => (
                              <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNumber)}
                              >
                                {pageNumber}
                              </Button>
                            ))}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="relative aspect-video bg-muted">
                      {product.imageUrls && product.imageUrls.length > 0 ? (
                        <img 
                          src={product.imageUrls[0]} 
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Resim Yok
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={product.published ? "default" : "secondary"}>
                          {product.published ? 'Yayında' : 'Taslak'}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium truncate">{product.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {product.slug}
                          </p>
                        </div>
                        <Checkbox 
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                          ID: {product.id}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/urunler/detay/${product.slug}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/urunler/${product.slug}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Switch 
                            checked={product.published}
                            onCheckedChange={() => toggleProductStatus(product.id, product.published)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Mobil için sayfalama */}
            <div className="md:hidden flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Önceki
              </Button>
              <div className="text-sm">
                Sayfa {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Sonraki
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* İçe Aktarma Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ürünleri CSV'den İçe Aktar</DialogTitle>
            <DialogDescription>
              Toplu ürün içe aktarmak için CSV dosyası yükleyin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="import-file">CSV Dosyası</Label>
              <Input 
                id="import-file" 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                CSV dosyası şu sütunları içermeli: name, slug, description, seoTitle, seoDescription, categorySlug, brandSlug, price, stock, published, imageUrls
              </p>
            </div>
            
            {importResults && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>İçe Aktarma Sonuçları</AlertTitle>
                <AlertDescription>
                  <p>Toplam: {importResults.total}</p>
                  <p>Başarılı: {importResults.success}</p>
                  <p>Başarısız: {importResults.failed}</p>
                  {importResults.errors && importResults.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="font-medium cursor-pointer">Hata Detayları</summary>
                      <ul className="mt-2 list-disc pl-5 text-sm">
                        {importResults.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowImportModal(false)}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              onClick={importProductsFromCSV}
              disabled={isImporting || !importFile}
            >
              {isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

ProductsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default ProductsPage
