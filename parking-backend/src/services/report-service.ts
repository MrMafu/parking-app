import { prisma } from "../lib/prisma.js";

export type DashboardStats = {
  todayRevenue: number;
  todayTransactions: number;
  activeTransactions: number;
  weekRevenue: number;
  monthRevenue: number;
  revenueByArea: { areaId: number; areaName: string; revenue: number; count: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();

  // Start of today (local midnight)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Start of this week (Monday)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - mondayOffset);

  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayAgg,
    todayCount,
    activeCount,
    weekAgg,
    monthAgg,
    areaBreakdown,
  ] = await Promise.all([
    // Today's revenue
    prisma.transaction.aggregate({
      where: { status: "Closed", exitTime: { gte: todayStart } },
      _sum: { amountCents: true },
    }),

    // Today's closed transaction count
    prisma.transaction.count({
      where: { status: "Closed", exitTime: { gte: todayStart } },
    }),

    // Active (open) transactions
    prisma.transaction.count({
      where: { status: { in: ["Open", "AwaitingPayment"] } },
    }),

    // This week's revenue
    prisma.transaction.aggregate({
      where: { status: "Closed", exitTime: { gte: weekStart } },
      _sum: { amountCents: true },
    }),

    // This month's revenue
    prisma.transaction.aggregate({
      where: { status: "Closed", exitTime: { gte: monthStart } },
      _sum: { amountCents: true },
    }),

    // Revenue by area (this month)
    prisma.transaction.groupBy({
      by: ["areaId"],
      where: { status: "Closed", exitTime: { gte: monthStart } },
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);

  // Fetch area names for the breakdown
  let revenueByArea: DashboardStats["revenueByArea"] = [];
  if (areaBreakdown.length > 0) {
    const areaIds = areaBreakdown.map((a) => a.areaId);
    const areas = await prisma.parkingArea.findMany({
      where: { id: { in: areaIds } },
      select: { id: true, name: true },
    });
    const areaMap = new Map(areas.map((a) => [a.id, a.name]));

    revenueByArea = areaBreakdown.map((a) => ({
      areaId: a.areaId,
      areaName: areaMap.get(a.areaId) ?? "Unknown",
      revenue: a._sum.amountCents ?? 0,
      count: a._count,
    }));
  }

  return {
    todayRevenue: todayAgg._sum.amountCents ?? 0,
    todayTransactions: todayCount,
    activeTransactions: activeCount,
    weekRevenue: weekAgg._sum.amountCents ?? 0,
    monthRevenue: monthAgg._sum.amountCents ?? 0,
    revenueByArea,
  };
}
