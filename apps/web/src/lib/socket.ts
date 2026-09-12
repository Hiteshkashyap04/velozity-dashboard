import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";

let socket: Socket | null = null;

const socketUrl = import.meta.env.VITE_API_URL;

export function connectSocket(): Socket | null {
  const token = getAccessToken();

  if (!socketUrl) {
    console.error("VITE_API_URL is missing from the frontend build");
    return null;
  }

  if (!token) {
    console.warn("Socket connection skipped because no access token exists");
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(socketUrl, {
    auth: {
      token,
    },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
