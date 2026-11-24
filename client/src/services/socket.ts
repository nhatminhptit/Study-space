import { io, type Socket } from "socket.io-client";
import { API_URL, TOKEN_STORAGE_KEY } from "../config";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: (cb) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        cb({ token });
      },
    });
  }
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
