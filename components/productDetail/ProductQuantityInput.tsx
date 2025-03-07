import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

function ProductQuantityInput() {
  const [quantity, setQuantity] = React.useState(1)

  const handleIncrease = () => {
    setQuantity(quantity + 1)
  }

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  return (
    <div>
      <div className='mb-5 flex justify-between gap-2'>
        <div className='relative flex-initial'>
          <Button
            className='absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 transform bg-background text-center text-muted-foreground shadow-none hover:bg-transparent'
            onClick={handleDecrease}
          >
            -
          </Button>
          <Input
            className='h-12 w-32 p-0 pl-6 pr-2 text-center'
            type='number'
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value))}
          />
          <Button
            className='absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 transform bg-background text-center text-muted-foreground shadow-none hover:bg-transparent'
            onClick={handleIncrease}
          >
            +
          </Button>
        </div>
        <Button className='h-12 w-full flex-initial '>Sepete Ekle</Button>
        <Button className='h-12 w-16 flex-initial border border-input bg-background text-foreground !shadow-none hover:text-primary-foreground'>
          <Heart />
        </Button>
      </div>
      <Button className='mb-5 h-12 w-full flex-initial border border-input bg-background tracking-wider text-foreground !shadow-none hover:text-primary-foreground'>
        Şimdi satın al
      </Button>
    </div>
  )
}

export default ProductQuantityInput
