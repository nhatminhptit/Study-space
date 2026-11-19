import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessage } from '../../services/http'
import { useAuth } from './AuthContext'
import './auth.css'

const MIN_PASSWORD = 6

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  // kiem tra phia client truoc khi goi API
  function validate(): string {
    if (!form.name.trim()) return 'Vui lòng nhập tên hiển thị'
    if (form.password.length < MIN_PASSWORD) return `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự`
    if (form.password !== form.confirm) return 'Mật khẩu nhập lại không khớp'
    return ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const invalid = validate()
    if (invalid) return setError(invalid)

    setLoading(true)
    setError('')
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/rooms', { replace: true })
    } catch (err) {
      // backend chua bat trung email rieng -> loi unique cua Prisma tra ve 500
      setError(errorMessage(err, { 409: 'Email đã được sử dụng', 500: 'Email đã được sử dụng hoặc server gặp lỗi' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center-page auth-page">
      <form className="card narrow" onSubmit={handleSubmit}>
        <div>
          <h1>Tạo tài khoản</h1>
          <p className="muted">Học nhóm, vẽ bảng trắng và ôn tập cùng AI</p>
        </div>

        <label className="field">
          <span>Tên hiển thị</span>
          <input autoComplete="name" required value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A" />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="ban@example.com"
          />
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={form.password}
            onChange={set('password')}
          />
        </label>
        <label className="field">
          <span>Nhập lại mật khẩu</span>
          <input type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>
        <p className="muted auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  )
}
