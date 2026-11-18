import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { errorMessage } from '../../services/http'
import { getRoom, type Room } from '../../services/rooms'
import RoomWorkspace from './RoomWorkspace'

// tai thong tin phong (uu tien du lieu truyen qua dieu huong) roi mo khong gian lam viec
export default function RoomPage() {
  const id = Number(useParams().roomId)
  const passed = (useLocation().state as { room?: Room } | null)?.room
  const initial = passed?.id === id ? passed : undefined

  const [fetched, setFetched] = useState<{ id: number; room: Room | null } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial || !Number.isFinite(id)) return
    let cancelled = false
    getRoom(id)
      .then((room) => !cancelled && setFetched({ id, room: room ?? null }))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [id, initial])

  const room = initial ?? (fetched?.id === id ? fetched.room : undefined)

  if (error || room === null || !Number.isFinite(id)) {
    return (
      <div className="center-page">
        <div className="card narrow">
          <h2>Không vào được phòng</h2>
          <p className="muted">{error || 'Phòng không tồn tại hoặc đã bị xoá.'}</p>
          <Link to="/rooms" className="button primary">
            Về danh sách phòng
          </Link>
        </div>
      </div>
    )
  }

  if (!room) return <div className="placeholder">Đang tải phòng…</div>

  return <RoomWorkspace key={room.id} room={room} />
}
