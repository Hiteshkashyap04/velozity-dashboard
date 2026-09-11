import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
dotenv.config();
import projectRoutes from "./routes/project.routes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Velozity API and database are running",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});