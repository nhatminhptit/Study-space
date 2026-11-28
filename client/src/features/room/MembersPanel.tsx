import Avatar from '../../components/Avatar'
import type { OnlineUser } from '../../services/chat'
import type { Room } from '../../services/rooms'
import { useAuth } from '../auth/AuthContext'

// danh sach thanh vien cua phong (lay tu response tao/vao phong) kem trang thai online
export default function MembersPanel({ room, online = [] }: { room: Room; online?: OnlineUser[] }) {
  const { user } = useAuth()
  const onlineIds = new Set(online.map((u) => u.userId))
  const members = room.members ?? []
  // response danh sach phong khong co members -> bo sung tu danh sach online
  const known = new Set(members.map((m) => m.id))
  const all = [
    ...members.map((m) => ({ id: m.id, name: m.name })),
    ...online.filter((u) => !known.has(u.userId)).map((u) => ({ id: u.userId, name: u.name })),
  ].sort((a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id)))

  if (all.length === 0) {
    return <p className="muted members">Chưa có danh sách thành viên.</p>
  }

  return (
    <div className="members">
      <h4>
        Thành viên · {onlineIds.size} online{members.length > 0 && ` / ${members.length}`}
      </h4>
      <ul>
        {all.map((m) => {
          const isOnline = onlineIds.has(m.id)
          return (
            <li key={m.id} className={isOnline ? 'online' : 'offline'}>
              <span className="member-avatar">
                <Avatar name={m.name} size={28} />
                <span className={`presence-dot ${isOnline ? 'on' : ''}`} />
              </span>
              <span className="member-name">
                {m.name}
                {m.id === user?.id && <em> (bạn)</em>}
              </span>
              <span className="member-status">{isOnline ? 'Đang online' : 'Offline'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
