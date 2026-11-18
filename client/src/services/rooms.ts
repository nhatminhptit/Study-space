import { ApiError, request } from './http'

export interface RoomMember {
  id: number
  name: string
  email: string
}

export interface Room {
  id: number
  name: string
  code: string
  createdAt: string
  members?: RoomMember[]
  _count?: { members: number }
}

// GET /rooms -> tat ca phong (kem so thanh vien)
export function listRooms() {
  return request<Room[]>('/rooms')
}

// POST /rooms { name } -> phong moi, nguoi tao la thanh vien dau tien
export function createRoom(name: string) {
  return request<Room>('/rooms', { method: 'POST', body: { name } })
}

// POST /rooms/join { code } -> phong sau khi tham gia
export function joinRoom(code: string) {
  return request<Room>('/rooms/join', { method: 'POST', body: { code: code.trim().toUpperCase() } })
}

/*
 * Vao phong theo ma: backend tra 400 neu da la thanh vien -> van coi la vao duoc,
 * khi do lay thong tin phong tu danh sach.
 */
export async function enterRoomByCode(code: string): Promise<Room> {
  try {
    return await joinRoom(code)
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      const room = (await listRooms()).find((r) => r.code === code.trim().toUpperCase())
      if (room) return room
    }
    throw err
  }
}

export async function getRoom(id: number): Promise<Room | undefined> {
  return (await listRooms()).find((r) => r.id === id)
}

export function memberCount(room: Room): number {
  return room._count?.members ?? room.members?.length ?? 0
}
