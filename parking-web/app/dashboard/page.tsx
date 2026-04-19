"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ParkingArea, VehicleType, Rate, PublicUser, ActivityLog } from "@/types";
import {
  Building2,
  LayoutGrid,
  BarChart3,
  Users,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

const STATUS_STYLES: Record<ParkingArea["status"], string> = {
  Open: "bg-success text-white",
  Closed: "bg-medium text-white",
  Maintenance: "bg-warning text-dark",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [areasRes, vtRes, ratesRes, usersRes, logsRes] = await Promise.all([
        apiFetch("/parking-areas"),
        apiFetch("/vehicle-types"),
        apiFetch("/rates"),
        apiFetch("/users"),
        apiFetch("/activity-logs"),
      ]);

      if (areasRes.ok) setAreas((await areasRes.json()).data);
      if (vtRes.ok) setVehicleTypes((await vtRes.json()).data);
      if (ratesRes.ok) setRates((await ratesRes.json()).data);
      if (usersRes.ok) setUsers((await usersRes.json()).data);
      if (logsRes.ok) setLogs((await logsRes.json()).data);

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-medium text-sm">Loading...</p>;
  }

  const totalCapacity = areas.reduce((s, a) => s + a.capacity, 0);
  const totalOccupied = areas.reduce((s, a) => s + a.occupied, 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const activeAreas = areas.filter((a) => a.status === "Open").length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const now = new Date();
  const activeRates = rates.filter((r) => new Date(r.validTo) > now).length;

  // Rate type breakdown
  const rateTypeCounts = { Hourly: 0, Daily: 0, Flat: 0 };
  for (const r of rates) {
    if (new Date(r.validTo) > now) rateTypeCounts[r.rateType]++;
  }

  return (
    <>
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Parking Areas"
          value={areas.length}
          sub={`${activeAreas} open`}
          color="bg-primary"
          icon={Building2}
        />
        <StatCard
          label="Total Capacity"
          value={totalCapacity}
          sub="parking slots"
          color="bg-secondary"
          icon={LayoutGrid}
        />
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          sub={`${totalOccupied} / ${totalCapacity} slots`}
          color={occupancyPct > 80 ? "bg-danger" : occupancyPct > 50 ? "bg-warning" : "bg-success"}
          icon={BarChart3}
        />
        <StatCard
          label="Users"
          value={activeUsers}
          sub={`of ${users.length} total`}
          color="bg-dark"
          icon={Users}
        />
        <StatCard
          label="Active Rates"
          value={activeRates}
          sub={`of ${rates.length} total`}
          color="bg-success"
          icon={CircleDollarSign}
        />
      </div>

      {/* ── Two-Column: Occupancy + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parking Area Occupancy Cards */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-dark">Parking Area Occupancy</h2>
          {areas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-light-shade p-8 text-center text-medium text-sm">
              No parking areas found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {areas.map((area) => {
                const pct = area.capacity > 0 ? Math.round((area.occupied / area.capacity) * 100) : 0;
                const barColor = pct > 80 ? "bg-danger" : pct > 50 ? "bg-warning" : "bg-success";
                return (
                  <div key={area.id} className="bg-white rounded-2xl border border-light-shade p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-dark">{area.name}</h3>
                        <p className="text-xs text-medium mt-0.5">{area.location ?? "No location"}</p>
                      </div>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[area.status]}`}>
                        {area.status}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-dark text-lg">{pct}%</span>
                        <span className="text-medium text-xs">{area.occupied} / {area.capacity} slots</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-light-shade overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark">Recent Activity</h2>
            <Link href="/dashboard/activity-logs" className="text-xs font-medium text-primary hover:text-primary-shade">
              View all
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-light-shade divide-y divide-light-shade">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-medium text-sm">No recent activity.</div>
            ) : (
              logs.slice(0, 10).map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-tint flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-semibold">
                      {log.user.fullname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-dark truncate">{log.user.fullname}</span>
                      <span className="text-xs text-medium whitespace-nowrap">{relativeTime(log.createdAt)}</span>
                    </div>
                    <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                      {log.action}
                    </span>
                    {log.details && (
                      <p className="text-xs text-medium mt-1 truncate">{log.details}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Bottom Row: Rates Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rates Overview */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-dark">Rates Overview</h2>
          <div className="bg-white rounded-2xl border border-light-shade p-5 space-y-5">
            {/* Active vs Expired */}
            <div className="flex items-center gap-4">
              <div className="flex-1 rounded-xl bg-success/10 p-4 text-center">
                <p className="text-2xl font-bold text-success">{activeRates}</p>
                <p className="text-xs text-medium mt-1">Active</p>
              </div>
              <div className="flex-1 rounded-xl bg-danger/10 p-4 text-center">
                <p className="text-2xl font-bold text-danger">{rates.length - activeRates}</p>
                <p className="text-xs text-medium mt-1">Expired</p>
              </div>
            </div>
            {/* By Rate Type */}
            <div>
              <p className="text-sm font-medium text-dark mb-3">Active by Type</p>
              <div className="space-y-3">
                {(["Hourly", "Daily", "Flat"] as const).map((type) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-medium w-14">{type}</span>
                    <div className="flex-1 h-2 rounded-full bg-light-shade overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: activeRates > 0 ? `${Math.round((rateTypeCounts[type] / activeRates) * 100)}%` : "0%" }}
                      />
                    </div>
                    <span className="text-sm font-bold text-dark w-6 text-right">{rateTypeCounts[type]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-white rounded-2xl border border-light-shade p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-dark">{value}</p>
        <p className="text-xs text-medium mt-0.5">{sub}</p>
      </div>
      <p className="text-sm text-medium -mt-1">{label}</p>
    </div>
  );
}