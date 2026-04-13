import { prisma } from "../lib/prisma";

const roleSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  rolePerms: {
    select: {
      permission: {
        select: { id: true, name: true, description: true },
      },
    },
  },
} as const;

export type RoleDetail = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: { id: number; name: string; description: string | null }[];
};

function mapRole(raw: {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  rolePerms: { permission: { id: number; name: string; description: string | null } }[];
}): RoleDetail {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    permissions: raw.rolePerms.map((rp) => rp.permission),
  };
}

export async function listRoles(): Promise<RoleDetail[]> {
  const roles = await prisma.role.findMany({
    select: roleSelect,
    orderBy: { id: "asc" },
  });
  return roles.map(mapRole);
}

export async function getRoleById(id: number): Promise<RoleDetail | null> {
  const role = await prisma.role.findUnique({
    where: { id },
    select: roleSelect,
  });
  return role ? mapRole(role) : null;
}

export async function createRole(data: {
  name: string;
  description?: string;
  permissionIds: number[];
}): Promise<RoleDetail> {
  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
      rolePerms: {
        create: data.permissionIds.map((pid) => ({ permissionId: pid })),
      },
    },
    select: roleSelect,
  });
  return mapRole(role);
}

export async function updateRole(
  id: number,
  data: {
    name?: string;
    description?: string;
    permissionIds?: number[];
  }
): Promise<RoleDetail> {
  // If permissionIds provided, replace all role permissions
  if (data.permissionIds !== undefined) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
      });
    }
  }

  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
    select: roleSelect,
  });
  return mapRole(role);
}

export async function deleteRole(id: number): Promise<void> {
  // Delete role permissions first, then the role
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });
}

export async function listPermissions() {
  return prisma.permission.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}
