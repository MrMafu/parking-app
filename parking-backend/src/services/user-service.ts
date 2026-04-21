import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const userSelect = {
  id: true,
  fullname: true,
  username: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: { id: true, name: true },
  },
} as const;

export type UserDetail = {
  id: number;
  fullname: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: { id: number; name: string };
};

export async function listUsers(): Promise<UserDetail[]> {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { id: "asc" },
  });
}

export async function getUserById(id: number): Promise<UserDetail | null> {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
}

export async function createUser(data: {
  fullname: string;
  username: string;
  email: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}): Promise<UserDetail> {
  const hashed = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      fullname: data.fullname,
      username: data.username,
      email: data.email,
      password: hashed,
      roleId: data.roleId,
      isActive: data.isActive ?? true,
    },
    select: userSelect,
  });
}

export async function updateUser(
  id: number,
  data: {
    fullname?: string;
    username?: string;
    email?: string;
    password?: string;
    roleId?: number;
    isActive?: boolean;
  }
): Promise<UserDetail> {
  const payload: Record<string, unknown> = { ...data };

  if (data.password) {
    payload.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: payload,
    select: userSelect,
  });
}

export async function deleteUser(id: number): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: {
        isActive: false,
        deletedAt: new Date(),
    },
  });
}