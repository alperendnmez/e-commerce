import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth/next'
import { options as authOptions } from '@/pages/api/auth/[...nextauth]'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AlertCircle, CalendarIcon, Search, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import tr from 'date-fns/locale/tr'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Sistem günlüğü türü
type SystemLog = {
  id: number
  type: 'ERROR' | 'WARNING' | 'INFO'
  action: string
  description: string
  ipAddress: string | null
  userId: number | null
  createdAt: string
  userName?: string
  userEmail?: string
}

// Sayfalama bilgisi türü
type Pagination = {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

// Bileşen props türü
type SystemLogsPageProps = {
  initialLogs: SystemLog[]
  initialPagination: Pagination
}

export default function SystemLogsPage({ initialLogs, initialPagination }: SystemLogsPageProps) {
  const router = useRouter()
  
  // Durum değişkenleri
  const [logs, setLogs] = useState<SystemLog[]>(initialLogs)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtre durumları
  const [filters, setFilters] = useState({
    type: '',
    action: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    userId: '',
  })
  
  // Yeni sayfa yükleme işlevi
  const loadPage = async (page: number) => {
    setLoading(true)
    setError(null)
    
    try {
      // Filtre ve sayfalama parametrelerini oluştur
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      
      // Filtreleri ekle
      if (filters.type) params.append('type', filters.type)
      if (filters.action) params.append('action', filters.action)
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString().split('T')[0])
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString().split('T')[0])
      if (filters.userId) params.append('userId', filters.userId)
      
      // API isteği yap
      const response = await fetch(`/api/dashboard/system-logs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Sistem günlükleri yüklenirken bir hata oluştu')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data.logs)
        setPagination(data.data.pagination)
      } else {
        throw new Error(data.error || 'Bilinmeyen bir hata oluştu')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
      console.error('Sistem günlükleri yüklenirken hata:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Filtreleri uygulama işlevi
  const applyFilters = () => {
    loadPage(1) // Filtrelenmiş sonuçların ilk sayfasını yükle
  }
  
  // Filtreleri sıfırlama işlevi
  const resetFilters = () => {
    setFilters({
      type: '',
      action: '',
      startDate: null,
      endDate: null,
      userId: '',
    })
    
    // Sayfayı yeniden yükle (URL parametrelerini temizle)
    router.push('/dashboard/admin/system-logs', undefined, { shallow: true })
      .then(() => loadPage(1))
  }
  
  // Sayfa değişikliğinde yükleme işlemi
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPage(newPage)
    }
  }
  
  // Günlük tipi için uygun renk sınıfı
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ERROR': return 'bg-destructive text-destructive-foreground'
      case 'WARNING': return 'bg-yellow-500 text-black'
      case 'INFO': return 'bg-blue-500 text-white'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }
  
  // Tarih formatla
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm:ss', { locale: tr })
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Sistem Günlükleri</h1>
        
        {/* Filtre kartı */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
            <CardDescription>Günlük kayıtlarını filtrelemek için aşağıdaki seçenekleri kullanın</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Tür filtresi */}
              <div>
                <Select 
                  value={filters.type} 
                  onValueChange={(value) => setFilters({...filters, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tür seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tümü</SelectItem>
                    <SelectItem value="ERROR">Hata</SelectItem>
                    <SelectItem value="WARNING">Uyarı</SelectItem>
                    <SelectItem value="INFO">Bilgi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* İşlem adı filtresi */}
              <div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="İşlem adı ara"
                    value={filters.action}
                    onChange={(e) => setFilters({...filters, action: e.target.value})}
                    className="pl-8"
                  />
                </div>
              </div>
              
              {/* Başlangıç tarihi */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? (
                        format(filters.startDate, 'dd MMM yyyy', { locale: tr })
                      ) : (
                        <span>Başlangıç tarihi</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate || undefined}
                      onSelect={(date) => setFilters({...filters, startDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Bitiş tarihi */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? (
                        format(filters.endDate, 'dd MMM yyyy', { locale: tr })
                      ) : (
                        <span>Bitiş tarihi</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate || undefined}
                      onSelect={(date) => setFilters({...filters, endDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Kullanıcı ID filtresi */}
              <div>
                <Input
                  placeholder="Kullanıcı ID"
                  value={filters.userId}
                  onChange={(e) => setFilters({...filters, userId: e.target.value})}
                  type="number"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={resetFilters}>
              Filtreleri Temizle
            </Button>
            <Button onClick={applyFilters} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                'Filtreleri Uygula'
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Hata mesajı */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Günlük tablosu */}
        <Card>
          <CardHeader>
            <CardTitle>Sistem Günlükleri</CardTitle>
            <CardDescription>
              Toplam {pagination.total} kayıt, sayfa {pagination.page}/{pagination.totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead className="w-[120px]">Tür</TableHead>
                    <TableHead className="w-[150px]">İşlem</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="w-[180px]">Tarih</TableHead>
                    <TableHead className="w-[150px]">IP Adresi</TableHead>
                    <TableHead className="w-[180px]">Kullanıcı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Kayıt bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.id}</TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(log.type)}>
                            {log.type === 'ERROR' ? 'Hata' : 
                             log.type === 'WARNING' ? 'Uyarı' : 'Bilgi'}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={log.description}>
                          {log.description}
                        </TableCell>
                        <TableCell>{formatDate(log.createdAt)}</TableCell>
                        <TableCell>{log.ipAddress || '-'}</TableCell>
                        <TableCell>
                          {log.userName ? (
                            <div className="truncate" title={log.userEmail}>
                              {log.userName}
                              <div className="text-xs text-muted-foreground">
                                {log.userEmail}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          {/* Sayfalama */}
          {pagination.totalPages > 1 && (
            <CardFooter>
              <div className="w-full">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pagination.page - 1)
                        }} 
                        aria-disabled={pagination.page === 1}
                        className={pagination.page === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {/* İlk sayfa */}
                    {pagination.page > 2 && (
                      <PaginationItem>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(1)
                          }}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Üç noktalar (başlangıç) */}
                    {pagination.page > 3 && (
                      <PaginationItem>
                        <PaginationLink disabled>...</PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Önceki sayfa */}
                    {pagination.page > 1 && (
                      <PaginationItem>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(pagination.page - 1)
                          }}
                        >
                          {pagination.page - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Mevcut sayfa */}
                    <PaginationItem>
                      <PaginationLink href="#" isActive>
                        {pagination.page}
                      </PaginationLink>
                    </PaginationItem>
                    
                    {/* Sonraki sayfa */}
                    {pagination.page < pagination.totalPages && (
                      <PaginationItem>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(pagination.page + 1)
                          }}
                        >
                          {pagination.page + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Üç noktalar (bitiş) */}
                    {pagination.page < pagination.totalPages - 2 && (
                      <PaginationItem>
                        <PaginationLink disabled>...</PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Son sayfa */}
                    {pagination.page < pagination.totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(pagination.totalPages)
                          }}
                        >
                          {pagination.totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pagination.page + 1)
                        }} 
                        aria-disabled={!pagination.hasMore}
                        className={!pagination.hasMore ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Oturum kontrolü
  const session = await getServerSession(context.req, context.res, authOptions)
  
  // Yetkilendirme kontrolü - sadece admin kullanıcılar erişebilir
  if (!session || (session.user as any).role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/dashboard/admin',
        permanent: false,
      },
    }
  }
  
  try {
    // Başlangıç verilerini al
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/system-logs`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error('Sistem günlükleri yüklenirken bir hata oluştu')
    }
    
    return {
      props: {
        initialLogs: data.data.logs,
        initialPagination: data.data.pagination,
      },
    }
  } catch (error) {
    console.error('getServerSideProps error:', error)
    
    // Hata durumunda boş verilerle başlat
    return {
      props: {
        initialLogs: [],
        initialPagination: {
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
          hasMore: false,
        },
      },
    }
  }
} 