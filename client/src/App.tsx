import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout'
import UserMenu from './components/UserMenu'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import { GuestOnly, RequireAuth } from './features/auth/guards'
import NotFoundPage from './pages/NotFoundPage'
import RoomPage from './features/room/RoomPage'
import RoomsPage from './features/rooms/RoomsPage'
import './App.css'

// so do dieu huong cua ung dung
function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout right={<UserMenu />} />}>
          <Route index element={<Navigate to="/rooms" replace />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="rooms/:roomId" element={<RoomPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
