import { createContext, useContext } from 'react'
import type { LoginInput, RegisterInput } from '../../services/auth'
import type { CurrentUser } from './session'

export interface AuthState {
  user: CurrentUser | null
  token: string | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>')
  return ctx
}
