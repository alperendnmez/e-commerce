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
import axios from 'axios'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

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
    lastName: z.string().min(1, { message: 'Last name gerekli' })
  })
  .refine(data => data.password === data.confirm, {
    message: 'Şifreler Eşleşmiyor',
    path: ['confirm']
  })

function SignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof RegisterFormSchema>>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirm: '',
      firstName: '',
      lastName: ''
    }
  })

  const onSubmit = async (data: z.infer<typeof RegisterFormSchema>) => {
    setIsLoading(true)
    await axios
      .post(`/api/auth/signup`, {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirm,
        firstName: data.firstName,
        lastName: data.lastName
      })
      .then(response => {
        if (response.status === 201) {
          toast({
            title: 'Kayıt Başarılı',
            description: 'Başarı ile kayıt oluşturuldu. Giriş yapabilirsiniz.'
          })
          router.push('/giris-yap') // Giriş sayfasına yönlendir
        }
      })
      .catch(error => {
        console.log(error)
        toast({
          title: 'Hata!',
          description:
            error?.response?.data?.error || 'Bilinmeyen Bir Hata Oluştu'
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

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
              <Button
                className='mt-5 w-full'
                type='submit'
                disabled={isLoading}
              >
                {isLoading ? 'Kayıt Yapılıyor...' : 'KAYIT OL'}
              </Button>
              <div className='mt-5 w-full text-center text-xs font-light text-foreground/50'>
                &quot;Kayıt ol&quot; düğmesine tıkladığında Furnico&apos;ın{' '}
                <Button
                  type='button'
                  variant='ghost'
                  className='p-0 text-xs text-primary hover:bg-transparent'
                  onClick={() =>
                    router.push('/hizmet-kosullari-ve-gizlilik-sozlesmesi')
                  }
                >
                  Kullanım Şartlarını ve Gizlilik Politikasını
                </Button>{' '}
                kabul edersin.
              </div>
            </form>
          </Form>
        </div>
      </main>
    </>
  )
}

export default SignUp
