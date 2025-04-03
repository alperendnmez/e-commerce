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
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const SignInFormSchema = z.object({
  email: z.string().email('Lütfen geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı')
})

function SignInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  console.log(session, status, "hellooo")
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
        callbackUrl: '/dashboard',
        redirect: false
      })
      
      console.log("Giriş sonucu:", result);
      
      if (result?.error) {
        toast({ 
          title: 'Giriş Hatası!', 
          description: `Hata: ${result.error}`,
          variant: 'destructive'
        })
      } else if (result?.url) {
        // Başarılı girişten sonra belirtilen URL'e yönlendir
        router.push(result.url);
      }
    } catch (error) {
      console.error("Giriş sırasında beklenmeyen hata:", error);
      toast({ 
        title: 'Beklenmeyen Hata!', 
        description: `Beklenmeyen bir hata oluştu: ${error}`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='mt-4 w-full max-w-sm space-y-4'
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
                    <FormLabel>Şifre</FormLabel>
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
                  onClick={() => router.push('/auth/signup')}
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
