import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

// Form şeması
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
    confirmPassword: z.string().min(1, 'Şifre tekrarı gereklidir'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // Token'ı URL'den al
  useEffect(() => {
    if (router.isReady) {
      const queryToken = router.query.token as string;
      if (!queryToken) {
        setInvalidToken(true);
      } else {
        setToken(queryToken);
      }
    }
  }, [router.isReady, router.query]);

  // Form tanımı
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Form gönderimi
  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setInvalidToken(true);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      
      setResetComplete(true);
      toast({
        title: 'Şifre Sıfırlama Başarılı',
        description: response.data.message,
      });
      
      // 3 saniye sonra giriş sayfasına yönlendir
      setTimeout(() => {
        router.push('/giris-yap');
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      
      if (errorMessage.includes('Geçersiz veya süresi dolmuş token')) {
        setInvalidToken(true);
      }
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Geçersiz token mesajı
  if (invalidToken) {
    return (
      <>
        <Head>
          <title>Geçersiz Token | Furnico</title>
        </Head>
        <main className="grid h-screen w-full grid-cols-2">
          <div className="flex h-full items-center justify-center border-r">
            <h1 className="text-6xl font-bold">Furnico</h1>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold">Geçersiz Bağlantı</h2>
                <p className="text-gray-500">
                  Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
                </p>
              </div>
              
              <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-red-800">Geçersiz veya Süresi Dolmuş Bağlantı</h3>
                <p className="mt-2 text-sm text-red-700">
                  Lütfen yeni bir şifre sıfırlama bağlantısı talep edin.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/sifremi-unuttum')}
                >
                  Şifre Sıfırlama Talep Et
                </Button>
              </div>
              
              <div className="text-center text-sm">
                <Link
                  href="/giris-yap"
                  className="underline transition hover:text-primary"
                >
                  Giriş sayfasına dön
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Şifre Sıfırlama | Furnico</title>
      </Head>
      <main className="grid h-screen w-full grid-cols-2">
        <div className="flex h-full items-center justify-center border-r">
          <h1 className="text-6xl font-bold">Furnico</h1>
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold">Şifre Sıfırlama</h2>
              <p className="text-gray-500">
                Lütfen yeni şifrenizi girin.
              </p>
            </div>
            
            {resetComplete ? (
              <div className="rounded-lg border border-green-100 bg-green-50 p-6 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-green-800">Şifre Başarıyla Sıfırlandı</h3>
                <p className="mt-2 text-sm text-green-700">
                  Yeni şifreniz ayarlandı. Şimdi giriş yapabilirsiniz.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/giris-yap')}
                >
                  Giriş Sayfasına Git
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yeni Şifre</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="********"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre Tekrarı</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="********"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'İşlem Yapılıyor...' : 'Şifremi Sıfırla'}
                  </Button>
                </form>
              </Form>
            )}
            
            <div className="text-center text-sm">
              <Link
                href="/giris-yap"
                className="underline transition hover:text-primary"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 