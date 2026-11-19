import { useNavigate } from 'react-router'
import { useAuth } from '../features/auth/AuthContext'
import Avatar from './Avatar'

// goc phai header: ten nguoi dung + nut dang xuat
export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div className="user-menu">
      <Avatar name={user.name} />
      <span className="user-name" title={user.email}>
        {user.name}
      </span>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          logout()
          navigate('/login')
        }}
      >
        Đăng xuất
      </button>
    </div>
  )
}
