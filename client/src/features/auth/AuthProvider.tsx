import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../../services/auth'
import { getToken, setUnauthorizedHandler } from '../../services/http'
import { AuthContext, type AuthState } from './AuthContext'
import { rememberName, saveToken, tokenExpiresAt, userFromToken } from './session'

// doc token da luu, bo qua neu het han hoac hong
function initialToken(): string | null {
  const token = getToken()
  if (token && userFromToken(token)) return token
  saveToken(null)
  return null
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(initialToken)
  const user = useMemo(() => (token ? userFromToken(token) : null), [token])

  const applyToken = useCallback((next: string | null) => {
    saveToken(next)
    setToken(next)
  }, [])

  const logout = useCallback(() => applyToken(null), [applyToken])

  const login = useCallback<AuthState['login']>(
    async (input) => {
      const { access_token } = await authApi.login(input)
      applyToken(access_token)
    },
    [applyToken],
  )

  // dang ky xong thi dang nhap luon cho nguoi dung
  const register = useCallback<AuthState['register']>(
    async (input) => {
      const user = await authApi.register(input)
      rememberName(user.email, user.name)
      const { access_token } = await authApi.login({ email: input.email, password: input.password })
      applyToken(access_token)
    },
    [applyToken],
  )

  // API tra 401 -> token khong con hop le -> dang xuat
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // tu dang xuat dung luc token het han
  useEffect(() => {
    const expiresAt = token ? tokenExpiresAt(token) : null
    if (!expiresAt) return
    const timer = window.setTimeout(logout, Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [token, logout])

  const value = useMemo<AuthState>(
    () => ({ user, token, login, register, logout }),
    [user, token, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
