import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'

// khung chung: header (logo + vung ben phai) va noi dung trang
export default function AppLayout({ right }: { right?: ReactNode }) {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          StudySpace
        </Link>
        <div className="app-header-right">{right}</div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
