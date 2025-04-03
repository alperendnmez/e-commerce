import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { MapPin, Plus, Edit, Trash2, Check, Home, Building, Briefcase } from 'lucide-react';

interface Address {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  isDefaultBilling: boolean;
  type: 'HOME' | 'WORK' | 'OTHER';
}

export default function AddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    title: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Türkiye',
    isDefault: false,
    isDefaultBilling: false,
    type: 'HOME'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/addresses');
      setAddresses(response.data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        description: 'Adresler yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = 'Adres başlığı gereklidir';
    if (!formData.fullName?.trim()) errors.fullName = 'Ad soyad gereklidir';
    if (!formData.phone?.trim()) errors.phone = 'Telefon numarası gereklidir';
    if (!formData.address?.trim()) errors.address = 'Adres gereklidir';
    if (!formData.city?.trim()) errors.city = 'Şehir gereklidir';
    if (!formData.state?.trim()) errors.state = 'İlçe gereklidir';
    if (!formData.zipCode?.trim()) errors.zipCode = 'Posta kodu gereklidir';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAddress = async () => {
    if (!validateForm()) return;

    try {
      const response = await axios.post('/api/user/addresses', formData);
      setAddresses(prev => [...prev, response.data]);
      setDialogOpen(false);
      resetForm();
      toast({
        description: 'Adres başarıyla eklendi.',
      });
    } catch (error) {
      console.error('Error adding address:', error);
      toast({
        description: 'Adres eklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAddress = async () => {
    if (!validateForm() || !editingAddress) return;

    try {
      const response = await axios.put(`/api/user/addresses?id=${editingAddress.id}`, formData);
      setAddresses(prev => prev.map(addr => addr.id === editingAddress.id ? response.data : addr));
      setDialogOpen(false);
      resetForm();
      toast({
        description: 'Adres başarıyla güncellendi.',
      });
    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        description: 'Adres güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`/api/user/addresses?id=${id}`);
      setAddresses(prev => prev.filter(addr => addr.id !== id));
      toast({
        description: 'Adres başarıyla silindi.',
      });
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        description: 'Adres silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      title: address.title,
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault,
      isDefaultBilling: address.isDefaultBilling,
      type: address.type
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAddress(null);
    setFormData({
      title: '',
      fullName: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Türkiye',
      isDefault: false,
      isDefaultBilling: false,
      type: 'HOME'
    });
    setFormErrors({});
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'HOME':
        return <Home className="h-4 w-4" />;
      case 'WORK':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold mb-4">Lütfen Giriş Yapın</h1>
          <p className="text-gray-500 mb-6">Bu sayfayı görüntülemek için giriş yapmanız gerekmektedir.</p>
          <Button onClick={() => router.push('/auth/signin')}>Giriş Yap</Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold">Adreslerim</h1>
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Adres Ekle
          </Button>
        </div>

        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <Card key={address.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getAddressTypeIcon(address.type)}
                      <CardTitle className="text-lg">{address.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      {address.isDefault && (
                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center">
                          <Check className="mr-1 h-3 w-3" />
                          Varsayılan
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription>{address.fullName} • {address.phone}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm">{address.address}</p>
                  <p className="text-sm">{address.zipCode} {address.city}/{address.state}</p>
                  <p className="text-sm">{address.country}</p>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditAddress(address)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Düzenle
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteAddress(address.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sil
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <MapPin className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Henüz adresiniz bulunmamaktadır</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Siparişleriniz için teslimat ve fatura adresi ekleyebilirsiniz.
            </p>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Adres Ekle
            </Button>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</DialogTitle>
              <DialogDescription>
                {editingAddress ? 'Adres bilgilerinizi güncelleyin.' : 'Yeni bir teslimat adresi ekleyin.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Adres Başlığı</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Örn: Ev, İş"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                  {formErrors.title && <p className="text-red-500 text-xs">{formErrors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Adres Tipi</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Adres tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOME">Ev</SelectItem>
                      <SelectItem value="WORK">İş</SelectItem>
                      <SelectItem value="OTHER">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad Soyad</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Ad Soyad"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                  {formErrors.fullName && <p className="text-red-500 text-xs">{formErrors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="05XX XXX XX XX"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs">{formErrors.phone}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Adres"
                  value={formData.address}
                  onChange={handleInputChange}
                />
                {formErrors.address && <p className="text-red-500 text-xs">{formErrors.address}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Şehir</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Şehir"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                  {formErrors.city && <p className="text-red-500 text-xs">{formErrors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">İlçe</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="İlçe"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                  {formErrors.state && <p className="text-red-500 text-xs">{formErrors.state}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Posta Kodu</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    placeholder="Posta Kodu"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                  />
                  {formErrors.zipCode && <p className="text-red-500 text-xs">{formErrors.zipCode}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Ülke</Label>
                  <Input
                    id="country"
                    name="country"
                    placeholder="Ülke"
                    value={formData.country}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => handleCheckboxChange('isDefault', checked as boolean)}
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">Varsayılan teslimat adresi olarak ayarla</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefaultBilling"
                    checked={formData.isDefaultBilling}
                    onCheckedChange={(checked) => handleCheckboxChange('isDefaultBilling', checked as boolean)}
                  />
                  <Label htmlFor="isDefaultBilling" className="cursor-pointer">Varsayılan fatura adresi olarak ayarla</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={editingAddress ? handleUpdateAddress : handleAddAddress}>
                {editingAddress ? 'Güncelle' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  );
} 