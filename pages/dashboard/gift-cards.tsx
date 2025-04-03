import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from '@/lib/axios';
import { toast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, Edit, Plus, Gift, Search, RefreshCw } from 'lucide-react';
import { tr } from 'date-fns/locale';
import { GiftCardStatus } from '@prisma/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const giftCardSchema = z.object({
  code: z.string().min(6, 'Hediye kartı kodu en az 6 karakter olmalıdır').toUpperCase(),
  initialBalance: z.string().min(1, 'Bakiye zorunludur'),
  validFrom: z.date().optional(),
  validUntil: z.date().min(new Date(), 'Bitiş tarihi bugünden sonra olmalıdır'),
  status: z.enum(['ACTIVE', 'USED', 'EXPIRED']).default('ACTIVE'),
  userId: z.string().optional(),
});

type GiftCard = {
  id: number;
  code: string;
  initialBalance: number;
  currentBalance: number;
  status: GiftCardStatus;
  validFrom: Date;
  validUntil: Date;
  userId: number | null;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const form = useForm<z.infer<typeof giftCardSchema>>({
    resolver: zodResolver(giftCardSchema),
    defaultValues: {
      code: '',
      initialBalance: '',
      validFrom: new Date(),
      validUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      status: 'ACTIVE',
      userId: '',
    },
  });

  const editForm = useForm<z.infer<typeof giftCardSchema>>({
    resolver: zodResolver(giftCardSchema),
    defaultValues: {
      code: '',
      initialBalance: '',
      validFrom: undefined,
      validUntil: undefined,
      status: 'ACTIVE',
      userId: '',
    },
  });

  useEffect(() => {
    fetchGiftCards();
  }, []);

  const fetchGiftCards = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/gift-cards');
      setGiftCards(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Hediye kartları alınırken hata oluştu');
      toast({
        title: 'Hata',
        description: err.response?.data?.error || 'Hediye kartları alınırken hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    form.setValue('code', result);
  };

  const onSubmit = async (values: z.infer<typeof giftCardSchema>) => {
    try {
      const giftCardData = {
        ...values,
        code: values.code.toUpperCase(),
        initialBalance: parseFloat(values.initialBalance),
        userId: values.userId ? parseInt(values.userId) : null,
      };
      
      await axios.post('/api/dashboard/gift-cards', giftCardData);
      toast({
        title: 'Başarılı',
        description: 'Hediye kartı başarıyla eklendi',
      });
      setIsAddDialogOpen(false);
      form.reset({
        code: '',
        initialBalance: '',
        validFrom: new Date(),
        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        status: 'ACTIVE',
        userId: '',
      });
      fetchGiftCards();
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: err.response?.data?.error || 'Hediye kartı eklenirken hata oluştu',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (giftCard: GiftCard) => {
    setSelectedGiftCard(giftCard);
    editForm.reset({
      code: giftCard.code,
      initialBalance: giftCard.initialBalance.toString(),
      validFrom: giftCard.validFrom ? new Date(giftCard.validFrom) : undefined,
      validUntil: giftCard.validUntil ? new Date(giftCard.validUntil) : undefined,
      status: giftCard.status,
      userId: giftCard.userId ? giftCard.userId.toString() : '',
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof giftCardSchema>) => {
    if (!selectedGiftCard) return;
    
    try {
      const giftCardData = {
        ...values,
        code: values.code.toUpperCase(),
        initialBalance: parseFloat(values.initialBalance),
        userId: values.userId ? parseInt(values.userId) : null,
      };
      
      await axios.put(`/api/dashboard/gift-cards/${selectedGiftCard.id}`, giftCardData);
      toast({
        title: 'Başarılı',
        description: 'Hediye kartı başarıyla güncellendi',
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      fetchGiftCards();
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: err.response?.data?.error || 'Hediye kartı güncellenirken hata oluştu',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bu hediye kartını silmek istediğinizden emin misiniz?')) {
      try {
        await axios.delete(`/api/dashboard/gift-cards/${id}`);
        toast({
          title: 'Başarılı',
          description: 'Hediye kartı başarıyla silindi',
        });
        fetchGiftCards();
      } catch (err: any) {
        toast({
          title: 'Hata',
          description: err.response?.data?.error || 'Hediye kartı silinirken hata oluştu',
          variant: 'destructive',
        });
      }
    }
  };

  const filteredGiftCards = giftCards.filter(giftCard => {
    const matchesSearch = giftCard.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (giftCard.userId && giftCard.userId.toString().includes(searchQuery));
      
    const matchesStatus = filterStatus === 'ALL' || giftCard.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: GiftCardStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'USED':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: GiftCardStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktif';
      case 'USED':
        return 'Kullanıldı';
      case 'EXPIRED':
        return 'Süresi Doldu';
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Hediye Kartları Yönetimi</title>
      </Head>
      
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Hediye Kartları</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Yeni Hediye Kartı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Yeni Hediye Kartı Oluştur</DialogTitle>
                <DialogDescription>
                  Yeni bir hediye kartı oluşturmak için bilgileri doldurun.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Kod</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="Kod" {...field} />
                            </FormControl>
                            <Button type="button" variant="outline" onClick={generateRandomCode}>
                              Oluştur
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="initialBalance"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Bakiye</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" placeholder="TL" {...field} />
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal flex justify-between items-center"
                                >
                                  {field.value ? format(field.value, 'PPP', { locale: tr }) : (
                                    <span>Tarih seçin</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                locale={tr}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geçerlilik Bitişi</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal flex justify-between items-center"
                                >
                                  {field.value ? format(field.value, 'PPP', { locale: tr }) : (
                                    <span>Tarih seçin</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                locale={tr}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Durum seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Aktif</SelectItem>
                            <SelectItem value="USED">Kullanıldı</SelectItem>
                            <SelectItem value="EXPIRED">Süresi Doldu</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kullanıcı ID (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Kullanıcı ID" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit">Oluştur</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex gap-2 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchGiftCards}
            disabled={loading}
          >
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
        ) : giftCards.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64">
            <Gift className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Henüz hediye kartı bulunmuyor</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Başlangıç Bakiyesi</TableHead>
                <TableHead>Mevcut Bakiye</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Geçerlilik</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCards.map((giftCard) => (
                <TableRow key={giftCard.id}>
                  <TableCell className="font-medium">{giftCard.code}</TableCell>
                  <TableCell>{formatCurrency(giftCard.initialBalance)}</TableCell>
                  <TableCell>{formatCurrency(giftCard.currentBalance)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-xs ${getStatusColor(giftCard.status)}`}>
                      {getStatusText(giftCard.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(giftCard.validFrom), 'dd.MM.yyyy')} -<br/>
                      {format(new Date(giftCard.validUntil), 'dd.MM.yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>{giftCard.userId || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(giftCard)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(giftCard.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Hediye Kartı Düzenle</DialogTitle>
            <DialogDescription>
              Hediye kartı bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Kod</FormLabel>
                      <FormControl>
                        <Input placeholder="Kod" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Bakiye</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="TL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geçerlilik Başlangıcı</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal flex justify-between items-center"
                            >
                              {field.value ? format(field.value, 'PPP', { locale: tr }) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geçerlilik Bitişi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal flex justify-between items-center"
                            >
                              {field.value ? format(field.value, 'PPP', { locale: tr }) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Aktif</SelectItem>
                        <SelectItem value="USED">Kullanıldı</SelectItem>
                        <SelectItem value="EXPIRED">Süresi Doldu</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı ID (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Kullanıcı ID" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Güncelle</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 