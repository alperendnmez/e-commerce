import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    // SSR için kontrol
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia(query)
    
    // İlk değeri ayarla
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    
    // Değişiklikleri dinle
    const listener = () => setMatches(media.matches)
    
    // Modern API kullanımı
    if (media.addEventListener) {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      // Eski tarayıcılar için destek
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [matches, query])

  return matches
}

export default useMediaQuery 