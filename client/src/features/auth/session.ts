import { PROFILE_STORAGE_KEY, TOKEN_STORAGE_KEY } from '../../config'

export interface CurrentUser {
  id: number
  email: string
  name: string
}

interface JwtPayload {
  sub: number
  email: string
  exp?: number
}

// giai ma phan payload cua JWT (khong kiem tra chu ky, chi de doc thong tin hien thi)
export function decodeToken(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload
    return typeof payload.sub === 'number' || typeof payload.sub === 'string' ? payload : null
  } catch {
    return null
  }
}

export function isExpired(payload: JwtPayload, now = Date.now()): boolean {
  return payload.exp !== undefined && payload.exp * 1000 <= now
}

// backend chua co API lay ten nguoi dung -> luu ten luc dang ky theo email
type ProfileMap = Record<string, string>

function readProfiles(): ProfileMap {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}') as ProfileMap
  } catch {
    return {}
  }
}

export function rememberName(email: string, name: string) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...readProfiles(), [email]: name }))
  } catch {
    // bo qua neu trinh duyet chan localStorage
  }
}

export function userFromToken(token: string): CurrentUser | null {
  const payload = decodeToken(token)
  if (!payload || isExpired(payload)) return null
  const name = readProfiles()[payload.email] || payload.email.split('@')[0]
  return { id: Number(payload.sub), email: payload.email, name }
}

export function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // bo qua
  }
}

export function tokenExpiresAt(token: string): number | null {
  const exp = decodeToken(token)?.exp
  return exp ? exp * 1000 : null
}
