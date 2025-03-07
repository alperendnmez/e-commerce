import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import {
  armChairs,
  bedroomSets,
  complementaryFurnishings,
  diningRoomSets,
  teenagerGroups
} from '@/fakedata/navBarCategories'
import React from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function Categories() {
  return (
    <div className='mx-auto'>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='text-xs uppercase tracking-wider'>
              Koltuklar
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] '>
                {armChairs.map(armChair => (
                  <ListItem
                    key={armChair.title}
                    title={armChair.title}
                    href={armChair.href}
                  >
                    <ul className='py-1'>
                      {armChair.subCategories.map(subCategory => (
                        <li key={subCategory.title}>{subCategory.title}</li>
                      ))}
                    </ul>
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='text-xs uppercase tracking-wider'>
              Yemek Odası
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] '>
                {diningRoomSets.map(diningRoomSet => (
                  <ListItem
                    key={diningRoomSet.title}
                    title={diningRoomSet.title}
                    href={diningRoomSet.href}
                  >
                    <ul className='py-1'>
                      {diningRoomSet.subCategories.map(subCategory => (
                        <li key={subCategory.title}>{subCategory.title}</li>
                      ))}
                    </ul>
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='text-xs uppercase tracking-wider'>
              Yatak Odası
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] '>
                {bedroomSets.map(bedroomSet => (
                  <ListItem
                    key={bedroomSet.title}
                    title={bedroomSet.title}
                    href={bedroomSet.href}
                  >
                    <ul className='py-1'>
                      {bedroomSet.subCategories.map(subCategory => (
                        <li key={subCategory.title}>{subCategory.title}</li>
                      ))}
                    </ul>
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='text-xs uppercase tracking-wider'>
              Tamamlayıcı Mobilya
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] '>
                {complementaryFurnishings.map(complementaryFurnishing => (
                  <ListItem
                    key={complementaryFurnishing.title}
                    title={complementaryFurnishing.title}
                    href={complementaryFurnishing.href}
                  >
                    <ul className='py-1'>
                      {complementaryFurnishing.subCategories.map(
                        subCategory => (
                          <li key={subCategory.title}>{subCategory.title}</li>
                        )
                      )}
                    </ul>
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='text-xs uppercase tracking-wider'>
              Genç Odası
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] '>
                {teenagerGroups.map(teenagerGroup => (
                  <ListItem
                    key={teenagerGroup.title}
                    title={teenagerGroup.title}
                    href={teenagerGroup.href}
                  >
                    <ul className='py-1'>
                      {teenagerGroup.subCategories.map(subCategory => (
                        <li key={subCategory.title}>{subCategory.title}</li>
                      ))}
                    </ul>
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href='/docs' legacyBehavior passHref>
              <NavigationMenuLink
                className={
                  navigationMenuTriggerStyle() +
                  ' text-xs uppercase tracking-wider text-primary'
                }
              >
                Kampanyalar
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          {...props}
        >
          <div className='text-sm font-medium leading-none'>{title}</div>
          <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})

ListItem.displayName = 'ListItem'
