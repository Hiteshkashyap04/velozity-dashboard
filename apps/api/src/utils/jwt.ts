import jwt, { type SignOptions } from "jsonwebtoken";

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is missing from environment variables");
  }

  return secret;
}

export type AccessTokenPayload = {
  userId: string;
  role: "ADMIN" | "PM" | "DEVELOPER";
};

export function createAccessToken(payload: AccessTokenPayload): string {
  const secret = getAccessSecret();
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = getAccessSecret();

  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string" ||
    !["ADMIN", "PM", "DEVELOPER"].includes(decoded.role)
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role as AccessTokenPayload["role"],
  };
}