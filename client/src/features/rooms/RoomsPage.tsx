import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { errorMessage } from '../../services/http'
import { createRoom, enterRoomByCode, listRooms, memberCount, type Room } from '../../services/rooms'
import CopyButton from '../../components/CopyButton'
import './rooms.css'

const JOIN_ERRORS = { 404: 'Không tìm thấy phòng với mã này' }

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

// trang danh sach phong: tao phong, vao phong bang ma, tim kiem
export default function RoomsPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')

  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | number | null>(null)

  // tai danh sach phong; doi reloadKey de tai lai
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    listRooms()
      .then((data) => !cancelled && setRooms(data))
      .catch((err: unknown) => !cancelled && setLoadError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setLoadError('')
    setRooms(null)
    setReloadKey((k) => k + 1)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...(rooms ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return q ? list.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) : list
  }, [rooms, query])

  const openRoom = (room: Room) => navigate(`/rooms/${room.id}`, { state: { room } })

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy('create')
    setFormError('')
    try {
      openRoom(await createRoom(newName.trim()))
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(null)
    }
  }

  async function enter(code: string, key: 'join' | number) {
    setBusy(key)
    setFormError('')
    try {
      openRoom(await enterRoomByCode(code))
    } catch (err) {
      setFormError(errorMessage(err, JOIN_ERRORS))
      setBusy(null)
    }
  }

  return (
    <div className="rooms-page">
      <section className="rooms-actions">
        <form className="card" onSubmit={handleCreate}>
          <h3>Tạo phòng mới</h3>
          <p className="muted">Mời bạn bè vào học bằng mã phòng</p>
          <div className="inline-form">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="VD: Ôn thi Mạng máy tính"
              maxLength={80}
              required
            />
            <button type="submit" className="primary" disabled={busy !== null}>
              {busy === 'create' ? 'Đang tạo…' : 'Tạo phòng'}
            </button>
          </div>
        </form>

        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            if (joinCode.trim()) void enter(joinCode, 'join')
          }}
        >
          <h3>Vào phòng bằng mã</h3>
          <p className="muted">Nhập mã 6 ký tự bạn được chia sẻ</p>
          <div className="inline-form">
            <input
              className="code-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              required
            />
            <button type="submit" disabled={busy !== null}>
              {busy === 'join' ? 'Đang vào…' : 'Vào phòng'}
            </button>
          </div>
        </form>
      </section>

      {formError && <p className="error">{formError}</p>}

      <section className="rooms-list">
        <div className="rooms-list-header">
          <h2>Phòng học</h2>
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã…"
          />
        </div>

        {loadError ? (
          <div className="card empty">
            <p className="error">{loadError}</p>
            <button type="button" onClick={reload}>
              Thử lại
            </button>
          </div>
        ) : rooms === null ? (
          <div className="room-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card room-card skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card empty">
            <p className="muted">
              {rooms.length === 0 ? 'Chưa có phòng nào. Hãy tạo phòng đầu tiên!' : 'Không có phòng khớp tìm kiếm.'}
            </p>
          </div>
        ) : (
          <div className="room-grid">
            {filtered.map((room) => (
              <article key={room.id} className="card room-card">
                <div className="room-card-top">
                  <h3 title={room.name}>{room.name}</h3>
                  <span className="room-code">
                    {room.code}
                    <CopyButton text={room.code} label="Sao chép mã phòng" />
                  </span>
                </div>
                <p className="muted room-meta">
                  {memberCount(room)} thành viên · tạo ngày {formatDate(room.createdAt)}
                </p>
                <button
                  type="button"
                  className="primary"
                  disabled={busy !== null}
                  onClick={() => void enter(room.code, room.id)}
                >
                  {busy === room.id ? 'Đang vào…' : 'Vào phòng'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
