import { MainLayoutProps } from '@/lib/types'
import { Navbar } from './Navbar'
import Footer from './Footer'
import ScrollToTopButton from './ScrollToTopButton'

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <Navbar />
      {children}
      <ScrollToTopButton />
      <Footer />
    </>
  )
}
