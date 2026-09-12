import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;
const activeUsers = new Map<string, number>();

export function setSocketIO(server: SocketIOServer) {
  io = server;
}

export function getSocketIO() {
  return io;
}

export function addOnlineUser(userId: string) {
  activeUsers.set(userId, (activeUsers.get(userId) || 0) + 1);
}

export function removeOnlineUser(userId: string) {
  const connectionCount = activeUsers.get(userId) || 0;

  if (connectionCount <= 1) {
    activeUsers.delete(userId);
  } else {
    activeUsers.set(userId, connectionCount - 1);
  }
}

export function getOnlineUserCount() {
  return activeUsers.size;
}