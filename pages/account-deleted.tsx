import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AccountDeletedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const { requestOnly } = router.query;
  
  // Geri sayım ve otomatik yönlendirme
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white shadow-lg rounded-lg text-center">
        {requestOnly === 'true' ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Hesap Silme Talebiniz Alındı
            </h1>
            <p className="text-gray-600 mb-6">
              Hesap silme talebiniz yöneticilerimize iletilmiştir. En kısa sürede işleme alınacak ve 
              tarafınıza bilgilendirme e-postası gönderilecektir.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Hesabınız Silindi
            </h1>
            <p className="text-gray-600 mb-6">
              Hesabınız ve ilişkili tüm verileriniz başarıyla silinmiştir. Bizi tercih ettiğiniz için teşekkür ederiz.
            </p>
          </>
        )}
        
        <p className="text-sm text-gray-500 mb-6">
          {countdown} saniye içinde ana sayfaya yönlendirileceksiniz.
        </p>
        
        <Button asChild className="w-full">
          <Link href="/">Ana Sayfaya Dön</Link>
        </Button>
      </div>
    </div>
  );
} 