import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
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
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PlusIcon, MinusIcon, EyeIcon, ShieldAlertIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Form şema validasyonu
const transactionSchema = z.object({
  amount: z.string().refine(value => !isNaN(parseFloat(value)) && parseFloat(value) !== 0, {
    message: "Tutar sıfır olamaz ve geçerli bir sayı olmalıdır",
  }),
  description: z.string().optional(),
});

type Transaction = {
  id: number;
  giftCardId: number;
  amount: number;
  description: string;
  createdAt: Date;
  giftCard: {
    code: string;
    userId?: number | null;
  };
};

export default function GiftCardTransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const giftCardId = searchParams.get('giftCardId');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [giftCardCode, setGiftCardCode] = useState<string>('');
  
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: '',
      description: '',
    },
  });

  useEffect(() => {
    fetchTransactions();
    if (giftCardId) {
      fetchGiftCardDetails();
    }
  }, [giftCardId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const url = giftCardId 
        ? `/api/dashboard/gift-cards/transactions?giftCardId=${giftCardId}`
        : '/api/dashboard/gift-cards/transactions';
      
      const { data } = await axios.get(url);
      
      if (giftCardId) {
        setTransactions(data);
      } else {
        setTransactions(data.transactions || []);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.error || 'Hediye kartı işlemleri yüklenirken bir hata oluştu.');
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'Hediye kartı işlemleri yüklenirken bir hata oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGiftCardDetails = async () => {
    if (!giftCardId) return;
    
    try {
      const { data } = await axios.get(`/api/dashboard/gift-cards/${giftCardId}`);
      setGiftCardCode(data.code);
    } catch (err) {
      console.error('Error fetching gift card details:', err);
    }
  };

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    try {
      if (!giftCardId) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Hediye kartı ID eksik",
        });
        return;
      }

      const payload = {
        giftCardId: parseInt(giftCardId),
        amount: parseFloat(values.amount),
        description: values.description || (parseFloat(values.amount) > 0 
          ? 'Bakiye yükleme' 
          : 'Bakiye düşme')
      };

      await axios.post('/api/dashboard/gift-cards/transactions', payload);
      
      toast({
        title: "Başarılı",
        description: "İşlem başarıyla kaydedildi",
      });
      
      form.reset();
      setIsAddDialogOpen(false);
      fetchTransactions();
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.response?.data?.error || 'İşlem oluşturulurken bir hata meydana geldi.',
      });
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.giftCard.code.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchQuery)
    );
  });

  return (
    <DashboardLayout>
      <Head>
        <title>Hediye Kartı İşlemleri | Admin Panel</title>
      </Head>
      
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {giftCardId 
                ? `Hediye Kartı İşlemleri: ${giftCardCode}`
                : 'Tüm Hediye Kartı İşlemleri'}
            </h1>
            <p className="text-muted-foreground">
              {giftCardId 
                ? `${giftCardCode} kodlu hediye kartının işlem geçmişi`
                : 'Sistemdeki tüm hediye kartı işlemlerini görüntüleyin'}
            </p>
          </div>
          
          {giftCardId && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Yeni İşlem
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni İşlem Ekle</DialogTitle>
                  <DialogDescription>
                    Hediye kartı için bakiye ekleme veya çıkarma işlemi oluşturun.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tutar (TL)</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <div className="flex items-center border rounded-l px-2 bg-muted">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 p-1"
                                  onClick={() => form.setValue("amount", `-${Math.abs(parseFloat(field.value || '0'))}`)}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 p-1"
                                  onClick={() => form.setValue("amount", `${Math.abs(parseFloat(field.value || '0'))}`)}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              <Input 
                                {...field} 
                                className="rounded-l-none"
                                placeholder="0.00" 
                              />
                            </div>
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
                            <Input {...field} placeholder="İşlem açıklaması (opsiyonel)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-3 justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        İptal
                      </Button>
                      <Button type="submit">İşlemi Kaydet</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Arama ve Filtreler */}
        <div className="mb-6">
          <Input
            placeholder="İşlem ara..."
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
            <ShieldAlertIcon className="mx-auto h-8 w-8 mb-2" />
            <p>{error}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Görüntülenecek işlem bulunamadı.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Kart Kodu</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id}</TableCell>
                    <TableCell>{transaction.giftCard.code}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.amount > 0 ? "success" : "destructive"}>
                        {transaction.amount > 0 ? "+" : ""}{formatCurrency(transaction.amount)}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      {format(new Date(transaction.createdAt), 'dd.MM.yyyy HH:mm')}
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