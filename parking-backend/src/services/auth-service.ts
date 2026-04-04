import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import { logActivity } from "../lib/activity-log";
import type { PublicUser } from "../types/auth";

export async function loginUser(
  username: string,
  password: string,
  source?: "web" | "mobile"
): Promise<{ accessToken: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: {
        include: {
          rolePerms: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("This user is inactive");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  if (source) {
    const roleName = user.role.name;
    const permissionNames = user.role.rolePerms.map(
      (rp: { permission: { name: string } }) => rp.permission.name
    );

    if (source === "web") {
      const allowed =
        roleName === "admin" || permissionNames.includes("access_web");
      if (!allowed) {
        throw new Error("Access denied: insufficient permissions for web access");
      }
    } else if (source === "mobile") {
      const allowed =
        roleName === "attendant" ||
        roleName === "owner" ||
        permissionNames.includes("access_mobile");
      if (!allowed) {
        throw new Error("Access denied: insufficient permissions for mobile access");
      }
    }
  }

  await logActivity(user.id, "login", source ? `source: ${source}` : undefined);

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