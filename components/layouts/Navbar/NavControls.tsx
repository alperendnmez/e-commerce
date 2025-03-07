import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, ShoppingBag, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  searchInput: z.string().min(2, {
    message: 'searchInput must be at least 2 characters.'
  })
})

export default function NavControls() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      searchInput: ''
    }
  })
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }
  return (
    <div className='flex w-max flex-1 items-center justify-end gap-4'>
      <Sheet>
        <SheetTrigger asChild>
          <Search
            size={20}
            strokeWidth={1.25}
            className='hover:text-primary'
            absoluteStrokeWidth
          />
        </SheetTrigger>
        <SheetContent side='top'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='mx-auto max-w-3xl space-y-8 py-16'
            >
              <FormField
                control={form.control}
                name='searchInput'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-2xl font-light'>
                      Ne aramıştınız ?
                    </FormLabel>
                    <FormControl className=''>
                      <div className='flex items-center gap-2 border-b border-primary'>
                        <Input
                          placeholder='Ürünleri ara...'
                          {...field}
                          className='border-0 pl-0 shadow-none focus-visible:ring-0'
                        />
                        <button type='submit'>
                          <Search
                            size={20}
                            strokeWidth={1.25}
                            className='hover:text-primary'
                            absoluteStrokeWidth
                          />
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Link href='/profile'>
        <UserRound
          size={20}
          strokeWidth={1.25}
          className='hover:text-primary'
          absoluteStrokeWidth
        />
      </Link>
      <Link href='/cart' className='relative'>
        <ShoppingBag
          size={20}
          strokeWidth={1.25}
          className='hover:text-primary'
          absoluteStrokeWidth
        />
        <span className='absolute -right-2 -top-3 flex items-center justify-center'>
          <Badge className='rounded-full px-1 py-0 font-thin'>2</Badge>
        </span>
      </Link>
    </div>
  )
}
