import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { getSocketIO } from "../lib/socket.js";

export async function processOverdueTasks() {
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { not: "DONE" },
      overdue: false,
    },
    include: {
      project: { select: { id: true, ownerId: true } },
      assignee: { select: { id: true } },
    },
  });

  const io = getSocketIO();

  for (const task of tasks) {
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { overdue: true },
    });

    await prisma.activity.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        userId: task.project.ownerId,
        type: "TASK_OVERDUE",
        message: `Task "${task.title}" is overdue`,
      },
    });

    const payload = { task: updatedTask, projectId: task.projectId };

    io?.to("admins").emit("task:overdue", payload);
    io?.to(`pm:${task.project.ownerId}`).emit("task:overdue", payload);

    if (task.assignee?.id) {
      io?.to(`developer:${task.assignee.id}`).emit("task:overdue", payload);
    }
  }

  return tasks.length;
}

export function startOverdueJob() {
  cron.schedule("*/5 * * * *", () => {
    void processOverdueTasks().catch((error) => {
      console.error("Overdue task processing failed:", error);
    });
  });
}