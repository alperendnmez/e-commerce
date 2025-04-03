import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import axios from '@/lib/axios';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Search, MapPin, Home, Building, Briefcase, RefreshCw, Eye, Trash2, Mail } from 'lucide-react';

// Adres tipi
interface Address {
  id: number;
  userId: number;
  title: string;
  firstName: string;
  lastName: string;
  street: string;
  district?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function CustomersAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [filteredAddresses, setFilteredAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (addresses.length > 0) {
      applyFilters();
    }
  }, [searchQuery, selectedUser, addresses]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/customers/addresses');
      setAddresses(response.data);
      setError(null);
    } catch (err) {
      setError('Adres bilgileri yüklenirken bir hata oluştu.');
      console.error('Error fetching addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...addresses];

    // Kullanıcı filtresi
    if (selectedUser !== null) {
      filtered = filtered.filter(address => address.userId === selectedUser);
    }

    // Arama filtresi
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(address => (
        address.title.toLowerCase().includes(query) ||
        address.firstName.toLowerCase().includes(query) ||
        address.lastName.toLowerCase().includes(query) ||
        address.street.toLowerCase().includes(query) ||
        address.city.toLowerCase().includes(query) ||
        address.user.email.toLowerCase().includes(query) ||
        (address.district && address.district.toLowerCase().includes(query))
      ));
    }

    setFilteredAddresses(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleViewDetails = (address: Address) => {
    setSelectedAddress(address);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
      try {
        await axios.delete(`/api/dashboard/customers/addresses/${id}`);
        toast({
          title: "Adres silindi",
          description: "Adres başarıyla silindi.",
        });
        fetchAddresses();
      } catch (error) {
        console.error('Error deleting address:', error);
        toast({
          title: "Hata",
          description: "Adres silinirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    }
  };

  const getAddressTypeIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('ev') || lowerTitle.includes('home')) {
      return <Home className="h-4 w-4" />;
    } else if (lowerTitle.includes('iş') || lowerTitle.includes('work') || lowerTitle.includes('office')) {
      return <Briefcase className="h-4 w-4" />;
    } else {
      return <Building className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Müşteri Adresleri | Yönetim Paneli</title>
      </Head>
      
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Müşteri Adresleri</h1>
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <form onSubmit={handleSearch}>
              <Input
                placeholder="İsim, adres veya e-posta ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </form>
          </div>
          <Button variant="outline" onClick={fetchAddresses}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 text-red-500">
            {error}
          </div>
        ) : filteredAddresses.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64">
            <MapPin className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Hiç adres bulunamadı</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Müşteri</TableHead>
                  <TableHead>Adres Başlığı</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAddresses.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{address.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAddressTypeIcon(address.title)}
                        <span>{address.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{address.firstName} {address.lastName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {address.street}
                        {address.district && <span>, {address.district}</span>}
                        <div className="text-muted-foreground mt-1">
                          {address.city} / {address.state} {address.zipCode}
                        </div>
                        <div className="text-muted-foreground">{address.country}</div>
                      </div>
                    </TableCell>
                    <TableCell>{address.phone}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {address.isDefault && (
                          <Badge variant="outline" className="text-xs">Varsayılan Teslimat</Badge>
                        )}
                        {address.isDefaultBilling && (
                          <Badge variant="outline" className="text-xs">Varsayılan Fatura</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(address)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(address.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* Adres Detay Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adres Detayları</DialogTitle>
            <DialogDescription>
              Müşterinin adres bilgilerini görüntüleyin.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAddress && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Müşteri</p>
                  <p className="text-sm">{selectedAddress.user.firstName} {selectedAddress.user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedAddress.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Adres Başlığı</p>
                  <div className="flex items-center gap-2">
                    {getAddressTypeIcon(selectedAddress.title)}
                    <p className="text-sm">{selectedAddress.title}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Ad Soyad</p>
                <p className="text-sm">{selectedAddress.firstName} {selectedAddress.lastName}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Sokak</p>
                <p className="text-sm">{selectedAddress.street}</p>
              </div>
              
              {selectedAddress.district && (
                <div>
                  <p className="text-sm font-medium mb-1">Mahalle/Semt</p>
                  <p className="text-sm">{selectedAddress.district}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Şehir</p>
                  <p className="text-sm">{selectedAddress.city}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">İlçe/Eyalet</p>
                  <p className="text-sm">{selectedAddress.state}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Posta Kodu</p>
                  <p className="text-sm">{selectedAddress.zipCode}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Ülke</p>
                <p className="text-sm">{selectedAddress.country}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Telefon</p>
                <p className="text-sm">{selectedAddress.phone}</p>
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedAddress.isDefault} disabled />
                  <p className="text-sm">Varsayılan Teslimat Adresi</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedAddress.isDefaultBilling} disabled />
                  <p className="text-sm">Varsayılan Fatura Adresi</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 