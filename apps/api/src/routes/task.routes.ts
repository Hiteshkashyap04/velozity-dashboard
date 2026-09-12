import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { getSocketIO } from "../lib/socket.js";

const router = Router();

const validStatuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const;

const validPriorities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

type TaskStatus = (typeof validStatuses)[number];
type TaskPriority = (typeof validPriorities)[number];

function isValidStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    validStatuses.includes(value as TaskStatus)
  );
}

function isValidPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    validPriorities.includes(value as TaskPriority)
  );
}

async function canAccessProject(
  user: Express.Request["user"],
  projectId: string
) {
  if (!user) {
    return false;
  }

  if (user.role === "ADMIN") {
    return true;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      ownerId: true,
      tasks: {
        select: {
          assigneeId: true,
        },
      },
    },
  });

  if (!project) {
    return false;
  }

  if (user.role === "PM") {
    return project.ownerId === user.userId;
  }

  return project.tasks.some(
    (task) => task.assigneeId === user.userId
  );
}

/**
 * GET /api/tasks/developers
 */
router.get(
  "/developers",
  requireAuth,
  requireRoles("ADMIN", "PM"),
  async (_req, res) => {
    try {
      const developers = await prisma.user.findMany({
        where: {
          role: "DEVELOPER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.json({
        success: true,
        developers,
      });
    } catch (error) {
      console.error("Get developers error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch developers",
      });
    }
  }
);

/**
 * GET /api/tasks
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { status, priority, projectId, fromDate, toDate } = req.query;

    const where: Prisma.TaskWhereInput = {};

    if (user.role === "ADMIN") {
      // Admin can view all tasks.
    } else if (user.role === "PM") {
      where.project = {
        ownerId: user.userId,
      };
    } else {
      where.assigneeId = user.userId;
    }

    if (typeof status === "string" && isValidStatus(status)) {
      where.status = status;
    }

    if (typeof priority === "string" && isValidPriority(priority)) {
      where.priority = priority;
    }

    if (typeof projectId === "string") {
      where.projectId = projectId;
    }

    if (typeof fromDate === "string" || typeof toDate === "string") {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      const parsedFromDate =
        typeof fromDate === "string" ? new Date(fromDate) : null;
      const parsedToDate =
        typeof toDate === "string" ? new Date(toDate) : null;

      if (parsedFromDate && !Number.isNaN(parsedFromDate.getTime())) {
        dateFilter.gte = parsedFromDate;
      }

      if (parsedToDate && !Number.isNaN(parsedToDate.getTime())) {
        parsedToDate.setHours(23, 59, 59, 999);
        dateFilter.lte = parsedToDate;
      }

      if (Object.keys(dateFilter).length > 0) {
        where.dueDate = dateFilter;
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          dueDate: "asc",
        },
      ],
    });

    return res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch tasks",
    });
  }
});

/**
 * POST /api/tasks
 */
router.post(
  "/",
  requireAuth,
  requireRoles("ADMIN", "PM"),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const {
        projectId,
        title,
        description,
        assigneeId,
        status = "TODO",
        priority = "MEDIUM",
        dueDate,
      } = req.body;

      if (
        typeof projectId !== "string" ||
        typeof title !== "string" ||
        title.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "projectId and title are required",
        });
      }

      if (!isValidStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }

      if (!isValidPriority(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (user.role === "PM" && project.ownerId !== user.userId) {
        return res.status(403).json({
          success: false,
          message: "You can only create tasks in your own projects",
        });
      }

      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: {
            id: assigneeId,
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (!assignee || assignee.role !== "DEVELOPER") {
          return res.status(400).json({
            success: false,
            message: "Tasks can only be assigned to developers",
          });
        }
      }

      const task = await prisma.task.create({
        data: {
          projectId,
          title: title.trim(),
          description:
            typeof description === "string"
              ? description.trim()
              : null,
          assigneeId: assigneeId || null,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await prisma.activity.create({
        data: {
          projectId,
          taskId: task.id,
          userId: user.userId,
          type: "TASK_CREATED",
          message: `Task "${task.title}" was created`,
        },
      });

      if (assigneeId) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            taskId: task.id,
            type: "TASK_ASSIGNED",
            message: `You were assigned to task "${task.title}"`,
          },
        });
      }

      const io = getSocketIO();

      if (io) {
        io.to(`project:${projectId}`).emit("task:created", {
          task,
          projectId,
          createdBy: user.userId,
        });

        io.to("admins").emit("task:created", {
          task,
          projectId,
          createdBy: user.userId,
        });

        io.to(`pm:${project.ownerId}`).emit("task:created", {
          task,
          projectId,
          createdBy: user.userId,
        });

        if (assigneeId) {
          io.to(`developer:${assigneeId}`).emit("task:created", {
            task,
            projectId,
            createdBy: user.userId,
          });

          io.to(`developer:${assigneeId}`).emit("notification:new", {
            type: "TASK_ASSIGNED",
            taskId: task.id,
            message: `You were assigned to task "${task.title}"`,
          });
        }
      }

      return res.status(201).json({
        success: true,
        task,
      });
    } catch (error) {
      console.error("Create task error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create task",
      });
    }
  }
);

/**
 * PATCH /api/tasks/:taskId/status
 */
router.patch("/:taskId/status", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const taskId = req.params.taskId as string;
    const { status } = req.body;

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    const existingTask = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canAccessProject(
      user,
      existingTask.projectId
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this task",
      });
    }

    if (
      user.role === "DEVELOPER" &&
      existingTask.assigneeId !== user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update tasks assigned to you",
      });
    }

    if (existingTask.status === status) {
      return res.json({
        success: true,
        task: existingTask,
        message: "Task already has this status",
      });
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        projectId: existingTask.projectId,
        taskId: existingTask.id,
        userId: user.userId,
        type: "TASK_STATUS_CHANGED",
        message: `Task "${existingTask.title}" moved from ${existingTask.status} to ${status}`,
      },
    });

    if (status === "IN_REVIEW") {
      await prisma.notification.create({
        data: {
          userId: existingTask.project.ownerId,
          taskId: existingTask.id,
          type: "TASK_IN_REVIEW",
          message: `Task "${existingTask.title}" is ready for review`,
        },
      });
    }

    const io = getSocketIO();

    if (io) {
      const eventPayload = {
        task: updatedTask,
        projectId: existingTask.projectId,
        changedBy: user.userId,
        previousStatus: existingTask.status,
        newStatus: status,
      };

      io.to(`project:${existingTask.projectId}`).emit(
        "task:status-updated",
        eventPayload
      );

      io.to("admins").emit(
        "task:status-updated",
        eventPayload
      );

      io.to(`pm:${existingTask.project.ownerId}`).emit(
        "task:status-updated",
        eventPayload
      );

      if (existingTask.assigneeId) {
        io.to(`developer:${existingTask.assigneeId}`).emit(
          "task:status-updated",
          eventPayload
        );
      }

      if (status === "IN_REVIEW") {
        io.to(`pm:${existingTask.project.ownerId}`).emit("notification:new", {
          type: "TASK_IN_REVIEW",
          taskId: existingTask.id,
          message: `Task "${existingTask.title}" is ready for review`,
        });
      }
    }

    return res.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update task status",
    });
  }
});

export default router;