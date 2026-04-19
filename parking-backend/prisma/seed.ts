// run seeder: npx prisma db seed
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
    { name: "rates.create", description: "Create parking rates" },
    { name: "rates.update", description: "Update parking rates" },
    { name: "rates.delete", description: "Delete parking rates" },

    { name: "parking_areas.view", description: "View parking areas" },
    { name: "parking_areas.create", description: "Create parking areas" },
    { name: "parking_areas.update", description: "Update parking areas" },
    { name: "parking_areas.delete", description: "Delete parking areas" },

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

    { name: "access_web", description: "Access the web dashboard" },
    { name: "access_mobile", description: "Access the mobile app" },
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
  const adminPermissions = [
    "users.view",
    "users.create",
    "users.update",
    "users.delete",
    "roles.view",
    "roles.manage",
    "vehicles.view",
    "vehicles.create",
    "vehicles.update",
    "vehicles.delete",
    "rates.view",
    "rates.create",
    "rates.update",
    "rates.delete",
    "parking_areas.view",
    "parking_areas.create",
    "parking_areas.update",
    "parking_areas.delete",
    "logs.view",
    "reports.view",
    "access_web",
  ];

  const attendantPermissions = [
    "vehicles.view",
    "vehicles.create",
    "vehicles.update",
    "parking_areas.view",
    "transactions.view",
    "transactions.create",
    "transactions.update",
    "transactions.close",
    "payments.view",
    "payments.manage",
    "receipts.view",
    "receipts.print",
    "refunds.view",
    "refunds.manage",
    "access_mobile",
  ];

  const ownerPermissions = [
    "transactions.view",
    "payments.view",
    "receipts.view",
    "refunds.view",
    "reports.view",
    "logs.view",
    "access_mobile",
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

  // Attendant user
  const attendantPassword = await bcrypt.hash("attendant123!", 10);
  await prisma.user.upsert({
    where: { username: "attendant1" },
    update: {},
    create: {
      fullname: "Parking Attendant 1",
      username: "attendant1",
      email: "attendant1@parking.local",
      password: attendantPassword,
      roleId: attendantRole.id,
      isActive: true,
    },
  });

  // Owner user
  const ownerPassword = await bcrypt.hash("owner123!", 10);
  await prisma.user.upsert({
    where: { username: "owner" },
    update: {},
    create: {
      fullname: "Parking Owner",
      username: "owner",
      email: "owner@parking.local",
      password: ownerPassword,
      roleId: ownerRole.id,
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