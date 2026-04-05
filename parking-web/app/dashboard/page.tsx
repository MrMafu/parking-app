"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ParkingArea, Vehicle, VehicleType, Rate, PublicUser, ActivityLog } from "@/types";

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [areasRes, vehiclesRes, vtRes, ratesRes, usersRes, logsRes] = await Promise.all([
        apiFetch("/parking-areas"),
        apiFetch("/vehicles"),
        apiFetch("/vehicle-types"),
        apiFetch("/rates"),
        apiFetch("/users"),
        apiFetch("/activity-logs"),
      ]);

      if (areasRes.ok) setAreas((await areasRes.json()).data);
      if (vehiclesRes.ok) setVehicles((await vehiclesRes.json()).data);
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

  // Vehicle count per type
  const vehiclesByType = new Map<number, number>();
  for (const v of vehicles) {
    vehiclesByType.set(v.vehicleTypeId, (vehiclesByType.get(v.vehicleTypeId) ?? 0) + 1);
  }

  // Rate type breakdown
  const rateTypeCounts = { Hourly: 0, Daily: 0, Flat: 0 };
  for (const r of rates) {
    if (new Date(r.validTo) > now) rateTypeCounts[r.rateType]++;
  }

  return (
    <>
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Parking Areas"
          value={areas.length}
          sub={`${activeAreas} open`}
          color="bg-primary"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
        />
        <StatCard
          label="Total Capacity"
          value={totalCapacity}
          sub="parking slots"
          color="bg-secondary"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
        />
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          sub={`${totalOccupied} / ${totalCapacity} slots`}
          color={occupancyPct > 80 ? "bg-danger" : occupancyPct > 50 ? "bg-warning" : "bg-success"}
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
        />
        <StatCard
          label="Vehicles"
          value={vehicles.length}
          sub="registered"
          color="bg-tertiary"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M2 9h20M5 20h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2zM6 9V6a2 2 0 012-2h8a2 2 0 012 2v3" />}
        />
        <StatCard
          label="Users"
          value={activeUsers}
          sub={`of ${users.length} total`}
          color="bg-dark"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />}
        />
        <StatCard
          label="Active Rates"
          value={activeRates}
          sub={`of ${rates.length} total`}
          color="bg-success"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
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

      {/* ── Bottom Row: Vehicle Types + Rates Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Types Breakdown */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-dark">Vehicles by Type</h2>
          <div className="bg-white rounded-2xl border border-light-shade divide-y divide-light-shade">
            {vehicleTypes.length === 0 ? (
              <div className="p-6 text-center text-medium text-sm">No vehicle types.</div>
            ) : (
              vehicleTypes.map((vt) => {
                const count = vehiclesByType.get(vt.id) ?? 0;
                const pct = vehicles.length > 0 ? Math.round((count / vehicles.length) * 100) : 0;
                return (
                  <div key={vt.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-dark">{vt.name}</span>
                        <span className="text-sm font-bold text-dark">{count}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-light-shade overflow-hidden">
                        <div className="h-full rounded-full bg-tertiary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

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
  icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-light-shade p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-dark">{value}</p>
        <p className="text-xs text-medium mt-0.5">{sub}</p>
      </div>
      <p className="text-sm text-medium -mt-1">{label}</p>
    </div>
  );
}