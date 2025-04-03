import React from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart } from 'lucide-react'

interface ProductQuantityInputProps {
  quantity: number;
  setQuantity: (quantity: number) => void;
  max?: number;
  min?: number;
}

function ProductQuantityInput({ 
  quantity, 
  setQuantity, 
  max = 100, 
  min = 1 
}: ProductQuantityInputProps) {
  
  const decreaseQuantity = () => {
    if (quantity > min) {
      setQuantity(quantity - 1)
    }
  }

  const increaseQuantity = () => {
    if (!max || quantity < max) {
      setQuantity(quantity + 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value)
    if (!isNaN(newValue)) {
      if (newValue < min) {
        setQuantity(min)
      } else if (max && newValue > max) {
        setQuantity(max)
      } else {
        setQuantity(newValue)
      }
    }
  }

  return (
    <div>
      <div className='mb-5 flex justify-between gap-2'>
        <div className='flex h-14 w-max items-center justify-start overflow-hidden rounded-md border'>
          <Button
            size='icon'
            variant='ghost'
            className='h-14 rounded-none hover:bg-gray-100'
            onClick={decreaseQuantity}
            disabled={quantity <= min}
          >
            <Minus strokeWidth={1.2} />
          </Button>
          <Input
            type='number'
            value={quantity}
            onChange={handleInputChange}
            className='h-full w-14 border-none px-0 text-center focus-visible:ring-0'
          />
          <Button
            size='icon'
            variant='ghost'
            className='h-14 rounded-none hover:bg-gray-100'
            onClick={increaseQuantity}
            disabled={max !== undefined && quantity >= max}
          >
            <Plus strokeWidth={1.2} />
          </Button>
        </div>
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
