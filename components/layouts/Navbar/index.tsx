'use client'

import Logo from './Logo'
import NavControls from './NavControls'
import Categories from './Categories'

export function Navbar() {
  return (
    <>
      <div className='sticky top-0 z-10'>
        <div className='bg-background py-6 shadow-background/80'>
          <div className='mx-auto flex max-w-[1440px] flex-wrap items-center px-6'>
            <Logo />
            <Categories />
            <NavControls />
          </div>
        </div>
      </div>
    </>
  )
}
