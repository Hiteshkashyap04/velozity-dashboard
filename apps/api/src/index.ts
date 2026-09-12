import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";

import { prisma } from "./lib/prisma.js";
import {
  addOnlineUser,
  getOnlineUserCount,
  removeOnlineUser,
  setSocketIO,
} from "./lib/socket.js";
import { verifyAccessToken } from "./utils/jwt.js";

import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { startOverdueJob } from "./jobs/overdue.job.js";
const app = express();

const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      success: true,
      message: "Velozity API and database are running",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

/**
 * Socket.IO authentication middleware.
 *
 * The frontend sends the access token through:
 *
 * io("http://localhost:4000", {
 *   auth: {
 *     token: accessToken
 *   }
 * })
 */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || token.length === 0) {
      return next(new Error("Authentication token missing"));
    }

    const user = verifyAccessToken(token);

    socket.data.user = user;

    return next();
  } catch (error) {
    console.error("Socket authentication failed:", error);

    return next(new Error("Invalid or expired access token"));
  }
});

setSocketIO(io);
startOverdueJob();

io.on("connection", (socket) => {
  const user = socket.data.user as {
    userId: string;
    role: "ADMIN" | "PM" | "DEVELOPER";
  };

  console.log(
    `Socket connected: ${socket.id} | ${user.role} | ${user.userId}`
  );

  addOnlineUser(user.userId);

  /**
   * Role-based rooms.
   */
  if (user.role === "ADMIN") {
    socket.join("admins");
  }

  if (user.role === "PM") {
    socket.join(`pm:${user.userId}`);
  }

  if (user.role === "DEVELOPER") {
    socket.join(`developer:${user.userId}`);
  }

  io.to("admins").emit("presence:count-updated", {
    onlineUsers: getOnlineUserCount(),
  });

  void (async () => {
    const activityWhere =
      user.role === "ADMIN"
        ? {}
        : user.role === "PM"
          ? { project: { ownerId: user.userId } }
          : { task: { assigneeId: user.userId } };

    const activities = await prisma.activity.findMany({
      where: activityWhere,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    socket.emit("activity:catch-up", activities);
  })().catch((error) => {
    console.error("Activity catch-up failed:", error);
  });

  /**
   * Allow a client to subscribe to a project only after
   * the server verifies that the user has access to it.
   */
  socket.on("project:join", async (projectId: unknown, callback) => {
    try {
      if (typeof projectId !== "string" || projectId.trim().length === 0) {
        callback?.({
          success: false,
          message: "Invalid project ID",
        });

        return;
      }

      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          id: true,
          ownerId: true,
          tasks: {
            select: {
              assigneeId: true,
            },
          },
        },
      });

      if (!project) {
        callback?.({
          success: false,
          message: "Project not found",
        });

        return;
      }

      const canAccess =
        user.role === "ADMIN" ||
        (user.role === "PM" && project.ownerId === user.userId) ||
        (user.role === "DEVELOPER" &&
          project.tasks.some((task) => task.assigneeId === user.userId));

      if (!canAccess) {
        callback?.({
          success: false,
          message: "You do not have access to this project",
        });

        return;
      }

      socket.join(`project:${project.id}`);

      callback?.({
        success: true,
        message: "Joined project room",
      });
    } catch (error) {
      console.error("Project room join failed:", error);

      callback?.({
        success: false,
        message: "Unable to join project room",
      });
    }
  });

  socket.on("project:leave", (projectId: unknown) => {
    if (typeof projectId === "string" && projectId.trim().length > 0) {
      socket.leave(`project:${projectId}`);
    }
  });

  socket.on("disconnect", (reason) => {
    removeOnlineUser(user.userId);
    io.to("admins").emit("presence:count-updated", {
      onlineUsers: getOnlineUserCount(),
    });

    console.log(
      `Socket disconnected: ${socket.id} | ${user.userId} | ${reason}`
    );
  });
});

httpServer.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log("Socket.IO server is running");
});