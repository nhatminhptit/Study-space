import { API_URL, TOKEN_STORAGE_KEY } from '../config'

// loi tu backend, giu lai status de tung man hinh tu dich thong bao
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

let onUnauthorized: (() => void) | null = null

// AuthProvider dang ky ham nay de tu dang xuat khi token het han (401)
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

// goi API JSON; body la FormData thi gui multipart
export async function request<T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, `Không kết nối được server tại ${API_URL}. Server đã chạy chưa?`)
  }

  if (res.status === 401 && token) onUnauthorized?.()
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
  if (res.status === 204) return undefined as T

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// NestJS tra loi dang { statusCode, message, error }
async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '')
  try {
    const { message } = JSON.parse(raw) as { message?: string | string[] }
    if (message) return Array.isArray(message) ? message.join(', ') : message
  } catch {
    // khong phai JSON
  }
  return raw.slice(0, 200) || `Lỗi ${res.status}`
}

// lay thong bao loi de hien thi cho nguoi dung
export function errorMessage(err: unknown, byStatus: Record<number, string> = {}): string {
  if (err instanceof ApiError) return byStatus[err.status] ?? err.message
  if (err instanceof Error) return err.message
  return String(err)
}
