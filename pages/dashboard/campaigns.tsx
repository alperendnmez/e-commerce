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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PlusIcon, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

// Form şema validasyonu
const campaignSchema = z.object({
  name: z.string().min(3, "İsim en az 3 karakter olmalıdır"),
  description: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED", "BOGO", "FREE_SHIPPING"]),
  value: z.string().refine(value => value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0), {
    message: "Değer geçerli bir sayı olmalıdır",
  }).optional(),
  minOrderAmount: z.string().refine(value => value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0), {
    message: "Minimum sipariş tutarı geçerli bir sayı olmalıdır",
  }).optional(),
  startDate: z.string(),
  endDate: z.string(),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type Campaign = {
  id: number;
  name: string;
  description: string | null;
  type: "PERCENT" | "FIXED" | "BOGO" | "FREE_SHIPPING";
  value: number | null;
  minOrderAmount: number | null;
  startDate: Date;
  endDate: Date;
  categoryId: number | null;
  productId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  const form = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'PERCENT',
      value: '',
      minOrderAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      categoryId: '',
      productId: '',
      isActive: true,
    },
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (editingCampaign) {
      form.reset({
        name: editingCampaign.name,
        description: editingCampaign.description || '',
        type: editingCampaign.type,
        value: editingCampaign.value?.toString() || '',
        minOrderAmount: editingCampaign.minOrderAmount?.toString() || '',
        startDate: new Date(editingCampaign.startDate).toISOString().split('T')[0],
        endDate: new Date(editingCampaign.endDate).toISOString().split('T')[0],
        categoryId: editingCampaign.categoryId?.toString() || '',
        productId: editingCampaign.productId?.toString() || '',
        isActive: editingCampaign.isActive,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        type: 'PERCENT',
        value: '',
        minOrderAmount: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        categoryId: '',
        productId: '',
        isActive: true,
      });
    }
  }, [editingCampaign, form]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/dashboard/campaigns');
      setCampaigns(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.response?.data?.error || 'Kampanyalar yüklenirken bir hata oluştu.');
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kampanyalar yüklenirken bir hata oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof campaignSchema>) => {
    try {
      // Validate dates
      const startDate = new Date(values.startDate);
      const endDate = new Date(values.endDate);
      
      if (endDate <= startDate) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır",
        });
        return;
      }
      
      const payload = {
        ...values,
        value: values.value ? parseFloat(values.value) : null,
        minOrderAmount: values.minOrderAmount ? parseFloat(values.minOrderAmount) : null,
        categoryId: values.categoryId ? parseInt(values.categoryId) : null,
        productId: values.productId ? parseInt(values.productId) : null,
      };

      if (editingCampaign) {
        await axios.put(`/api/dashboard/campaigns?id=${editingCampaign.id}`, payload);
        toast({
          title: "Başarılı",
          description: "Kampanya başarıyla güncellendi",
        });
      } else {
        await axios.post('/api/dashboard/campaigns', payload);
        toast({
          title: "Başarılı",
          description: "Kampanya başarıyla oluşturuldu",
        });
      }
      
      setIsDialogOpen(false);
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kampanya kaydedilirken bir hata oluştu.',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/dashboard/campaigns?id=${id}`);
      toast({
        title: "Başarılı",
        description: "Kampanya başarıyla silindi",
      });
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error deleting campaign:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kampanya silinirken bir hata oluştu.',
      });
    }
  };

  const toggleActive = async (campaign: Campaign) => {
    try {
      await axios.put(`/api/dashboard/campaigns?id=${campaign.id}`, {
        ...campaign,
        isActive: !campaign.isActive,
      });
      
      toast({
        title: "Başarılı",
        description: `Kampanya ${!campaign.isActive ? 'aktifleştirildi' : 'devre dışı bırakıldı'}`,
      });
      
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error toggling campaign status:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Kampanya durumu değiştirilirken bir hata oluştu.',
      });
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      campaign.name.toLowerCase().includes(searchLower) ||
      (campaign.description && campaign.description.toLowerCase().includes(searchLower)) ||
      campaign.type.toLowerCase().includes(searchLower)
    );
  });

  const formatValue = (campaign: Campaign) => {
    if (campaign.type === "PERCENT") {
      return `%${campaign.value}`;
    } else if (campaign.type === "FIXED") {
      return formatCurrency(campaign.value || 0);
    } else if (campaign.type === "BOGO") {
      return "Al 1 Öde 1";
    } else if (campaign.type === "FREE_SHIPPING") {
      return "Ücretsiz Kargo";
    }
    return "";
  };

  const formatType = (type: string) => {
    switch (type) {
      case "PERCENT": return "Yüzde";
      case "FIXED": return "Tutar";
      case "BOGO": return "Al 1 Öde 1";
      case "FREE_SHIPPING": return "Ücretsiz Kargo";
      default: return type;
    }
  };

  const isCampaignActive = (campaign: Campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    
    return campaign.isActive && now >= startDate && now <= endDate;
  };

  const shouldShowValueField = form.watch("type") === "PERCENT" || form.watch("type") === "FIXED";

  return (
    <DashboardLayout>
      <Head>
        <title>Kampanyalar | Admin Panel</title>
      </Head>
      
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Kampanyalar</h1>
            <p className="text-muted-foreground">İndirim kampanyalarını yönetin</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingCampaign(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Yeni Kampanya
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCampaign ? 'Kampanya Düzenle' : 'Yeni Kampanya Oluştur'}
                </DialogTitle>
                <DialogDescription>
                  {editingCampaign 
                    ? 'Mevcut kampanyayı düzenleyin' 
                    : 'Yeni bir indirim kampanyası oluşturun'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kampanya Adı</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Yaz İndirimi 2023" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Kampanya detayları (opsiyonel)" 
                            className="resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kampanya Türü</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Kampanya türü seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERCENT">Yüzde İndirim (%)</SelectItem>
                              <SelectItem value="FIXED">Tutar İndirim (TL)</SelectItem>
                              <SelectItem value="BOGO">Al 1 Öde 1</SelectItem>
                              <SelectItem value="FREE_SHIPPING">Ücretsiz Kargo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {shouldShowValueField && (
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
                    )}
                  </div>
                  
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlangıç Tarihi</FormLabel>
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
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bitiş Tarihi</FormLabel>
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
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori ID (Opsiyonel)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Belirli bir kategori için" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ürün ID (Opsiyonel)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Belirli bir ürün için" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
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
                  
                  <div className="flex gap-3 justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingCampaign(null);
                      }}
                    >
                      İptal
                    </Button>
                    <Button type="submit">
                      {editingCampaign ? 'Güncelle' : 'Oluştur'}
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
            placeholder="Kampanya ara..."
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
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Görüntülenecek kampanya bulunamadı.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adı</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Değer</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Geçerlilik</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {campaign.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatType(campaign.type)}</TableCell>
                    <TableCell>{formatValue(campaign)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={isCampaignActive(campaign) ? "success" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(campaign)}
                      >
                        {isCampaignActive(campaign) ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(campaign.startDate), 'dd.MM.yyyy')} - 
                        {format(new Date(campaign.endDate), 'dd.MM.yyyy')}
                      </div>
                      {campaign.minOrderAmount && (
                        <div className="text-xs text-muted-foreground">
                          Min: {formatCurrency(campaign.minOrderAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingCampaign(campaign);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(campaign.id)}
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