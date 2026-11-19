import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import CopyButton from '../../components/CopyButton'
import type { Room } from '../../services/rooms'
import MembersPanel from './MembersPanel'
import './room.css'

type MainTab = 'whiteboard' | 'mindmap' | 'flashcard'
type SideTab = 'chat' | 'members'

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: 'whiteboard', label: 'Bảng trắng' },
  { id: 'mindmap', label: 'Sơ đồ tư duy' },
  { id: 'flashcard', label: 'Flashcard' },
]

function Placeholder({ title }: { title: string }) {
  return <div className="placeholder">{title} – đang phát triển</div>
}

/*
 * Khung khong gian hoc cua 1 phong: header phong, vung lam viec (tab) va sidebar.
 * Cac task sau gan component that vao: bang trang, mindmap, flashcard, chat.
 */
export default function RoomWorkspace({ room }: { room: Room }) {
  const [tab, setTab] = useState<MainTab>('whiteboard')
  // giu cac tab da mo de khong mat trang thai khi chuyen tab
  const [visited, setVisited] = useState<Set<MainTab>>(() => new Set(['whiteboard']))
  const [sideTab, setSideTab] = useState<SideTab>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900)

  function openTab(next: MainTab) {
    setTab(next)
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)))
  }

  function showSide(next: SideTab) {
    setSideTab(next)
    setSidebarOpen(true)
  }

  const panels: Record<MainTab, ReactNode> = {
    whiteboard: <Placeholder title="Bảng trắng" />,
    mindmap: <Placeholder title="Sơ đồ tư duy" />,
    flashcard: <Placeholder title="Flashcard" />,
  }

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-title">
          <Link to="/rooms" className="button ghost back" aria-label="Về danh sách phòng">
            ←
          </Link>
          <h2 title={room.name}>{room.name}</h2>
          <span className="room-code">
            {room.code}
            <CopyButton text={room.code} label="Sao chép mã phòng" />
          </span>
        </div>

        <div className="room-header-right">
          <button
            type="button"
            className={sidebarOpen ? 'primary' : ''}
            onClick={() => (sidebarOpen ? setSidebarOpen(false) : showSide(sideTab))}
            aria-pressed={sidebarOpen}
          >
            Chat
          </button>
        </div>
      </header>

      <nav className="room-tabs" role="tablist">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`room-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => openTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="room-body">
        <section className="room-stage">
          {MAIN_TABS.filter((t) => visited.has(t.id)).map((t) => (
            <div key={t.id} className="room-panel" hidden={tab !== t.id}>
              {panels[t.id]}
            </div>
          ))}
        </section>

        <aside className="room-sidebar" hidden={!sidebarOpen}>
          <div className="side-tabs">
            <button
              type="button"
              className={`room-tab ${sideTab === 'chat' ? 'active' : ''}`}
              onClick={() => showSide('chat')}
            >
              Chat
            </button>
            <button
              type="button"
              className={`room-tab ${sideTab === 'members' ? 'active' : ''}`}
              onClick={() => showSide('members')}
            >
              Thành viên
            </button>
            <button type="button" className="ghost close-sidebar" aria-label="Đóng" onClick={() => setSidebarOpen(false)}>
              ✕
            </button>
          </div>
          <div className="side-content">
            <div className="side-panel" hidden={sideTab !== 'chat'}>
              <Placeholder title="Chat" />
            </div>
            <div className="side-panel" hidden={sideTab !== 'members'}>
              <MembersPanel room={room} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
