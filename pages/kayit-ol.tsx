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
import axios, { AxiosResponse } from 'axios'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import ReCAPTCHA from 'react-google-recaptcha'
import { signIn } from 'next-auth/react'
import { Separator } from '@/components/ui/separator'
import { useSession } from 'next-auth/react'

// Form Schema'ınızı güncelleyin
const RegisterFormSchema = z
  .object({
    email: z.string().email({
      message: 'Lütfen Geçerli Bir Mail Adresi Giriniz'
    }),
    password: z.string().min(6, {
      message: 'Parola 6 karakterden kısa olamaz'
    }),
    confirm: z.string(),
    firstName: z.string().min(1, { message: 'First name gerekli' }),
    lastName: z.string().min(1, { message: 'Last name gerekli' }),
    marketingConsent: z.boolean().optional(),
    userAgreement: z.boolean().refine(val => val === true, {
      message: 'Üyelik sözleşmesini kabul etmeniz gerekmektedir.'
    }),
    kvkkAgreement: z.boolean().refine(val => val === true, {
      message: 'KVKK Sözleşmesini kabul etmeniz gerekmektedir.'
    }),
    captcha: z.string().min(1, {
      message: 'Captcha doğrulaması gereklidir.'
    })
  })
  .refine(data => data.password === data.confirm, {
    message: 'Şifreler Eşleşmiyor',
    path: ['confirm']
  })

// API yanıt tipini tanımla
interface SignupResponse {
  message: string;
  success: boolean;
  userId: number;
  email: string;
  name: string;
  redirectTo?: string;
}

function SignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { data: session, status } = useSession()
  
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

  const form = useForm<z.infer<typeof RegisterFormSchema>>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirm: '',
      firstName: '',
      lastName: '',
      marketingConsent: false,
      userAgreement: false,
      kvkkAgreement: false,
      captcha: ''
    }
  })

  const onSubmit = async (data: z.infer<typeof RegisterFormSchema>) => {
    setIsLoading(true)
    try {
      // Kayıt işlemi
      const response = await axios.post<SignupResponse>(`/api/auth/signup`, {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirm,
        firstName: data.firstName,
        lastName: data.lastName,
        marketingConsent: data.marketingConsent,
        userAgreement: data.userAgreement,
        kvkkAgreement: data.kvkkAgreement,
        captcha: data.captcha
      });

      if (response.status === 201 && response.data.success) {
        toast({
          title: 'Kayıt Başarılı',
          description: 'Hesabınız oluşturuldu. Giriş yapılıyor...'
        });
        
        // API'den gelen isim bilgisini kullanarak kişiselleştirilmiş bir mesaj gösterebiliriz
        if (response.data.name) {
          toast({
            title: `Hoş geldiniz, ${response.data.name}!`,
            description: 'Hesabınız başarıyla oluşturuldu, şimdi ana sayfaya yönlendiriliyorsunuz.',
            variant: 'default'
          });
        }
        
        // Hemen giriş yap
        const signInResult = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        });
        
        if (signInResult?.error) {
          console.error("Otomatik giriş hatası:", signInResult.error);
          // Giriş hata verdiyse, hata mesajıyla birlikte kullanıcıyı bilgilendir
          toast({
            title: 'Otomatik Giriş Başarısız',
            description: 'Hesabınız oluşturuldu ancak otomatik giriş yapılamadı. Lütfen giriş yapmayı tekrar deneyin.',
            variant: 'destructive'
          });
          // Giriş sayfasına yönlendir
          router.push('/giris-yap');
        } else {
          // Giriş başarılı olursa API'den gelen URL'e veya ana sayfaya yönlendir
          const redirectUrl = response.data.redirectTo || '/';
          router.push(redirectUrl);
        }
      }
    } catch (error: any) {
      console.log(error);
      toast({
        title: 'Hata!',
        description: error?.response?.data?.error || 'Bilinmeyen Bir Hata Oluştu',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  const onCaptchaChange = (value: string | null) => {
    form.setValue('captcha', value || '');
  }

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      await signIn('google', { callbackUrl: '/' });  // Ana sayfaya yönlendir
    } catch (error) {
      console.error("Google ile kayıt sırasında hata:", error);
      toast({ 
        title: 'Google Kayıt Hatası!', 
        description: `Google ile kayıt yapılırken bir hata oluştu.`,
        variant: 'destructive'
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Kayıt Ol | Furnico</title>
      </Head>
      <main className='grid h-screen w-full grid-cols-2'>
        <div className='flex h-full items-center justify-center border-r'>
          <h1 className='text-6xl font-bold'>Furnico</h1>
        </div>
        <div className='flex flex-col items-center justify-center'>
          <h2 className='text-3xl'>Kayıt Ol</h2>
          
          <Button 
            variant="outline" 
            onClick={handleGoogleSignUp} 
            disabled={googleLoading}
            className="mt-6 w-full max-w-sm flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" width="16" height="16">
              <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" fill="#4285F4"/>
            </svg>
            {googleLoading ? 'İşleniyor...' : 'Google ile Kayıt Ol'}
          </Button>

          <div className="my-4 text-xs text-muted-foreground">
            Google ile kayıt olduğunuzda, Üyelik Sözleşmesi ve KVKK Sözleşmesi şartlarını kabul etmiş sayılırsınız.
          </div>

          <div className="relative mt-2 w-full max-w-sm">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Veya e-posta ile kayıt ol
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
                        placeholder='example@gmail.com'
                        type='email'
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
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='*******' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirm'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre Tekrar</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='*******' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Yeni First Name ve Last Name alanları */}
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İsim</FormLabel>
                    <FormControl>
                      <Input placeholder='İsim' type='text' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soyisim</FormLabel>
                    <FormControl>
                      <Input placeholder='Soyisim' type='text' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Onay checkboxları */}
              <div className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="marketingConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Ticari elektronik ileti, e-posta, sms ve arama metnini okudum, onaylıyorum. Tarafınızdan gönderilecek bilgilendirmeleri almak istiyorum.
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="userAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          <Link href="/uyelik-sozlesmesi" className="text-primary hover:underline" target="_blank">
                            Üyelik Sözleşmesi
                          </Link>&apos;ni okudum ve kabul ediyorum.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="kvkkAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          <Link href="/kvkk-sozlesmesi" className="text-primary hover:underline" target="_blank">
                            KVKK Sözleşmesi
                          </Link>&apos;ni okudum ve kabul ediyorum.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Captcha */}
              <FormField
                control={form.control}
                name="captcha"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <ReCAPTCHA
                        sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test key, replace with your actual key
                        onChange={onCaptchaChange}
                      />
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
                {isLoading ? 'Kayıt Yapılıyor...' : 'KAYIT OL'}
              </Button>
              <div className='mt-5 w-full text-center text-xs font-light text-foreground/50'>
                Zaten bir hesabınız var mı? 
                <Button
                  type='button'
                  variant='link'
                  className='p-0 text-xs text-primary'
                  onClick={() => router.push('/giris-yap')}
                >
                  Giriş yap
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </>
  )
}

export default SignUp
