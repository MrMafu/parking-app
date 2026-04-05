"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ParkingArea } from "@/types";

type Vehicle = { id: number };

const STATUS_STYLES: Record<ParkingArea["status"], string> = {
  Open: "bg-success text-white",
  Closed: "bg-medium text-white",
  Maintenance: "bg-warning text-dark",
};

export default function DashboardPage() {
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [areasRes, vehiclesRes] = await Promise.all([
        apiFetch("/parking-areas"),
        apiFetch("/vehicles"),
      ]);

      if (areasRes.ok) {
        const d = await areasRes.json();
        setAreas(d.data);
      }
      if (vehiclesRes.ok) {
        const d = await vehiclesRes.json();
        setVehicleCount((d.data as Vehicle[]).length);
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-medium text-sm">Loading...</p>;
  }

  const totalCapacity = areas.reduce((s, a) => s + a.capacity, 0);
  const totalOccupied = areas.reduce((s, a) => s + a.occupied, 0);
  const activeAreas = areas.filter((a) => a.status === "Open").length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Parking Areas" value={areas.length} sub={`${activeAreas} active`} color="bg-primary" />
        <StatCard label="Total Capacity" value={totalCapacity} sub="parking slots" color="bg-secondary" />
        <StatCard
          label="Occupied"
          value={totalOccupied}
          sub={`${totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0}% full`}
          color={totalOccupied / totalCapacity > 0.8 ? "bg-danger" : "bg-success"}
        />
        <StatCard
          label="Vehicles"
          value={vehicleCount ?? "—"}
          sub="registered"
          color="bg-tertiary"
        />
      </div>

      {/* Parking Areas Table */}
      <section>
        <h2 className="text-lg font-semibold text-dark mb-4">Parking Areas</h2>
        {areas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-light-shade p-8 text-center text-medium text-sm">
            No parking areas found.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-light-shade overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-shade bg-light">
                  <th className="text-left px-5 py-3 font-medium text-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-medium hidden md:table-cell">Location</th>
                  <th className="text-left px-5 py-3 font-medium text-medium">Occupancy</th>
                  <th className="text-left px-5 py-3 font-medium text-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area, i) => {
                  const pct = area.capacity > 0 ? Math.round((area.occupied / area.capacity) * 100) : 0;
                  return (
                    <tr key={area.id} className={i !== areas.length - 1 ? "border-b border-light-shade" : ""}>
                      <td className="px-5 py-4 font-medium text-dark">{area.name}</td>
                      <td className="px-5 py-4 text-medium hidden md:table-cell">{area.location ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 rounded-full bg-light-shade overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct > 80 ? "bg-danger" : pct > 50 ? "bg-warning" : "bg-success"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-medium text-xs whitespace-nowrap">{area.occupied}/{area.capacity}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[area.status]}`}>
                          {area.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-light-shade p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <span className="w-4 h-4 block bg-white/40 rounded" />
      </div>
      <div>
        <p className="text-2xl font-bold text-dark">{value}</p>
        <p className="text-xs text-medium mt-0.5">{sub}</p>
      </div>
      <p className="text-sm text-medium -mt-1">{label}</p>
    </div>
  );
}