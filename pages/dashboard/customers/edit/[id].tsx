import { ReactElement, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from '@/lib/axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, AlertCircle, User, Ban, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Form şeması
const customerFormSchema = z.object({
  firstName: z.string().min(2, { message: 'Ad en az 2 karakter olmalıdır' }),
  lastName: z.string().min(2, { message: 'Soyad en az 2 karakter olmalıdır' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz' }),
  phone: z.string().optional(),
  newsletter: z.boolean().default(false),
  role: z.enum(['USER', 'ADMIN', 'EDITOR']),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => !data.password || data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

function CustomerEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form tanımı
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      newsletter: false,
      role: 'USER',
      gender: undefined,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/dashboard/customers/${id}`);
      const customer = response.data;
      
      form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || '',
        newsletter: customer.newsletter,
        role: customer.role,
        gender: customer.gender,
        password: '',
        confirmPassword: '',
      });
      
      setError(null);
    } catch (err: any) {
      console.error('Müşteri bilgileri getirilirken hata:', err);
      setError('Müşteri bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      setSaving(true);
      
      // Şifre boş ise formdan kaldır
      if (!data.password) {
        delete data.password;
        delete data.confirmPassword;
      }
      
      await axios.put(`/api/dashboard/customers/${id}`, data);
      
      toast({
        title: 'Başarılı!',
        description: 'Müşteri bilgileri güncellendi.',
      });
      
      router.push(`/dashboard/customers/${id}`);
    } catch (err: any) {
      console.error('Müşteri güncellenirken hata:', err);
      toast({
        title: 'Hata!',
        description: err.response?.data?.message || 'Müşteri güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>
          {error || 'Müşteri bulunamadı.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/customers/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Müşteri Detaylarına Dön
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Müşteri Düzenle</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCustomerData} disabled={saving}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Yenile
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
              <TabsTrigger value="security">Güvenlik</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Kişisel Bilgiler</CardTitle>
                  <CardDescription>
                    Müşterinin temel bilgilerini ve iletişim bilgilerini düzenleyin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={''} />
                      <AvatarFallback className="text-lg">
                        {form.watch('firstName') && form.watch('lastName') ? 
                          getInitials(form.watch('firstName'), form.watch('lastName')) : 'MÜ'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ad</FormLabel>
                            <FormControl>
                              <Input placeholder="Ad" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Soyad</FormLabel>
                            <FormControl>
                              <Input placeholder="Soyad" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta</FormLabel>
                            <FormControl>
                              <Input placeholder="E-posta adresi" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input placeholder="Telefon numarası" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cinsiyet</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Cinsiyet seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MALE">Erkek</SelectItem>
                                <SelectItem value="FEMALE">Kadın</SelectItem>
                                <SelectItem value="OTHER">Diğer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kullanıcı Rolü</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Rol seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USER">Müşteri</SelectItem>
                                <SelectItem value="EDITOR">Editör</SelectItem>
                                <SelectItem value="ADMIN">Yönetici</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="newsletter"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>E-bülten Aboneliği</FormLabel>
                          <FormDescription>
                            Kullanıcıya promosyon ve kampanya e-postaları gönderilecek
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Güvenlik Ayarları</CardTitle>
                  <CardDescription>
                    Kullanıcının şifresini değiştirin veya hesabını yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeni Şifre</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Yeni şifre" 
                              type="password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Değiştirmek istemiyorsanız boş bırakın
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şifre Tekrar</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Şifreyi tekrar girin" 
                              type="password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-6 p-4 border border-destructive/20 rounded-md bg-destructive/5">
                    <div className="flex items-center gap-3">
                      <Ban className="h-10 w-10 text-destructive" />
                      <div>
                        <h3 className="text-lg font-medium">Hesap Yönetimi</h3>
                        <p className="text-sm text-muted-foreground">Kullanıcı hesabına yönelik aksiyonlar</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                        Hesabı Kısıtla
                      </Button>
                      <Button type="button" variant="destructive">
                        Hesabı Sil
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/dashboard/customers/${id}`)}
              disabled={saving}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Kaydet
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

CustomerEditPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default CustomerEditPage; 