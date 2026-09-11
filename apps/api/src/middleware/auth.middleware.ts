import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing",
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = payload;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}