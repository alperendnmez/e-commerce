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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PlusIcon, Pencil, Trash2, AlertCircle, CheckCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

// Form şema validasyonu
const couponSchema = z.object({
  code: z.string().min(3, "Kod en az 3 karakter olmalıdır"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.string().refine(value => !isNaN(parseFloat(value)) && parseFloat(value) > 0, {
    message: "Değer sıfırdan büyük bir sayı olmalıdır",
  }),
  minOrderAmount: z.string().refine(value => value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0), {
    message: "Minimum sipariş tutarı geçerli bir sayı olmalıdır",
  }).optional(),
  maxUsage: z.string().refine(value => value === '' || (!isNaN(parseInt(value)) && parseInt(value) > 0), {
    message: "Maksimum kullanım sayısı pozitif bir tam sayı olmalıdır",
  }).optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  isActive: z.boolean().default(true),
});

type Coupon = {
  id: number;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  maxUsage: number | null;
  usageCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  const form = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      type: 'PERCENT',
      value: '',
      minOrderAmount: '',
      maxUsage: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
    },
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (editingCoupon) {
      form.reset({
        code: editingCoupon.code,
        type: editingCoupon.type,
        value: editingCoupon.value.toString(),
        minOrderAmount: editingCoupon.minOrderAmount?.toString() || '',
        maxUsage: editingCoupon.maxUsage?.toString() || '',
        validFrom: new Date(editingCoupon.validFrom).toISOString().split('T')[0],
        validUntil: new Date(editingCoupon.validUntil).toISOString().split('T')[0],
        isActive: editingCoupon.isActive,
      });
    } else {
      form.reset({
        code: '',
        type: 'PERCENT',
        value: '',
        minOrderAmount: '',
        maxUsage: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
  }, [editingCoupon, form]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/dashboard/coupons');
      setCoupons(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching coupons:', err);
      setError(err.response?.data?.error || 'Kuponlar yüklenirken bir hata oluştu.');
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kuponlar yüklenirken bir hata oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof couponSchema>) => {
    try {
      const payload = {
        ...values,
        value: parseFloat(values.value),
        minOrderAmount: values.minOrderAmount ? parseFloat(values.minOrderAmount) : null,
        maxUsage: values.maxUsage ? parseInt(values.maxUsage) : null,
      };

      if (editingCoupon) {
        await axios.put(`/api/dashboard/coupons?id=${editingCoupon.id}`, payload);
        toast({
          title: "Başarılı",
          description: "Kupon başarıyla güncellendi",
        });
      } else {
        await axios.post('/api/dashboard/coupons', payload);
        toast({
          title: "Başarılı",
          description: "Kupon başarıyla oluşturuldu",
        });
      }
      
      setIsDialogOpen(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kupon kaydedilirken bir hata oluştu.',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kuponu silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/dashboard/coupons?id=${id}`);
      toast({
        title: "Başarılı",
        description: "Kupon başarıyla silindi",
      });
      fetchCoupons();
    } catch (err: any) {
      console.error('Error deleting coupon:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kupon silinirken bir hata oluştu.',
      });
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await axios.put(`/api/dashboard/coupons?id=${coupon.id}`, {
        ...coupon,
        isActive: !coupon.isActive,
      });
      
      toast({
        title: "Başarılı",
        description: `Kupon ${!coupon.isActive ? 'aktifleştirildi' : 'devre dışı bırakıldı'}`,
      });
      
      fetchCoupons();
    } catch (err: any) {
      console.error('Error toggling coupon status:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kupon durumu değiştirilirken bir hata oluştu.',
      });
    }
  };

  const filteredCoupons = coupons.filter(coupon => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      coupon.code.toLowerCase().includes(searchLower) ||
      coupon.type.toLowerCase().includes(searchLower) ||
      coupon.value.toString().includes(searchQuery)
    );
  });

  const formatValue = (coupon: Coupon) => {
    return coupon.type === "PERCENT" 
      ? `%${coupon.value}` 
      : formatCurrency(coupon.value);
  };

  const isCouponActive = (coupon: Coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);
    
    return coupon.isActive && now >= validFrom && now <= validUntil;
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Kuponlar | Admin Panel</title>
      </Head>
      
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Kuponlar</h1>
            <p className="text-muted-foreground">İndirim kuponlarını yönetin</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingCoupon(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Yeni Kupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Kupon Düzenle' : 'Yeni Kupon Oluştur'}
                </DialogTitle>
                <DialogDescription>
                  {editingCoupon 
                    ? 'Mevcut kuponu düzenleyin' 
                    : 'Yeni bir indirim kuponu oluşturun'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kupon Kodu</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="YILBASI2023" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İndirim Türü</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="İndirim türü seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERCENT">Yüzde (%)</SelectItem>
                              <SelectItem value="FIXED">Sabit Tutar (TL)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İndirim Değeri</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder={form.getValues("type") === "PERCENT" ? "10" : "50.00"} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="minOrderAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Sipariş Tutarı (TL)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="100.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geçerlilik Başlangıcı</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geçerlilik Sonu</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxUsage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maksimum Kullanım Sayısı</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Sınırsız için boş bırakın" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-end space-x-3 space-y-0 py-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <FormLabel className="m-0">Aktif</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-3 justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingCoupon(null);
                      }}
                    >
                      İptal
                    </Button>
                    <Button type="submit">
                      {editingCoupon ? 'Güncelle' : 'Oluştur'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Arama ve Filtreler */}
        <div className="mb-6">
          <Input
            placeholder="Kupon ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        {/* Tablo */}
        {loading ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>{error}</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Görüntülenecek kupon bulunamadı.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Değer</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kullanım</TableHead>
                  <TableHead>Geçerlilik</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.code}</TableCell>
                    <TableCell>{formatValue(coupon)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={isCouponActive(coupon) ? "success" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(coupon)}
                      >
                        {isCouponActive(coupon) ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {coupon.usageCount}/{coupon.maxUsage || "∞"}
                      {coupon.minOrderAmount && (
                        <div className="text-xs text-muted-foreground">
                          Min: {formatCurrency(coupon.minOrderAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(coupon.validFrom), 'dd.MM.yyyy')} - 
                        {format(new Date(coupon.validUntil), 'dd.MM.yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(coupon.id)}
                        >
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
    </DashboardLayout>
  );
} 