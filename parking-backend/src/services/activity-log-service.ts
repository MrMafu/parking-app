import { prisma } from "../lib/prisma";

export type ActivityLogEntry = {
  id: number;
  action: string;
  details: string | null;
  createdAt: Date;
  user: { id: number; fullname: string; username: string };
};

export async function listActivityLogs(): Promise<ActivityLogEntry[]> {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      details: true,
      createdAt: true,
      user: { select: { id: true, fullname: true, username: true } },
    },
  });
}
