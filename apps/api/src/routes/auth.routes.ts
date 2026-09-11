import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { comparePassword } from "../utils/password.js";
import { createAccessToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.middleware.js";
const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password format",
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await comparePassword(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = createAccessToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const refreshTokenDays = Number(
      process.env.REFRESH_TOKEN_DAYS || "7"
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenDays);

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshTokenDays * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({
        where: {
          id: storedToken.id,
        },
      });

      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    const accessToken = createAccessToken({
      userId: storedToken.user.id,
      role: storedToken.user.role,
    });

    return res.json({
      success: true,
      accessToken,
      user: {
        id: storedToken.user.id,
        name: storedToken.user.name,
        email: storedToken.user.email,
        role: storedToken.user.role,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh session",
    });
  }
});
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const refreshTokenHash = hashRefreshToken(refreshToken);

      await prisma.refreshToken.deleteMany({
        where: {
          tokenHash: refreshTokenHash,
        },
      });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log out",
    });
  }
});
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user!.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.json({
    success: true,
    user,
  });
});
export default router;