import { Facebook, Linkedin, Twitter } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

function ProductShare() {
  return (
    <div>
      <div className='flex items-center'>
        <span className='text-zinc-400'> Share: </span>
        <Link href={'#'}>
          <Facebook
            size={25}
            strokeWidth={1.25}
            className='hover:text-primary'
            absoluteStrokeWidth
          />
        </Link>
        <Link href={'#'}>
          <Twitter
            size={25}
            strokeWidth={1.25}
            className='hover:text-primary'
            absoluteStrokeWidth
          />
        </Link>
        <Link href={'#'}>
          <Linkedin
            size={25}
            strokeWidth={1.25}
            className='hover:text-primary'
            absoluteStrokeWidth
          />
        </Link>
      </div>
    </div>
  )
}

export default ProductShare
