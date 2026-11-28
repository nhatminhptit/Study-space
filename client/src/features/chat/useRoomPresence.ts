import { useEffect, useState } from 'react'
import type { JoinAck, OnlineUser } from '../../services/chat'
import { getSocket } from '../../services/socket'

interface PresenceEvent {
  roomId: number
  users: OnlineUser[]
}

/*
 * Bao server minh dang o trong phong va nhan danh sach user online.
 * Moi lan ket noi lai (socket id moi) thi vao lai phong.
 */
export function useRoomPresence(roomId: number) {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [connected, setConnected] = useState(() => getSocket().connected)
  const [error, setError] = useState('')

  useEffect(() => {
    const socket = getSocket()

    function join() {
      setConnected(true)
      socket.emit('presence:join', { roomId }, (res: JoinAck) => {
        if (res.ok) {
          setUsers(res.users)
          setError('')
        } else {
          setError(res.error)
        }
      })
    }

    function onDisconnect() {
      setConnected(false)
      setUsers([])
    }

    function onUsers(event: PresenceEvent) {
      if (event.roomId === roomId) setUsers(event.users)
    }

    socket.on('connect', join)
    socket.on('disconnect', onDisconnect)
    socket.on('presence:users', onUsers)
    if (socket.connected) join()

    return () => {
      socket.off('connect', join)
      socket.off('disconnect', onDisconnect)
      socket.off('presence:users', onUsers)
      socket.emit('presence:leave', { roomId })
    }
  }, [roomId])

  return { users, connected, error }
}
