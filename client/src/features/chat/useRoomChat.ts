import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchMessages,
  mergeHistory,
  newClientId,
  upsertMessage,
  type ChatItem,
  type ChatMessage,
  type SendAck,
} from '../../services/chat'
import { errorMessage } from '../../services/http'
import { getSocket } from '../../services/socket'
import type { CurrentUser } from '../auth/session'

// thoi gian cho server xac nhan truoc khi coi la gui loi
const ACK_TIMEOUT_MS = 8000

/*
 * Tin nhan cua 1 phong: tai lich su qua REST, nhan tin moi qua socket.
 * Tin minh gui hien ngay (dang gui), server luu xong thi thay bang ban that.
 */
export function useRoomChat(roomId: number, me: CurrentUser | null, onIncoming?: (m: ChatMessage) => void) {
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const incomingRef = useRef(onIncoming)

  useEffect(() => {
    incomingRef.current = onIncoming
  }, [onIncoming])

  // lich su
  useEffect(() => {
    let cancelled = false
    fetchMessages(roomId)
      .then((history) => {
        if (cancelled) return
        setMessages((current) => mergeHistory(history, current))
        setLoadError('')
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err, { 403: 'Bạn không phải thành viên phòng này' }))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [roomId, reloadKey])

  // tin moi realtime
  useEffect(() => {
    const socket = getSocket()
    function onMessage(message: ChatMessage) {
      if (message.roomId !== roomId) return
      setMessages((list) => upsertMessage(list, message))
      if (message.userId !== me?.id) incomingRef.current?.(message)
    }
    socket.on('chat:message', onMessage)
    return () => {
      socket.off('chat:message', onMessage)
    }
  }, [roomId, me?.id])

  const emitMessage = useCallback(
    (key: string, content: string) => {
      const socket = getSocket()
      // mat ket noi thi bao loi ngay, khong de socket.io gui bu sau (de bi trung khi bam gui lai)
      const status = socket.connected ? 'sending' : 'failed'
      setMessages((list) => list.map((m) => (m.key === key ? { ...m, status } : m)))
      if (!socket.connected) return
      socket
        .timeout(ACK_TIMEOUT_MS)
        .emit('chat:send', { roomId, content, clientId: key }, (err: Error | null, res?: SendAck) => {
          if (!err && res?.ok) {
            setMessages((list) => upsertMessage(list, { ...res.message, clientId: key }))
            return
          }
          setMessages((list) => list.map((m) => (m.key === key ? { ...m, status: 'failed' } : m)))
        })
    },
    [roomId],
  )

  const send = useCallback(
    (raw: string) => {
      const content = raw.trim()
      if (!content || !me) return
      const key = newClientId()
      const item: ChatItem = {
        key,
        roomId,
        userId: me.id,
        content,
        createdAt: new Date().toISOString(),
        user: { id: me.id, name: me.name },
        status: 'sending',
      }
      setMessages((list) => [...list, item])
      emitMessage(key, content)
    },
    [emitMessage, me, roomId],
  )

  const retry = useCallback(
    (key: string) => {
      const item = messages.find((m) => m.key === key)
      if (item?.status === 'failed') emitMessage(key, item.content)
    },
    [emitMessage, messages],
  )

  const reload = useCallback(() => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  return { messages, loading, loadError, send, retry, reload }
}
