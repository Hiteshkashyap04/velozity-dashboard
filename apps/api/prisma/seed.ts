import {
  PrismaClient,
  UserRole,
  TaskStatus,
  TaskPriority,
  ActivityType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing seed data...");

  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@velozity.com",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: "Priya Manager",
      email: "priya@velozity.com",
      passwordHash,
      role: UserRole.PM,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: "Rahul Manager",
      email: "rahul@velozity.com",
      passwordHash,
      role: UserRole.PM,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      name: "Amit Developer",
      email: "amit@velozity.com",
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      name: "Neha Developer",
      email: "neha@velozity.com",
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      name: "Vikram Developer",
      email: "vikram@velozity.com",
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      name: "Sneha Developer",
      email: "sneha@velozity.com",
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const project1 = await prisma.project.create({
    data: {
      name: "Client Portal",
      description: "A secure portal for clients to track project progress.",
      ownerId: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Analytics Dashboard",
      description: "Real-time business analytics and reporting dashboard.",
      ownerId: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Mobile Application",
      description: "Cross-platform mobile application for customers.",
      ownerId: pm2.id,
    },
  });

  const project4 = await prisma.project.create({
    data: {
      name: "Internal HR System",
      description: "Internal employee management and leave tracking system.",
      ownerId: pm2.id,
    },
  });

  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const inThreeDays = new Date(now);
  inThreeDays.setDate(now.getDate() + 3);

  const inFiveDays = new Date(now);
  inFiveDays.setDate(now.getDate() + 5);

  const tasks = [
    {
      title: "Design login page",
      description: "Create the responsive login page design.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: yesterday,
      projectId: project1.id,
      assigneeId: dev1.id,
    },
    {
      title: "Implement authentication API",
      description: "Create login and refresh-token endpoints.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: tomorrow,
      projectId: project1.id,
      assigneeId: dev2.id,
    },
    {
      title: "Create client profile page",
      description: "Build the client profile interface.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: inThreeDays,
      projectId: project1.id,
      assigneeId: dev3.id,
    },
    {
      title: "Add project filters",
      description: "Add filtering by status and priority.",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: yesterday,
      projectId: project1.id,
      assigneeId: dev1.id,
    },
    {
      title: "Write API documentation",
      description: "Document all public API endpoints.",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: inFiveDays,
      projectId: project1.id,
      assigneeId: dev4.id,
    },

    {
      title: "Build revenue chart",
      description: "Create a chart showing monthly revenue.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: tomorrow,
      projectId: project2.id,
      assigneeId: dev2.id,
    },
    {
      title: "Create dashboard cards",
      description: "Create summary cards for key metrics.",
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: yesterday,
      projectId: project2.id,
      assigneeId: dev3.id,
    },
    {
      title: "Add export functionality",
      description: "Allow users to export analytics data.",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: inFiveDays,
      projectId: project2.id,
      assigneeId: dev4.id,
    },
    {
      title: "Optimize dashboard queries",
      description: "Improve database query performance.",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: tomorrow,
      projectId: project2.id,
      assigneeId: dev1.id,
    },
    {
      title: "Add date range filter",
      description: "Allow custom date range selection.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: inThreeDays,
      projectId: project2.id,
      assigneeId: dev2.id,
    },

    {
      title: "Create mobile navigation",
      description: "Build the mobile navigation structure.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: tomorrow,
      projectId: project3.id,
      assigneeId: dev3.id,
    },
    {
      title: "Implement push notifications",
      description: "Add notification support to the mobile app.",
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: inThreeDays,
      projectId: project3.id,
      assigneeId: dev4.id,
    },
    {
      title: "Add offline support",
      description: "Cache important data for offline usage.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: inFiveDays,
      projectId: project3.id,
      assigneeId: dev1.id,
    },
    {
      title: "Test mobile authentication",
      description: "Test login and logout flows.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: yesterday,
      projectId: project3.id,
      assigneeId: dev2.id,
    },
    {
      title: "Prepare app release notes",
      description: "Write release notes for the next version.",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: inFiveDays,
      projectId: project3.id,
      assigneeId: dev3.id,
    },

    {
      title: "Create employee directory",
      description: "Build searchable employee directory.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: tomorrow,
      projectId: project4.id,
      assigneeId: dev4.id,
    },
    {
      title: "Implement leave requests",
      description: "Allow employees to submit leave requests.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: inThreeDays,
      projectId: project4.id,
      assigneeId: dev1.id,
    },
    {
      title: "Add manager approval flow",
      description: "Create approval workflow for managers.",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: yesterday,
      projectId: project4.id,
      assigneeId: dev2.id,
    },
    {
      title: "Create HR reports",
      description: "Generate monthly HR reports.",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: inFiveDays,
      projectId: project4.id,
      assigneeId: dev3.id,
    },
    {
      title: "Add employee settings",
      description: "Create employee profile settings.",
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: yesterday,
      projectId: project4.id,
      assigneeId: dev4.id,
    },
  ];

  for (const taskData of tasks) {
    const task = await prisma.task.create({
      data: taskData,
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.TASK_CREATED,
        message: `Task "${task.title}" was created`,
        userId: admin.id,
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    if (task.assigneeId) {
      await prisma.activity.create({
        data: {
          type: ActivityType.TASK_ASSIGNED,
          message: `Task "${task.title}" was assigned`,
          userId: admin.id,
          projectId: task.projectId,
          taskId: task.id,
        },
      });
    }

    if (task.status !== TaskStatus.TODO) {
      await prisma.activity.create({
        data: {
          type: ActivityType.TASK_STATUS_CHANGED,
          message: `Task "${task.title}" is currently ${task.status}`,
          userId: admin.id,
          projectId: task.projectId,
          taskId: task.id,
        },
      });
    }
  }

  console.log("Seed completed successfully.");
  console.log("Demo password for all users: Password123!");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });