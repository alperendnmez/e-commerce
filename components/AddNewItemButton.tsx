import React from 'react'
import { Button } from './ui/button'
import { Plus } from 'lucide-react'
import { DialogTrigger } from './ui/dialog'

function AddNewItemButton({ text }: { text: string }) {
  return (
    <DialogTrigger asChild>
      <Button variant={'outline'} className=''>
        <Plus className='text-emerald-500' />
        {text}
      </Button>
    </DialogTrigger>
  )
}

export default AddNewItemButton
