import { Session } from 'next-auth'

/**
 * Oturumun bir admin kullanıcısına ait olup olmadığını kontrol eder
 */
export function isAdmin(session?: Session | null): boolean {
  if (!session || !session.user) return false
  return session.user.role === 'ADMIN'
}

/**
 * Oturumun bir moderatör kullanıcısına ait olup olmadığını kontrol eder
 */
export function isModerator(session?: Session | null): boolean {
  if (!session || !session.user) return false
  return session.user.role === 'MODERATOR' || session.user.role === 'ADMIN'
}

/**
 * Kullanıcının belirli bir kaynağa erişim yetkisini kontrol eder
 */
export function hasAccess(session?: Session | null, resourceUserId?: number | string): boolean {
  if (!session || !session.user) return false
  
  // Admin her şeye erişebilir
  if (isAdmin(session)) return true
  
  // Kullanıcı sadece kendi kaynaklarına erişebilir
  if (typeof resourceUserId === 'string' && typeof session.user.id === 'string') {
    return session.user.id === resourceUserId
  }
  
  if (typeof resourceUserId === 'number' && typeof session.user.id === 'number') {
    return session.user.id === resourceUserId
  }
  
  return false
}

/**
 * Varsa, kullanıcı kimliğini döndürür
 */
export function getUserId(session?: Session | null): string | number | null {
  if (!session || !session.user || !session.user.id) return null
  return session.user.id
} 