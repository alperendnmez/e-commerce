import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

// Rastgele bir karakter kümesi - şaşırtıcı karakterler çıkarılmış (0, O, 1, I, vb.)
const SAFE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/**
 * Kullanıcı arayüzü sınıfları için utility fonksiyon
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Metni URL dostu bir slug'a dönüştürür
 * @param text Slugify edilecek metin
 * @returns URL dostu slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD') // normalize non-ASCII characters
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // boşlukları tire ile değiştir
    .replace(/[^\w\-]+/g, '') // alfanumerik olmayan karakterleri kaldır
    .replace(/\-\-+/g, '-') // çoklu tireleri tek tire ile değiştir
    .replace(/^-+/, '') // baştaki tireleri kaldır
    .replace(/-+$/, ''); // sondaki tireleri kaldır
}

/**
 * Para birimini formatlar
 * @param value Formatlanacak tutar
 * @param currency Para birimi (varsayılan TL)
 * @returns Formatlanmış para birimi
 */
export function formatCurrency(value: number): string {
  // Null veya undefined değer kontrolü
  if (value == null) {
    return "0,00 ₺"
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value)
}

/**
 * Güvenli rastgele kod üretir
 * @param length Kod uzunluğu
 * @param prefix Kod için ön ek (opsiyonel)
 * @returns Rastgele oluşturulmuş kod
 */
export function generateSecureRandomCode(length: number = 10, prefix: string = ''): string {
  let result = ''
  
  // Kriptografik güvenli rastgele baytlar üretme
  const randomBytes = crypto.randomBytes(length * 2) // Her karakter için 2 bayt
  
  // Rastgele karakterleri seç
  for (let i = 0; i < length; i++) {
    // Her baytı karakter kümesi uzunluğuna göre modülasyon yapıp karakter seç
    const randomIndex = randomBytes[i] % SAFE_CHARACTERS.length
    result += SAFE_CHARACTERS.charAt(randomIndex)
  }
  
  return prefix + result
}

/**
 * Hediye kartı kodu oluşturur
 * @returns Benzersiz hediye kartı kodu
 */
export function generateGiftCardCode(): string {
  const prefix = 'GIFT'
  const timestamp = Date.now().toString().slice(-4)
  return prefix + timestamp + generateSecureRandomCode(8)
}

/**
 * Kupon kodu oluşturur
 * @param prefix Kupon için ön ek (opsiyonel)
 * @returns Benzersiz kupon kodu
 */
export function generateCouponCode(prefix: string = ''): string {
  // Daha kısa ve hatırlanabilir olması için
  const randomPart = generateSecureRandomCode(8)
  return (prefix ? prefix + '-' : '') + randomPart
}

/**
 * Verilen karakterler için karakter kümesi oluşturarak karşılık tahmin olasılığını azaltır
 * @param code İşlenecek kod
 * @returns Karmaşıklaştırılmış kod
 */
export function obfuscateCode(code: string): string {
  return code.replace(/./g, (char) => {
    // Özel karakterler için karakter kümesi belirle
    const charMap: Record<string, string[]> = {
      'A': ['A', '4'],
      'B': ['B', '8'],
      'E': ['E', '3'],
      'G': ['G', '6'],
      'S': ['S', '5'],
      'I': ['I', '1'],
      'O': ['O', '0'],
      'Z': ['Z', '2']
    }
    
    // Eğer karakter kümesinde varsa, rastgele bir alternatif seç
    if (charMap[char]) {
      const alternatives = charMap[char]
      return alternatives[Math.floor(Math.random() * alternatives.length)]
    }
    
    return char
  })
}

/**
 * Bir kodun, birbirine benzeyen karakterler nedeniyle yanlış girilme olasılığını azaltır
 * @param code Temizlenecek kod
 * @returns Temizlenmiş kod
 */
export function sanitizeCodeInput(code: string): string {
  const sanitizeMap: Record<string, string> = {
    '0': 'O',
    'O': 'O',
    '1': 'I',
    'I': 'I',
    'l': 'I',
    '5': 'S',
    'S': 'S',
    '8': 'B',
    'B': 'B'
  }
  
  return code.toUpperCase().replace(/[0O1Il5S8B]/g, (char) => sanitizeMap[char])
}

/**
 * Tarihi formatlar
 * @param date Tarih
 * @returns Formatlanmış tarih
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
}
