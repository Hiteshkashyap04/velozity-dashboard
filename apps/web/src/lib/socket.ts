import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";

let socket: Socket | null = null;

export function connectSocket() {
  const token = getAccessToken();

  if (!token) {
    console.warn("Socket connection skipped because no access token exists");
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io("http://localhost:4000", {
    auth: {
      token,
    },
    withCredentials: true,
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

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}