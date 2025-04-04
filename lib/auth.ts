// Önceki konfigürasyon artık kullanılmıyor
// Bu dosya şimdi ana NextAuth konfigürasyon dosyasından options objesini re-export ediyor

// Ana NextAuth konfigürasyonu buradan alınıyor
import { options } from '@/pages/api/auth/[...nextauth]';

// Tüm eski konfigürasyon kaldırıldı ve tek bir source-of-truth kullanılıyor
export const authOptions = options;
export default options; 