import Avatar from '../../components/Avatar'
import type { Room } from '../../services/rooms'
import { useAuth } from '../auth/AuthContext'

// danh sach thanh vien cua phong (lay tu response tao/vao phong)
export default function MembersPanel({ room }: { room: Room }) {
  const { user } = useAuth()
  const members = room.members ?? []

  if (members.length === 0) {
    return <p className="muted members">Chưa có danh sách thành viên.</p>
  }

  return (
    <div className="members">
      <h4>Thành viên · {members.length}</h4>
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            <Avatar name={m.name} size={28} />
            <span className="member-name">
              {m.name}
              {m.id === user?.id && <em> (bạn)</em>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
