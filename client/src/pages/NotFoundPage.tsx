import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="center-page">
      <div className="card narrow">
        <h1>404</h1>
        <p className="muted">Không tìm thấy trang bạn cần.</p>
        <Link to="/" className="button primary">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
