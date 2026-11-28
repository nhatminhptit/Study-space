import { request } from './http'

export const MAX_MESSAGE_LENGTH = 2000

export interface ChatMessage {
  id: number
  roomId: number
  userId: number
  content: string
  createdAt: string
  user: { id: number; name: string }
  clientId?: string
}

export interface OnlineUser {
  userId: number
  name: string
}

// tin hien tren man hinh: da luu (co id) hoac dang gui / gui loi (chua co id)
export type ChatItem = Omit<ChatMessage, 'id'> & {
  key: string
  id?: number
  status?: 'sending' | 'failed'
}

export type SendAck = { ok: true; message: ChatMessage } | { ok: false; error: string }
export type JoinAck = { ok: true; users: OnlineUser[] } | { ok: false; error: string }

// GET /rooms/:id/messages -> lich su chat (cu -> moi)
export function fetchMessages(roomId: number, limit = 50) {
  return request<ChatMessage[]>(`/rooms/${roomId}/messages?limit=${limit}`)
}

export function toItem(message: ChatMessage): ChatItem {
  return { ...message, key: `m-${message.id}` }
}

/*
 * Them tin da luu vao danh sach: neu trung clientId voi tin dang gui thi thay the,
 * neu da co (trung id) thi bo qua de khong hien 2 lan.
 */
export function upsertMessage(list: ChatItem[], message: ChatMessage): ChatItem[] {
  if (list.some((m) => m.id === message.id)) return list
  const item = toItem(message)
  if (message.clientId) {
    const i = list.findIndex((m) => m.key === message.clientId)
    if (i !== -1) return list.map((m, j) => (j === i ? item : m))
  }
  return [...list, item]
}

// ghep lich su tai ve voi cac tin da nhan qua socket trong luc dang tai
export function mergeHistory(history: ChatMessage[], current: ChatItem[]): ChatItem[] {
  const ids = new Set(history.map((m) => m.id))
  return [...history.map(toItem), ...current.filter((m) => m.id === undefined || !ids.has(m.id))]
}

let seq = 0
export function newClientId(): string {
  seq += 1
  return `tmp-${Date.now().toString(36)}-${seq}`
}
