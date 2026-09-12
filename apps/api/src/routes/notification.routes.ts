import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/notifications
 *
 * Returns the latest notifications for the logged-in user.
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

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            projectId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const unreadCount = notifications.filter(
      (notification) => !notification.isRead
    ).length;

    return res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications",
    });
  }
});

/**
 * GET /api/notifications/unread-count
 */
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
      },
    });

    return res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Get unread notification count error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch unread notification count",
    });
  }
});

/**
 * PATCH /api/notifications/read-all
 */
router.patch("/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const result = await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      return res.json({ success: true, updatedCount: result.count });
    } catch (error) {
      console.error("Mark notification as read error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to mark notification as read",
      });
    }
});

/**
 * PATCH /api/notifications/:notificationId/read
 */
router.patch("/:notificationId/read", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const notificationId = req.params.notificationId as string;
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.json({
      success: true,
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to mark all notifications as read",
    });
  }
});

export default router;