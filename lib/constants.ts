// Uygulama genelinde kullanılan sabitler

// Etiketleri ayırmak için kullanılan karakter
export const tagSeparator = ','

// Dosya boyutu sınırları (byte cinsinden)
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB

// Sayfalama için varsayılan değerler
export const DEFAULT_PAGE_SIZE = 10
export const DEFAULT_PAGE = 1

// Tarih formatları
export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm'

// Blog yazı durumları
export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SCHEDULED = 'SCHEDULED'
}

// İzin verilen dosya türleri
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]

// Görseller için boyut oranları
export const ASPECT_RATIOS = {
  BANNER: 1920 / 600, // 16:5
  FEATURED: 1200 / 630, // ~1.9:1
  SQUARE: 1, // 1:1
  PRODUCT: 3 / 4, // 3:4
}

// Bildirim türleri
export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

// API istek limitleri
export const API_RATE_LIMIT = {
  PUBLIC: 30, // 1 dakikada 30 istek
  AUTHENTICATED: 100, // 1 dakikada 100 istek
  ADMIN: 300 // 1 dakikada 300 istek
} 