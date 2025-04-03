// pages/_app.tsx
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react' // SessionProvider'ı ekleyin
import { NextPageWithLayout } from '@/lib/types'
import { useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { CompareProvider } from '@/contexts/CompareContext'

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

// Basit bir hata fallback bileşeni
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-xl font-bold text-red-800 mb-2">Bir hata oluştu</h2>
      <p className="text-red-700 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Sayfayı Yenile
      </button>
    </div>
  )
}

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? (page => page)

  return (
    <SessionProvider session={session}>
      <CompareProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {getLayout(<Component {...pageProps} />)}
        </ErrorBoundary>
        <Toaster />
      </CompareProvider>
    </SessionProvider>
  )
}
