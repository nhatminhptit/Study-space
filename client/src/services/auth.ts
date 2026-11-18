import { request } from './http'

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

// POST /auth/login -> { access_token }
export function login(input: LoginInput) {
  return request<{ access_token: string }>('/auth/login', { method: 'POST', body: input, auth: false })
}

// POST /auth/register -> user vua tao (chi lay cac truong can thiet)
export async function register(input: RegisterInput) {
  const user = await request<{ id: number; name: string; email: string }>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  })
  return { id: user.id, name: user.name, email: user.email }
}
