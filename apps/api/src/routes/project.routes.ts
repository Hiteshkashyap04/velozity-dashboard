import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";

const router = Router();

/**
 * Get projects visible to the current user.
 *
 * ADMIN:
 *   Can see every project.
 *
 * PM:
 *   Can see only projects they own.
 *
 * DEVELOPER:
 *   Can see only projects containing tasks assigned to them.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user!;

    let projects;

    if (user.role === "ADMIN") {
      projects = await prisma.project.findMany({
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else if (user.role === "PM") {
      projects = await prisma.project.findMany({
        where: {
          ownerId: user.userId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          tasks: {
            some: {
              assigneeId: user.userId,
            },
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return res.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch projects",
    });
  }
});


router.get("/:projectId", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user!;

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
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
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const canAccess =
      user.role === "ADMIN" ||
      (user.role === "PM" && project.ownerId === user.userId) ||
      (user.role === "DEVELOPER" &&
        project.tasks.some(
          (task) => task.assigneeId === user.userId
        ));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    return res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get project details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch project details",
    });
  }
});
/**
 * Create a project.
 *
 * Only ADMIN and PM users can create projects.
 * A PM becomes the owner of the project they create.
 */
router.post(
  "/",
  requireAuth,
  requireRoles("ADMIN", "PM"),
  async (req, res) => {
    try {
      const { name, description, dueDate } = req.body;

      if (!name || typeof name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Project name is required",
        });
      }

      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description:
            typeof description === "string"
              ? description.trim()
              : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          ownerId: req.user!.userId,
        },
        include: {
          owner: {
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
          type: "PROJECT_CREATED",
          message: `Project "${project.name}" was created`,
          projectId: project.id,
          userId: req.user!.userId,
        },
      });

      return res.status(201).json({
        success: true,
        project,
      });
    } catch (error) {
      console.error("Create project error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create project",
      });
    }
  }
);

export default router;