import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

// chi cho vao khi da dang nhap, neu chua thi chuyen ve /login va nho trang dang muon vao
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

// trang login/register: da dang nhap roi thi vao thang danh sach phong
export function GuestOnly() {
  const { user } = useAuth()
  if (user) return <Navigate to="/rooms" replace />
  return <Outlet />
}
