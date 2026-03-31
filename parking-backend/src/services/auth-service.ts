import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import type { PublicUser } from "../types/auth";

export async function loginUser(username: string, password: string): Promise<{ accessToken: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = await signAccessToken({
    sub: String(user.id),
    username: user.username,
    roleId: user.roleId,
    roleName: user.role.name,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
    },
  };
}

export async function getPublicUserById(userId: number): Promise<{ user: PublicUser } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !user.isActive) return null;

  return {
    user: {
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
    },
  };
}