import { prisma } from "./prisma";

export async function logActivity(
  userId: number,
  action: string,
  details?: string
): Promise<void> {
  await prisma.activityLog.create({
    data: { userId, action, details },
  });
}
