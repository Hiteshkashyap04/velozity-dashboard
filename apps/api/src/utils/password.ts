import bcrypt from "bcryptjs";

export function comparePassword(
  plainPassword: string,
  passwordHash: string
) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}