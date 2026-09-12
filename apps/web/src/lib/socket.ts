import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const socketUrl =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
