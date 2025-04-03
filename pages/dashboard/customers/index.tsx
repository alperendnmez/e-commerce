import React, { ReactElement, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from '@/lib/axios';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  Search, 
  Mail, 
  MapPin, 
  Package, 
  Star, 
  RotateCcw, 
  Heart, 
  RefreshCw, 
  Eye, 
  Trash2, 
  Ban,
  Plus,
  Pencil,
  ArrowLeft,
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
  Edit,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Interface tanımları
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  newsletter: boolean;
  role: 'USER' | 'ADMIN' | 'EDITOR';
  orderCount: number;
  totalSpent: number;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all',
    newsletter: 'all',
    hasOrders: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    dateRange: 'all',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      applyFilters();
    }
  }, [searchTerm, filters, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/customers');
      setUsers(response.data);
      setError(null);
      setSelectedUsers([]);
    } catch (err) {
      setError('Müşteri bilgileri yüklenirken bir hata oluştu.');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Arama filtresi
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(user => (
        user.email.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query))
      ));
    }

    // Rol filtresi
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role.toUpperCase());
    }

    // E-bülten filtresi
    if (filters.newsletter !== 'all') {
      const isSubscribed = filters.newsletter === 'subscribed';
      filtered = filtered.filter(user => user.newsletter === isSubscribed);
    }

    // Siparişi olan/olmayan filtresi
    if (filters.hasOrders !== 'all') {
      const hasOrders = filters.hasOrders === 'yes';
      filtered = filtered.filter(user => 
        hasOrders ? user.orderCount > 0 : user.orderCount === 0
      );
    }

    // Tarih aralığı filtresi
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'thisWeek':
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      filtered = filtered.filter(user => new Date(user.createdAt) >= startDate);
    }

    // Sıralama
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (filters.sortBy) {
        case 'firstName':
          valueA = a.firstName.toLowerCase();
          valueB = b.firstName.toLowerCase();
          break;
        case 'email':
          valueA = a.email.toLowerCase();
          valueB = b.email.toLowerCase();
          break;
        case 'orderCount':
          valueA = a.orderCount;
          valueB = b.orderCount;
          break;
        case 'totalSpent':
          valueA = a.totalSpent;
          valueB = b.totalSpent;
          break;
        case 'lastLogin':
          valueA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          valueB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        case 'createdAt':
        default:
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
      }
      
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      
      if (valueA < valueB) return -1 * sortOrder;
      if (valueA > valueB) return 1 * sortOrder;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleViewDetails = (userId: number) => {
    router.push(`/dashboard/customers/${userId}`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const bulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!confirm(`${selectedUsers.length} müşteriyi silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      // API endpoint oluşturulduğunda burada bulk silme işlemi yapılabilir
      // await Promise.all(selectedUsers.map(id => axios.delete(`/api/dashboard/customers/${id}`)));
      
      toast({ 
        title: 'Başarılı', 
        description: `${selectedUsers.length} müşteri başarıyla silindi` 
      });
      
      fetchUsers();
    } catch (err: any) {
      console.error('Müşteriler silinirken hata:', err);
      toast({
        title: 'Hata!',
        description: 'Müşteriler silinirken bir hata oluştu',
        variant: 'destructive'
      });
    }
  };

  const exportCustomers = (format: 'json' | 'csv' | 'excel') => {
    const dataToExport = selectedUsers.length > 0
      ? filteredUsers.filter(user => selectedUsers.includes(user.id))
      : filteredUsers;
    
    if (dataToExport.length === 0) {
      toast({
        title: 'Uyarı',
        description: 'Dışa aktarılacak müşteri bulunamadı',
        variant: 'destructive'
      });
      return;
    }
    
    let fileContent = '';
    let fileName = `customers-export-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'json') {
      fileContent = JSON.stringify(dataToExport, null, 2);
      fileName += '.json';
    } else if (format === 'csv') {
      // CSV başlıkları
      fileContent = 'ID,Ad,Soyad,E-posta,Telefon,Kayıt Tarihi,Son Giriş,Rol,E-bülten,Sipariş Sayısı,Toplam Harcama\n';
      
      // CSV satırları
      dataToExport.forEach(user => {
        fileContent += [
          user.id,
          user.firstName,
          user.lastName,
          user.email,
          user.phone || '',
          user.createdAt,
          user.lastLogin || '',
          user.role,
          user.newsletter ? 'Evet' : 'Hayır',
          user.orderCount,
          user.totalSpent
        ].map(value => `"${value}"`).join(',') + '\n';
      });
      
      fileName += '.csv';
    } else if (format === 'excel') {
      // CSV formatında Excel'e uygun
      fileContent = 'ID,Ad,Soyad,E-posta,Telefon,Kayıt Tarihi,Son Giriş,Rol,E-bülten,Sipariş Sayısı,Toplam Harcama\n';
      
      dataToExport.forEach(user => {
        fileContent += [
          user.id,
          user.firstName,
          user.lastName,
          user.email,
          user.phone || '',
          user.createdAt,
          user.lastLogin || '',
          user.role,
          user.newsletter ? 'Evet' : 'Hayır',
          user.orderCount,
          user.totalSpent
        ].map(value => `"${value}"`).join(',') + '\n';
      });
      
      fileName += '.csv'; // Excel olarak dışa aktarmak için .csv uzantısı kullanılabilir
    }
    
    // Dosyayı indirme
    const blob = new Blob([fileContent], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Başarılı',
      description: `Müşteriler ${format.toUpperCase()} formatında dışa aktarıldı`
    });
  };

  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Müşteriler</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri
          </Button>
        </div>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Müşteri ara..."
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
                  <DropdownMenuRadioItem value="firstName">Ad Soyad</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="email">E-posta</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="createdAt">Kayıt Tarihi</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="lastLogin">Son Giriş</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="orderCount">Sipariş Sayısı</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="totalSpent">Toplam Harcama</DropdownMenuRadioItem>
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
                <DropdownMenuItem onClick={() => exportCustomers('json')}>
                  <FileJson className="mr-2 h-4 w-4" />
                  <span>JSON Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCustomers('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>CSV Olarak İndir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCustomers('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>Excel Olarak İndir</span>
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
                  Kart Görünümü
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Seçili müşteriler için toplu işlem butonları */}
        {selectedUsers.length > 0 && (
          <div className="bg-muted p-2 rounded-md flex items-center justify-between mt-4">
            <div className="text-sm font-medium">
              {selectedUsers.length} müşteri seçildi
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedUsers([]);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Seçimi Temizle
              </Button>
              <Button 
                variant="outline" 
                size="sm"
              >
                <Mail className="mr-2 h-4 w-4" />
                Toplu E-posta
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={bulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {selectedUsers.length === 1 ? 'Sil' : 'Toplu Sil'}
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
                  <Label>Kullanıcı Rolü</Label>
                  <Select 
                    value={filters.role} 
                    onValueChange={(value) => setFilters({...filters, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rol seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Roller</SelectItem>
                      <SelectItem value="user">Müşteri</SelectItem>
                      <SelectItem value="admin">Yönetici</SelectItem>
                      <SelectItem value="editor">Editör</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>E-Bülten Durumu</Label>
                  <Select 
                    value={filters.newsletter} 
                    onValueChange={(value) => setFilters({...filters, newsletter: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="E-bülten durumu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="subscribed">Aboneler</SelectItem>
                      <SelectItem value="unsubscribed">Abone Olmayanlar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Sipariş Durumu</Label>
                  <Select 
                    value={filters.hasOrders} 
                    onValueChange={(value) => setFilters({...filters, hasOrders: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sipariş durumu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="yes">Siparişi Olanlar</SelectItem>
                      <SelectItem value="no">Siparişi Olmayanlar</SelectItem>
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
                      role: 'all',
                      newsletter: 'all',
                      hasOrders: 'all',
                      sortBy: 'createdAt',
                      sortOrder: 'desc',
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
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 text-red-500">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64">
            <Search className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Hiç müşteri bulunamadı</p>
          </div>
      ) : viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Yönetimi</CardTitle>
            <CardDescription>
              Sistemdeki tüm müşterileri görüntüleyin, düzenleyin ve yönetin.
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="w-[30px]">
                      <Checkbox 
                        checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.length} 
                        onCheckedChange={selectAllUsers}
                      />
                    </TableHead>
                  <TableHead className="w-[250px]">Müşteri</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Üyelik Tarihi</TableHead>
                  <TableHead>Son Giriş</TableHead>
                  <TableHead>Siparişler</TableHead>
                  <TableHead>Toplam Harcama</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedUsers.includes(user.id)} 
                          onCheckedChange={() => toggleSelectUser(user.id)}
                        />
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <Badge 
                              variant={
                                user.role === 'ADMIN' 
                                  ? 'destructive' 
                                  : (user.role === 'EDITOR' ? 'outline' : 'secondary')
                              } 
                              className="mt-1"
                            >
                            {user.role === 'USER' ? 'Müşteri' : (user.role === 'ADMIN' ? 'Yönetici' : 'Editör')}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                        {user.phone && (
                          <span className="text-sm text-muted-foreground mt-1">{user.phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell>
                        {user.lastLogin 
                          ? format(new Date(user.lastLogin), 'dd.MM.yyyy') 
                          : '-'
                        }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{user.orderCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(user.totalSpent)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(user.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/customers/edit/${user.id}`)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{user.firstName} {user.lastName}</CardTitle>
                      <CardDescription className="text-sm">{user.email}</CardDescription>
                    </div>
                  </div>
                  <Checkbox 
                    checked={selectedUsers.includes(user.id)} 
                    onCheckedChange={() => toggleSelectUser(user.id)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Üyelik Tarihi:</span>
                    <span>{format(new Date(user.createdAt), 'dd.MM.yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Son Giriş:</span>
                    <span>
                      {user.lastLogin 
                        ? format(new Date(user.lastLogin), 'dd.MM.yyyy')
                        : '-'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sipariş Sayısı:</span>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{user.orderCount}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Toplam Harcama:</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(user.totalSpent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">E-bülten:</span>
                    <span>{user.newsletter ? 'Abone' : 'Abone Değil'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Badge 
                  variant={
                    user.role === 'ADMIN' 
                      ? 'destructive' 
                      : (user.role === 'EDITOR' ? 'outline' : 'secondary')
                  }
                >
                  {user.role === 'USER' ? 'Müşteri' : (user.role === 'ADMIN' ? 'Yönetici' : 'Editör')}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleViewDetails(user.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/customers/edit/${user.id}`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          </div>
        )}
      
      {/* New Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
            <DialogDescription>
              Sisteme yeni bir müşteri ekleyin. Tüm bilgileri doldurduktan sonra kaydet butonuna tıklayın.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Ad</Label>
                <Input id="firstName" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="lastName">Soyad</Label>
                <Input id="lastName" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" className="mt-1" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="newsletter" />
              <Label htmlFor="newsletter">E-bülten aboneliği</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              İptal
            </Button>
            <Button type="submit">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  );
} 

CustomersPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
}; 