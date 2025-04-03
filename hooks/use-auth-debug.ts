import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function useAuthDebug() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<{
    isAuthenticated: boolean;
    role: string | null;
    sessionData: any;
    lastChecked: string;
  }>({
    isAuthenticated: false,
    role: null,
    sessionData: null,
    lastChecked: ''
  });
  
  // Session durumunu izle ve debug bilgilerini güncelle
  useEffect(() => {
    // Client-side only to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      setDebugInfo({
        isAuthenticated: status === 'authenticated',
        role: session?.user?.role || null,
        sessionData: session,
        lastChecked: new Date().toISOString()
      });
    }
    
    console.log('Auth Debug:', {
      status,
      session,
      isAuthenticated: status === 'authenticated',
      role: session?.user?.role || null,
      time: new Date().toISOString()
    });
  }, [session, status]);

  // Admin rolünü kontrol et
  const isAdmin = status === 'authenticated' && session?.user?.role === 'ADMIN';
  
  return {
    isAuthenticated: status === 'authenticated',
    isAdmin,
    status,
    session,
    debugInfo
  };
} 