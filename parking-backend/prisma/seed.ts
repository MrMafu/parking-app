// prisma/seed.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "System administrator",
    },
  });

  const attendantRole = await prisma.role.upsert({
    where: { name: "attendant" },
    update: {},
    create: {
      name: "attendant",
      description: "Parking attendant / cashier",
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: { name: "owner" },
    update: {},
    create: {
      name: "owner",
      description: "Business owner / report viewer",
    },
  });

  // Permissions
  const permissions = [
    { name: "users.view", description: "View users" },
    { name: "users.create", description: "Create users" },
    { name: "users.update", description: "Update users" },
    { name: "users.delete", description: "Delete users" },

    { name: "roles.view", description: "View roles" },
    { name: "roles.manage", description: "Manage roles and permissions" },

    { name: "vehicles.view", description: "View vehicles" },
    { name: "vehicles.create", description: "Create vehicles" },
    { name: "vehicles.update", description: "Update vehicles" },
    { name: "vehicles.delete", description: "Delete vehicles" },

    { name: "rates.view", description: "View parking rates" },
    { name: "rates.manage", description: "Manage parking rates" },

    { name: "parking_areas.view", description: "View parking areas" },
    { name: "parking_areas.manage", description: "Manage parking areas" },

    { name: "parking_spots.view", description: "View parking spots" },
    { name: "parking_spots.manage", description: "Manage parking spots" },

    { name: "transactions.view", description: "View transactions" },
    { name: "transactions.create", description: "Create transactions" },
    { name: "transactions.update", description: "Update transactions" },
    { name: "transactions.close", description: "Close transactions" },

    { name: "payments.view", description: "View payments" },
    { name: "payments.manage", description: "Manage payments" },

    { name: "receipts.view", description: "View receipts" },
    { name: "receipts.print", description: "Print receipts" },

    { name: "refunds.view", description: "View refunds" },
    { name: "refunds.manage", description: "Process refunds" },

    { name: "logs.view", description: "View activity logs" },
    { name: "reports.view", description: "View reports" },
  ];

  const seededPermissions = [];
  for (const perm of permissions) {
    const row = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    seededPermissions.push(row);
  }

  const permissionByName = new Map(
    seededPermissions.map((p) => [p.name, p])
  );

  // Role permissions
  const adminPermissions = permissions.map((p) => p.name);

  const attendantPermissions = [
    "vehicles.view",
    "vehicles.create",
    "vehicles.update",
    "parking_areas.view",
    "parking_spots.view",
    "transactions.view",
    "transactions.create",
    "transactions.update",
    "transactions.close",
    "payments.view",
    "payments.manage",
    "receipts.view",
    "receipts.print",
  ];

  const ownerPermissions = [
    "transactions.view",
    "payments.view",
    "receipts.view",
    "reports.view",
    "logs.view",
  ];

  async function assignPermissions(roleId: number, permissionNames: string[]) {
    for (const permissionName of permissionNames) {
      const permission = permissionByName.get(permissionName);
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permission.id,
        },
      });
    }
  }

  await assignPermissions(adminRole.id, adminPermissions);
  await assignPermissions(attendantRole.id, attendantPermissions);
  await assignPermissions(ownerRole.id, ownerPermissions);

  // Admin user
  const adminPassword = await bcrypt.hash("admin123!", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullname: "System Admin",
      username: "admin",
      email: "admin@parking.local",
      password: adminPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });