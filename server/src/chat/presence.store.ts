export interface OnlineUser {
  userId: number;
  name: string;
}

interface Entry {
  name: string;
  sockets: Set<string>;
}

// theo doi ai dang online trong tung phong; 1 user mo nhieu tab chi tinh 1 lan
export class PresenceStore {
  private readonly rooms = new Map<number, Map<number, Entry>>();

  // tra ve true neu day la tab dau tien cua user trong phong
  add(roomId: number, socketId: string, user: OnlineUser): boolean {
    let users = this.rooms.get(roomId);
    if (!users) {
      users = new Map();
      this.rooms.set(roomId, users);
    }
    const entry = users.get(user.userId);
    if (entry) {
      entry.sockets.add(socketId);
      entry.name = user.name;
      return false;
    }
    users.set(user.userId, { name: user.name, sockets: new Set([socketId]) });
    return true;
  }

  // tra ve userId neu day la tab cuoi cung cua user do (user da offline)
  remove(roomId: number, socketId: string): number | null {
    const users = this.rooms.get(roomId);
    if (!users) return null;
    for (const [userId, entry] of users) {
      if (!entry.sockets.delete(socketId)) continue;
      if (entry.sockets.size > 0) return null;
      users.delete(userId);
      if (users.size === 0) this.rooms.delete(roomId);
      return userId;
    }
    return null;
  }

  // cac phong ma socket dang co mat (dung khi mat ket noi)
  roomsOf(socketId: string): number[] {
    const result: number[] = [];
    for (const [roomId, users] of this.rooms) {
      for (const entry of users.values()) {
        if (entry.sockets.has(socketId)) {
          result.push(roomId);
          break;
        }
      }
    }
    return result;
  }

  list(roomId: number): OnlineUser[] {
    const users = this.rooms.get(roomId);
    if (!users) return [];
    return [...users]
      .map(([userId, entry]) => ({ userId, name: entry.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }
}
