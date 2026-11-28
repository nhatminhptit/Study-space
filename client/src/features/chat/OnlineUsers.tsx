import Avatar from '../../components/Avatar'
import type { OnlineUser } from '../../services/chat'

const MAX_SHOWN = 6

// dai avatar nguoi dang online o dau khung chat
export default function OnlineUsers({
  users,
  connected,
  meId,
}: {
  users: OnlineUser[]
  connected: boolean
  meId?: number
}) {
  if (!connected) {
    return (
      <div className="online-bar offline" role="status">
        <span className="online-dot off" /> Mất kết nối, đang thử kết nối lại…
      </div>
    )
  }

  const shown = users.slice(0, MAX_SHOWN)
  const names = users.map((u) => (u.userId === meId ? `${u.name} (bạn)` : u.name)).join(', ')

  return (
    <div className="online-bar" role="status" title={names}>
      <span className="online-dot" />
      <span className="online-count">{users.length} đang online</span>
      <span className="online-avatars">
        {shown.map((u) => (
          <span key={u.userId} className="online-avatar">
            <Avatar name={u.name} size={22} />
          </span>
        ))}
        {users.length > MAX_SHOWN && <span className="online-more">+{users.length - MAX_SHOWN}</span>}
      </span>
    </div>
  )
}
