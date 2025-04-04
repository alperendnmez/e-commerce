import { useState } from 'react';
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
const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  // Form tanımı
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Form gönderimi
  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setIsSubmitting(true);
      
      const response = await axios.post('/api/auth/forgot-password', data);
      
      setEmailSent(true);
      toast({
        title: 'İşlem Başarılı',
        description: response.data.message,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      
      // OAuth kullanıcısı kontrolü
      if (error.response?.data?.isOAuthUser) {
        toast({
          title: 'Google Hesabı Tespit Edildi',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // 3 saniye sonra Google girişine yönlendir
        setTimeout(() => {
          router.push('/giris-yap');
        }, 3000);
        return;
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

  return (
    <>
      <Head>
        <title>Şifremi Unuttum | Furnico</title>
      </Head>
      <main className="grid h-screen w-full grid-cols-2">
        <div className="flex h-full items-center justify-center border-r">
          <h1 className="text-6xl font-bold">Furnico</h1>
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold">Şifremi Unuttum</h2>
              <p className="text-gray-500">
                E-posta adresinizi girin ve şifre sıfırlama bağlantısı gönderelim.
              </p>
            </div>
            
            {emailSent ? (
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
                <h3 className="mt-4 text-lg font-semibold text-green-800">E-posta Gönderildi</h3>
                <p className="mt-2 text-sm text-green-700">
                  Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/giris-yap')}
                >
                  Giriş Sayfasına Dön
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ornek@email.com"
                            type="email"
                            autoComplete="email"
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
                    {isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
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