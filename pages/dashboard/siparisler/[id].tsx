import { ReactElement, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { NextPageWithLayout } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  MessageSquare,
  Printer,
  RefreshCcw,
  Mail,
  Send
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin, CreditCard } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getValidNextStatuses, getStatusText, getStatusColor } from '@/lib/orderStatusUtils';
import { OrderStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';
import { FormattedOrder, FormattedOrderItem, Address, User } from '@/types/order';

interface OrderDetail extends Omit<FormattedOrder, 'user'> {
  // Extending the FormattedOrder interface with admin-specific fields
  adminNotes?: string;
  user?: {
    id: number;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  totalPrice?: number; // API'den gelebilecek ek alan
}

// Timeline öğesi için tip tanımı
interface TimelineEvent {
  id: number;
  status: string;
  description: string;
  date?: string | Date;
  createdAt: string | Date;
}

const OrderDetailPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: queryId } = router.query;
  const id = typeof queryId === 'string' ? queryId : '';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingStatus, setProcessingStatus] = useState(false);
  const [processingNotes, setProcessingNotes] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // E-posta formu için state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchOrderDetails();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, id]);

  // Log product images when order data is received
  useEffect(() => {
    if (order && order.items) {
      console.log("Order items image details:");
      order.items.forEach(item => {
        console.log(`Item ${item.id} (Product ${item.productId}):`, {
          hasProductImage: !!item.productImage,
          productImageUrl: item.productImage,
          isValidImageUrl: item.productImage && typeof item.productImage === 'string' && 
            (item.productImage.startsWith('http') || item.productImage.startsWith('/')),
        });
      });
    }
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/orders/${id}`);
      console.log("Order API response:", response.data);
      setOrder(response.data);
      setAdminNotes(response.data.adminNotes || '');
      setSelectedStatus(response.data.status || '');
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      
      // Check if it's a 403 Forbidden error
      if (error.response && error.response.status === 403) {
        toast({
          title: 'Erişim Reddedildi',
          description: 'Bu siparişi görüntüleme yetkiniz bulunmamaktadır.',
          variant: 'destructive',
        });
        // Redirect back to the orders list page after a short delay
        setTimeout(() => {
          router.push('/dashboard/siparisler');
        }, 2000);
      } else {
        toast({
          title: 'Hata',
          description: 'Sipariş detayları alınırken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      if (order) {
        const validNextStatuses = getValidNextStatuses(order.status);
        console.log('Valid next statuses:', validNextStatuses);
        
        if (!validNextStatuses.includes(newStatus as OrderStatus)) {
          toast({
            title: 'Geçersiz İşlem',
            description: `${getStatusText(order.status)} durumundan ${getStatusText(newStatus)} durumuna geçiş yapılamaz.`,
            variant: 'destructive',
          });
          return;
        }
      }

      setProcessingStatus(true);
      setSelectedStatus(newStatus);
      
      try {
        const response = await axios.patch(`/api/orders/${id}`, { status: newStatus });
        toast({
          title: 'Başarılı',
          description: `Sipariş durumu "${getStatusText(newStatus)}" olarak güncellendi.`,
        });
        fetchOrderDetails();
      } catch (error: any) {
        console.error('Error updating order status:', error);
        
        // API'den gelen hata mesajını gösterme
        const errorMessage = error.response?.data?.error || 'Sipariş durumu güncellenirken bir hata oluştu.';
        
        if (order) {
          setSelectedStatus(order.status);
        }
        
        toast({
          title: 'Hata',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in handleUpdateStatus:', error);
      toast({
        title: 'Hata',
        description: 'Sipariş durumu işlenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setProcessingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setProcessingNotes(true);
      await axios.patch(`/api/orders/${id}`, { adminNotes });
      toast({
        title: 'Başarılı',
        description: 'Admin notları kaydedildi.',
      });
      setNotesDialogOpen(false);
    } catch (error) {
      console.error('Error saving admin notes:', error);
      toast({
        title: 'Hata',
        description: 'Notlar kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setProcessingNotes(false);
    }
  };

  // E-posta gönderme fonksiyonu
  const handleSendEmail = async () => {
    if (!emailContent.trim()) {
      toast({
        title: 'Hata',
        description: 'E-posta içeriği boş olamaz.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSendingEmail(true);
      
      const response = await axios.post('/api/orders/send-email', {
        orderId: id,
        emailContent,
        subject: emailSubject || `Siparişiniz #${order?.orderNumber} Hakkında`
      });
      
      toast({
        title: 'Başarılı',
        description: 'E-posta başarıyla gönderildi.',
      });
      
      // Formu temizle ve modalı kapat
      setEmailContent('');
      setEmailSubject('');
      setEmailDialogOpen(false);
      
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Hata',
        description: error.response?.data?.error || 'E-posta gönderilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // E-posta içeriğini oluşturma fonksiyonu
  const generateEmailTemplate = () => {
    if (!order) return '';
    
    // Stok sorunları için örnek bir gecikme e-posta şablonu
    const customerName = order.user?.firstName || order.user?.lastName 
      ? `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() 
      : 'Değerli Müşterimiz';
      
    return `Öncelikle siparişiniz için teşekkür ederiz.

Siparişinizde yer alan ürünlerden bazıları için tedarik sürecinde bir gecikme yaşıyoruz. Bu durum nedeniyle siparişinizin tahmini teslimat süresi uzayabilir.

Siparişiniz en kısa sürede hazırlanıp kargoya verilecektir. Bu gecikme için özür dileriz.

İlginiz ve anlayışınız için teşekkür ederiz.`;
  };

  const getStatusIcon = (status: string) => {
    const upperStatus = status.toUpperCase();
    
    if (upperStatus === OrderStatus.PENDING) return <Clock className="h-5 w-5" />;
    if (upperStatus === OrderStatus.PROCESSING) return <Package className="h-5 w-5" />;
    if (upperStatus === OrderStatus.SHIPPED) return <Truck className="h-5 w-5" />;
    if (upperStatus === OrderStatus.DELIVERED || upperStatus === OrderStatus.COMPLETED) return <CheckCircle className="h-5 w-5" />;
    if (upperStatus === OrderStatus.CANCELLED) return <AlertCircle className="h-5 w-5" />;
    
    return <Clock className="h-5 w-5" />;
  };

  const renderOrderItems = () => {
    if (!order?.items || order.items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-6 text-gray-500">
            Sipariş ürünleri bulunamadı
          </TableCell>
        </TableRow>
      );
    }

    return order.items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-100 rounded overflow-hidden relative">
              {item.productImage && typeof item.productImage === 'string' ? (
                <img
                  src={item.productImage}
                  alt={item.productName || 'Ürün görseli'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.log(`Image load error for product ID ${item.productId}`);
                    const target = e.target as HTMLImageElement;
                    // Replace with fallback icon
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-200');
                      const iconElement = document.createElement('div');
                      iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-gray-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>';
                      parent.appendChild(iconElement);
                    }
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-200">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <Link href={`/dashboard/urunler/${item.productId}`} className="font-medium hover:underline">
                {item.productName || 'Ürün adı bulunamadı'}
              </Link>
              <p className="text-xs text-gray-500">SKU: {item.productId}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>{formatCurrency(item.price || 0)}</TableCell>
        <TableCell>{item.quantity || 0}</TableCell>
        <TableCell className="text-right font-medium">{formatCurrency(item.total || (item.price * item.quantity) || 0)}</TableCell>
      </TableRow>
    ));
  };

  const renderOrderSummary = () => {
    if (!order) return null;
    
    console.log("Order summary data:", {
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      total: order.total,
      totalPrice: order?.totalPrice
    });
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Ara Toplam</span>
          <span>{formatCurrency(order.subtotal || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Kargo</span>
          <span>{formatCurrency(order.shippingCost || 0)}</span>
        </div>
        {(order.discountAmount || 0) > 0 && (
          <div className="flex justify-between text-green-600">
            <span>İndirim</span>
            <span>-{formatCurrency(order.discountAmount || 0)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Vergi (KDV)</span>
          <span>{formatCurrency(order.taxAmount || 0)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-lg">
          <span>Toplam</span>
          <span>{formatCurrency(order.total || order.totalPrice || 0)}</span>
        </div>
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-[150px]" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[200px] rounded-xl col-span-2" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold mb-4">Lütfen Giriş Yapın</h1>
          <p className="text-gray-500 mb-6">Bu sayfayı görüntülemek için giriş yapmanız gerekmektedir.</p>
          <Button onClick={() => router.push('/auth/signin')}>Giriş Yap</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Sipariş #{order?.orderNumber || ''} | Yönetim Paneli</title>
      </Head>

      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/siparisler')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Sipariş #{order?.orderNumber || ''}</h1>
            <Badge className={getStatusColor(order?.status || '')}>
              {getStatusText(order?.status || '')}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
            {order && order.user && 'email' in order.user && order.user.email && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setEmailContent(generateEmailTemplate());
                  setEmailDialogOpen(true);
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                E-posta Gönder
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setNotesDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Notlar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Sipariş Detayları</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Adet</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderOrderItems()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sipariş Durumu</CardTitle>
                <CardDescription>
                  Sipariş {format(new Date(order?.createdAt || new Date()), 'dd MMMM yyyy - HH:mm')} tarihinde oluşturulmuştur.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Badge className={getStatusColor(order?.status || '')}>
                      {getStatusIcon(order?.status || '')}
                      <span className="ml-1">{getStatusText(order?.status || '')}</span>
                    </Badge>
                  </div>
                  {processingStatus ? (
                    <Button disabled>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      İşleniyor...
                    </Button>
                  ) : (
                    <div>
                      <Select 
                        onValueChange={handleUpdateStatus}
                        value={selectedStatus}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue 
                            placeholder="Durum Değiştir" 
                            className="text-sm truncate"
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={order?.status || 'PENDING'}>
                            <div className="flex items-center">
                              <Badge className={`mr-2 ${getStatusColor(order?.status || 'PENDING')}`}>
                                <span className="truncate">{getStatusText(order?.status || 'PENDING')}</span>
                              </Badge>
                              <span>(Mevcut)</span>
                            </div>
                          </SelectItem>

                          {order && getValidNextStatuses(order.status || 'PENDING').map(status => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center">
                                <Badge className={`mr-2 ${getStatusColor(status)}`}>
                                  <span className="truncate">{getStatusText(status)}</span>
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {order && getValidNextStatuses(order.status || 'PENDING').length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Bu durum için başka değişiklik yapılamaz.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {order?.timeline && order.timeline.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-4">Sipariş Geçmişi</h3>
                    <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                      {order.timeline.map((event, index) => (
                        <li key={index} className="mb-10 ml-6">
                          <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -left-3 ring-8 ring-white">
                            {getStatusIcon(event.status)}
                          </span>
                          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
                            {getStatusText(event.status)}
                          </h3>
                          <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                            {(() => {
                              try {
                                // Typescript için tip güvenliği ekleyelim
                                let eventDate: string | Date | undefined;
                                
                                if (typeof event === 'object' && event !== null) {
                                  // date veya createdAt özelliğine sahip mi kontrol edelim
                                  if ('date' in event && event.date && 
                                      (typeof event.date === 'string' || event.date instanceof Date)) {
                                    eventDate = event.date;
                                  } else if ('createdAt' in event && event.createdAt && 
                                            (typeof event.createdAt === 'string' || event.createdAt instanceof Date)) {
                                    eventDate = event.createdAt;
                                  }
                                }
                                
                                return eventDate ? format(new Date(eventDate), 'dd MMMM yyyy - HH:mm') : 'Tarih bilgisi yok';
                              } catch (error) {
                                console.error('Invalid date format:', error);
                                return 'Geçersiz tarih formatı';
                              }
                            })()}
                          </time>
                          <p className="mb-4 text-base font-normal text-gray-500">
                            {event.description}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sipariş Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderSummary()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Müşteri Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Müşteri</h3>
                    {order?.user && 'email' in order.user ? (
                      <>
                        <p>
                          {order.user.name || 
                           (order.user.firstName || order.user.lastName) ? 
                             `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 
                             'İsimsiz Müşteri'
                          }
                        </p>
                        <p className="text-sm text-gray-500">{order.user.email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Müşteri bilgisi bulunamadı</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ödeme Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Ödeme Yöntemi</p>
                      <p className="text-gray-500">{order?.payment?.method || 'Belirtilmemiş'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Fatura Adresi</p>
                      {order?.billingAddress ? (
                        <>
                          <p>{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                          <p>{order.billingAddress.title}</p>
                          <p>{order.billingAddress.street}</p>
                          <p>{order.billingAddress.city} / {order.billingAddress.state}</p>
                          <p>{order.billingAddress.zipCode}</p>
                          <p>{order.billingAddress.country}</p>
                          <p>{order.billingAddress.phone}</p>
                        </>
                      ) : (
                        <p className="text-gray-500">Fatura adresi belirtilmemiş</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teslimat Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Teslimat Adresi</p>
                      {order?.shippingAddress ? (
                        <>
                          <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                          <p>{order.shippingAddress.title}</p>
                          <p>{order.shippingAddress.street}</p>
                          <p>{order.shippingAddress.city} / {order.shippingAddress.state}</p>
                          <p>{order.shippingAddress.zipCode}</p>
                          <p>{order.shippingAddress.country}</p>
                          <p>{order.shippingAddress.phone}</p>
                        </>
                      ) : (
                        <p className="text-gray-500">Teslimat adresi belirtilmemiş</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order?.adminNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Notları</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{order.adminNotes}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setNotesDialogOpen(true)}
                    className="ml-auto"
                  >
                    Düzenle
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notları</DialogTitle>
            <DialogDescription>
              Bu siparişle ilgili dahili notları girin. Bu notlar müşteri tarafından görülemez.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Sipariş ile ilgili notlarınızı girin..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={6}
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNotesDialogOpen(false)}
            >
              İptal
            </Button>
            <Button 
              onClick={handleSaveNotes}
              disabled={processingNotes}
            >
              {processingNotes ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* E-posta Gönderme Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Müşteriye E-posta Gönder</DialogTitle>
            <DialogDescription>
              Sipariş #{order?.orderNumber} için müşteri {order?.user?.email} adresine e-posta gönderin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">E-posta Konusu</Label>
              <Input
                id="subject"
                placeholder="Siparişiniz Hakkında"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">E-posta İçeriği</Label>
              <Textarea
                id="content"
                placeholder="E-posta içeriğini yazın..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={12}
                className="min-h-[200px]"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Not: E-posta otomatik olarak giriş metni ve müşteri adı ile başlayacaktır.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmailDialogOpen(false)}
            >
              İptal
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  E-posta Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

OrderDetailPage.getLayout = function getLayout(page: ReactElement) {
  return page;
};

export default OrderDetailPage; 