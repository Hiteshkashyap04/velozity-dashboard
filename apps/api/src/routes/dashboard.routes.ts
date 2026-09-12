import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getOnlineUserCount } from "../lib/socket.js";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const today = new Date();

    today.setHours(23, 59, 59, 999);

    const baseTaskWhere: Prisma.TaskWhereInput = {};
    const baseProjectWhere: Prisma.ProjectWhereInput = {};

    if (user.role === "PM") {
      baseProjectWhere.ownerId = user.userId;

      baseTaskWhere.project = {
        ownerId: user.userId,
      };
    }

    if (user.role === "DEVELOPER") {
      baseTaskWhere.assigneeId = user.userId;

      baseProjectWhere.tasks = {
        some: {
          assigneeId: user.userId,
        },
      };
    }

    const [
      totalProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      inReviewTasks,
      doneTasks,
      overdueTasks,
      lowPriorityTasks,
      mediumPriorityTasks,
      highPriorityTasks,
      criticalPriorityTasks,
    ] = await Promise.all([
      prisma.project.count({
        where: baseProjectWhere,
      }),

      prisma.task.count({
        where: baseTaskWhere,
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          status: "TODO",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          status: "IN_PROGRESS",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          status: "IN_REVIEW",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          status: "DONE",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          dueDate: {
            lt: today,
          },
          status: {
            not: "DONE",
          },
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          priority: "LOW",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          priority: "MEDIUM",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          priority: "HIGH",
        },
      }),

      prisma.task.count({
        where: {
          ...baseTaskWhere,
          priority: "CRITICAL",
        },
      }),
    ]);

    return res.json({
      success: true,
      summary: {
        totalProjects,
        totalTasks,
        overdueTasks,
        onlineUsers: getOnlineUserCount(),
        byStatus: {
          TODO: todoTasks,
          IN_PROGRESS: inProgressTasks,
          IN_REVIEW: inReviewTasks,
          DONE: doneTasks,
        },
        byPriority: {
          LOW: lowPriorityTasks,
          MEDIUM: mediumPriorityTasks,
          HIGH: highPriorityTasks,
          CRITICAL: criticalPriorityTasks,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard summary",
    });
  }
});

export default router;