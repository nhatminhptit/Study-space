import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Avatar from '../../components/Avatar'
import { MAX_MESSAGE_LENGTH, type ChatMessage, type OnlineUser } from '../../services/chat'
import { colorFor } from '../../utils/identity'
import { useAuth } from '../auth/AuthContext'
import OnlineUsers from './OnlineUsers'
import { useRoomChat } from './useRoomChat'
import './chat.css'

// 2 tin lien tiep cua cung 1 nguoi trong khoang nay thi gop nhom (an avatar/ten)
const GROUP_WINDOW_MS = 5 * 60 * 1000

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

const dayOf = (iso: string) => new Date(iso).toLocaleDateString('vi-VN')

interface Props {
  roomId: number
  online: OnlineUser[]
  connected: boolean
  active?: boolean
  onIncoming?: (message: ChatMessage) => void
}

// khung chat cua phong: dai online + danh sach tin + o nhap
export default function ChatPanel({ roomId, online, connected, active = true, onIncoming }: Props) {
  const { user } = useAuth()
  const { messages, loading, loadError, send, retry, reload } = useRoomChat(roomId, user, onIncoming)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // tu cuon xuong cuoi neu nguoi dung dang o cuoi danh sach
  useLayoutEffect(() => {
    const el = listRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, active])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!draft.trim() || !connected) return
    stickToBottom.current = true
    send(draft)
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="chat">
      <OnlineUsers users={online} connected={connected} meId={user?.id} />

      <div
        className="chat-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
      >
        {loading && messages.length === 0 && <p className="muted chat-empty">Đang tải tin nhắn…</p>}

        {loadError && (
          <div className="chat-error">
            {loadError}
            <button type="button" className="ghost" onClick={reload}>
              Thử lại
            </button>
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <p className="muted chat-empty">Chưa có tin nhắn. Hãy chào mọi người trong phòng 👋</p>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const newDay = !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt)
          const grouped =
            !newDay &&
            prev?.userId === m.userId &&
            Date.parse(m.createdAt) - Date.parse(prev.createdAt) < GROUP_WINDOW_MS
          const mine = m.userId === user?.id
          return (
            <div key={m.key} className="msg-row">
              {newDay && <div className="chat-day">{dayOf(m.createdAt)}</div>}
              <div className={`msg ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''} ${m.status ?? ''}`}>
                {!mine && <div className="msg-avatar">{!grouped && <Avatar name={m.user.name} size={28} />}</div>}
                <div className="msg-body">
                  {!grouped && (
                    <div className="msg-meta">
                      {!mine && (
                        <strong style={{ color: colorFor(m.user.name) }} className="msg-name">
                          {m.user.name}
                        </strong>
                      )}
                      <time dateTime={m.createdAt}>{timeOf(m.createdAt)}</time>
                    </div>
                  )}
                  <div className="msg-bubble">{m.content}</div>
                  {m.status === 'sending' && <span className="msg-status">Đang gửi…</span>}
                  {m.status === 'failed' && (
                    <button type="button" className="msg-status failed" onClick={() => retry(m.key)}>
                      Gửi lỗi · Thử lại
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <form className="chat-input" onSubmit={submit}>
        <textarea
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={connected ? 'Nhập tin nhắn… (Enter để gửi)' : 'Mất kết nối, chưa gửi được tin'}
          aria-label="Tin nhắn"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="primary" disabled={!draft.trim() || !connected}>
          Gửi
        </button>
      </form>
    </div>
  )
}
