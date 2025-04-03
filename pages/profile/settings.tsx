import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import CustomerLayout from '@/components/layouts/CustomerLayout';
import { User, Lock, Bell, Shield, Upload } from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  image: string;
  phone: string;
  birthDate: string | null;
  gender: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    smsNotifications: true,
    marketingEmails: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/profile');
      setProfile(response.data);
      setFormData(prev => ({
        ...prev,
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        birthDate: response.data.birthDate || '',
        gender: response.data.gender || ''
      }));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        description: 'Profil bilgileri yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateProfileForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Ad soyad gereklidir';
    if (!formData.email.trim()) errors.email = 'E-posta gereklidir';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Geçerli bir e-posta adresi girin';
    if (formData.phone && !/^\d{10,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Geçerli bir telefon numarası girin';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.currentPassword) errors.currentPassword = 'Mevcut şifre gereklidir';
    if (!formData.newPassword) errors.newPassword = 'Yeni şifre gereklidir';
    if (formData.newPassword.length < 8) errors.newPassword = 'Şifre en az 8 karakter olmalıdır';
    if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateProfileForm()) return;

    try {
      setSaving(true);
      const response = await axios.put('/api/user/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate || null,
        gender: formData.gender || null
      });
      
      setProfile(response.data);
      // Update session data
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          email: formData.email
        }
      });
      
      toast({
        description: 'Profil bilgileri başarıyla güncellendi.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        description: 'Profil güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setSaving(true);
      await axios.put('/api/user/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      toast({
        description: 'Şifreniz başarıyla güncellendi.',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        description: error.response?.data?.error || 'Şifre güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      setSaving(true);
      await axios.put('/api/user/notifications', {
        emailNotifications: formData.emailNotifications,
        smsNotifications: formData.smsNotifications,
        marketingEmails: formData.marketingEmails
      });
      
      toast({
        description: 'Bildirim tercihleri başarıyla güncellendi.',
      });
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      toast({
        description: 'Bildirim tercihleri güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] rounded-xl" />
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
        <div className="flex items-center space-x-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.image || ''} alt={profile?.name} />
            <AvatarFallback>{profile?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name}</h1>
            <p className="text-gray-500">{profile?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center">
              <Lock className="mr-2 h-4 w-4" />
              Şifre
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              Bildirimler
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Gizlilik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profil Bilgileri</CardTitle>
                <CardDescription>
                  Kişisel bilgilerinizi güncelleyin. Bu bilgiler hesabınızla ilgili işlemlerde kullanılacaktır.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profil Fotoğrafı</Label>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile?.image || ''} alt={profile?.name} />
                      <AvatarFallback>{profile?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" className="h-9">
                      <Upload className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                    {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                    {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="05XX XXX XX XX"
                    />
                    {formErrors.phone && <p className="text-red-500 text-xs">{formErrors.phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Doğum Tarihi</Label>
                    <Input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Cinsiyet</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleSelectChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Cinsiyet seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Erkek</SelectItem>
                      <SelectItem value="FEMALE">Kadın</SelectItem>
                      <SelectItem value="OTHER">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Şifre Değiştir</CardTitle>
                <CardDescription>
                  Hesabınızın güvenliği için şifrenizi düzenli olarak değiştirmenizi öneririz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                  />
                  {formErrors.currentPassword && <p className="text-red-500 text-xs">{formErrors.currentPassword}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yeni Şifre</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                  />
                  {formErrors.newPassword && <p className="text-red-500 text-xs">{formErrors.newPassword}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                  {formErrors.confirmPassword && <p className="text-red-500 text-xs">{formErrors.confirmPassword}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleUpdatePassword} disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Bildirim Ayarları</CardTitle>
                <CardDescription>
                  Hangi bildirimler almak istediğinizi seçin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">E-posta Bildirimleri</h4>
                    <p className="text-sm text-gray-500">Sipariş durumu, kargo takibi ve önemli duyurular</p>
                  </div>
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    checked={formData.emailNotifications}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">SMS Bildirimleri</h4>
                    <p className="text-sm text-gray-500">Sipariş durumu ve kargo takibi</p>
                  </div>
                  <input
                    type="checkbox"
                    name="smsNotifications"
                    checked={formData.smsNotifications}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Pazarlama E-postaları</h4>
                    <p className="text-sm text-gray-500">Kampanyalar, indirimler ve özel teklifler</p>
                  </div>
                  <input
                    type="checkbox"
                    name="marketingEmails"
                    checked={formData.marketingEmails}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleUpdateNotifications} disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Gizlilik ve Güvenlik</CardTitle>
                <CardDescription>
                  Hesabınızın gizlilik ve güvenlik ayarlarını yönetin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">İki Faktörlü Kimlik Doğrulama</h4>
                    <p className="text-sm text-gray-500 mb-2">
                      Hesabınıza ekstra güvenlik katmanı ekleyin. Giriş yaparken telefonunuza gönderilen kodu girmeniz istenecektir.
                    </p>
                    <Button variant="outline" size="sm">
                      Aktifleştir
                    </Button>
                  </div>
                  <div>
                    <h4 className="font-medium">Oturum Açma Geçmişi</h4>
                    <p className="text-sm text-gray-500 mb-2">
                      Hesabınıza yapılan son giriş işlemlerini görüntüleyin.
                    </p>
                    <Button variant="outline" size="sm">
                      Görüntüle
                    </Button>
                  </div>
                  <div>
                    <h4 className="font-medium">Hesap Verilerini İndir</h4>
                    <p className="text-sm text-gray-500 mb-2">
                      Hesabınızla ilgili tüm verileri indirin.
                    </p>
                    <Button variant="outline" size="sm">
                      Veri İndir
                    </Button>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600">Hesabı Sil</h4>
                    <p className="text-sm text-gray-500 mb-2">
                      Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.
                    </p>
                    <Button variant="destructive" size="sm">
                      Hesabı Sil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
} 