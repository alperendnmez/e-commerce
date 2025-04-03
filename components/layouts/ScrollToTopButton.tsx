import { ChevronUpSquare } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Variants,
  useAnimationControls,
  useScroll,
  motion
} from 'framer-motion'
import { useEffect } from 'react'

const ScrollToTopContainerVariants: Variants = {
  hide: { opacity: 0, y: 100 },
  show: { opacity: 1, y: 0 }
}

export default function ScrollToTopButton() {
  const isBrowser = () => typeof window !== 'undefined'
  const { scrollYProgress } = useScroll()
  const controls = useAnimationControls()

  useEffect(() => {
    return scrollYProgress.on('change', latestValue => {
      if (latestValue > 0.5) {
        controls.start('show')
      } else {
        controls.start('hide')
      }
    })
  })

  function scrollToTop() {
    if (!isBrowser()) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const MotionButton = motion.create(Button)

  return (
    <MotionButton
      variant={'link'}
      className='fixed bottom-0 right-0 z-50 mb-4'
      variants={ScrollToTopContainerVariants}
      initial='hide'
      animate={controls}
      onClick={scrollToTop}
    >
      <ChevronUpSquare strokeWidth={1.25} size={40} />
    </MotionButton>
  )
}
