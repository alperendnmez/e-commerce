import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn, useSession } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Separator } from '@/components/ui/separator'

const SignInFormSchema = z.object({
  email: z.string().email('Lütfen geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı')
})

function SignInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { toast } = useToast()

  console.log(session, status, "hellooo")
  
  // Giriş yapmış kullanıcıları ana sayfaya yönlendir
  useEffect(() => {
    if (status === 'authenticated') {
      console.log("Kullanıcı zaten giriş yapmış, ana sayfaya yönlendiriliyor");
      
      // Admin kullanıcılarını dashboard'a, normal kullanıcıları ana sayfaya yönlendir
      if (session?.user?.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [session, status, router]);
  
  // Admin kullanıcılarını otomatik olarak dashboard'a yönlendir
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      console.log("Admin girişi algılandı, dashboard'a yönlendiriliyor");
      router.push('/dashboard');
    }
  }, [session, status, router]);
  
  const form = useForm<z.infer<typeof SignInFormSchema>>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: z.infer<typeof SignInFormSchema>) => {
    setIsLoading(true)
    console.log("Giriş deneniyor:", data.email);
    
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        callbackUrl: '/',  // Varsayılan olarak ana sayfaya yönlendir
        redirect: false
      })
      
      console.log("Giriş sonucu:", result);
      
      if (result?.error) {
        // Daha kullanıcı dostu hata mesajları
        let errorMessage = '';
        
        if (result.error === "Invalid credentials") {
          errorMessage = "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.";
        } else if (result.error.includes("Too many login attempts")) {
          errorMessage = "Çok fazla başarısız giriş denemesi. Lütfen bir süre bekleyip tekrar deneyiniz.";
        } else if (result.error === "Email and password are required") {
          errorMessage = "E-posta ve şifre alanları boş bırakılamaz.";
        } else if (result.error.includes("OAuthAccountNotLinked")) {
          errorMessage = "Bu e-posta zaten farklı bir giriş yöntemi ile kayıtlı. Google ile giriş yapmayı deneyin.";
          // Google ile giriş yapma önerisini hemen gösterelim
          setTimeout(() => {
            handleGoogleSignIn();
          }, 3000);
        } else {
          errorMessage = `Giriş yapılamadı: ${result.error}`;
        }
        
        toast({ 
          title: 'Giriş Başarısız', 
          description: errorMessage,
          variant: 'destructive'
        });

        // Google ile giriş yapma ipucu
        if (result.error === "Invalid credentials") {
          setTimeout(() => {
            toast({ 
              title: 'İpucu', 
              description: "Google hesabınızla da giriş yapmayı deneyebilirsiniz.",
              variant: 'default'
            });
          }, 2000);
        }
      } else if (result?.url) {
        // Kullanıcının rolünü kontrol et ve uygun sayfaya yönlendir
        // Admin kullanıcısı ise dashboard'a, değilse ana sayfaya yönlendir
        
        // Session'ı yenile
        await router.push(result.url);
        
        // Session yüklendikten sonra rolü kontrol et
        setTimeout(async () => {
          const session = await fetch('/api/auth/session');
          const sessionData = await session.json();
          
          if (sessionData?.user?.role === 'ADMIN') {
            console.log("Admin kullanıcısı tespit edildi, dashboard'a yönlendiriliyor");
            router.push('/dashboard');
          } else {
            console.log("Normal kullanıcı tespit edildi, ana sayfada kalıyor");
          }
        }, 500);
      }
    } catch (error) {
      console.error("Giriş sırasında beklenmeyen hata:", error);
      toast({ 
        title: 'Beklenmeyen Hata!', 
        description: `Giriş sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyiniz.`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      // Google ile giriş yap, ana sayfaya yönlendir
      // Admin kontrolü onSubmit fonksiyonundaki gibi yapılır
      await signIn('google', { callbackUrl: '/', redirect: true });
      
      // NOT: Google ile giriş otomatik olarak tam sayfa yönlendirmesi yapar
      // Bu nedenle buradaki kod çalışmayacaktır, ancak
      // sayfa yenilendiğinde yukarıdaki useEffect ile kontrol edilir
    } catch (error) {
      console.error("Google ile giriş sırasında hata:", error);
      toast({ 
        title: 'Google Giriş Hatası!', 
        description: `Google ile giriş yapılırken bir hata oluştu.`,
        variant: 'destructive'
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Giriş Yap | Furnico</title>
      </Head>
      <main className='grid h-screen w-full grid-cols-2'>
        <div className='flex h-full items-center justify-center border-r'>
          <h1 className='text-6xl font-bold'>Furnico</h1>
        </div>
        <div className='flex flex-col items-center justify-center'>
          <h2 className='text-3xl'>Giriş Yap</h2>
          
          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn} 
            disabled={googleLoading}
            className="mt-6 w-full max-w-sm flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" width="16" height="16">
              <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" fill="#4285F4"/>
            </svg>
            {googleLoading ? 'İşleniyor...' : 'Google ile Giriş Yap'}
          </Button>

          <div className="relative mt-6 w-full max-w-sm">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Veya e-posta ile giriş yap
              </span>
            </div>
          </div>
          
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='mt-6 w-full max-w-sm space-y-4'
            >
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='example@gmail.com'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Şifre</FormLabel>
                      <Link href="/sifremi-unuttum" className="text-xs text-primary hover:underline">
                        Şifremi Unuttum
                      </Link>
                    </div>
                    <FormControl>
                      <Input type='password' placeholder='*******' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className='mt-5 w-full'
                type='submit'
                disabled={isLoading}
              >
                {isLoading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
              </Button>

              <div className='mt-5 w-full text-center text-xs font-light text-foreground/50'>
                Hesabın yok mu?{' '}
                <Button
                  type='button'
                  variant='ghost'
                  className='p-0 text-xs text-primary hover:bg-transparent'
                  onClick={() => router.push('/kayit-ol')}
                >
                  Kayıt Ol
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </>
  )
}

export default SignInPage
