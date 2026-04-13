"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { ParkingArea } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RequirePermission from "@/components/RequirePermission";

const STATUS_OPTIONS = ["Open", "Closed", "Maintenance"] as const;
const STATUS_STYLES: Record<ParkingArea["status"], string> = {
  Open: "bg-success text-white",
  Closed: "bg-medium text-white",
  Maintenance: "bg-warning text-dark",
};

type FormState = { name: string; capacity: string; location: string; status: ParkingArea["status"] };
const emptyForm: FormState = { name: "", capacity: "", location: "", status: "Open" };

export default function ParkingAreasPage() {
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ParkingArea | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ParkingArea | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

  const fetchData = useCallback(async () => {
    const res = await apiFetch("/parking-areas");
    if (res.ok) {
      const d = await res.json();
      setAreas(d.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (area: ParkingArea) => {
    setEditing(area);
    setForm({ name: area.name, capacity: String(area.capacity), location: area.location ?? "", status: area.status });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: form.name,
      capacity: Number(form.capacity),
      location: form.location || undefined,
      status: form.status,
    };

    const res = editing
      ? await apiFetch(`/parking-areas/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await apiFetch("/parking-areas", { method: "POST", body: JSON.stringify(body) });

    if (!res.ok) {
      const d = await res.json();
      setError(d.message || "Failed to save");
      setSaving(false);
      return;
    }

    setModalOpen(false);
    setSaving(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiFetch(`/parking-areas/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.message || "Failed to delete");
    }
    setDeleting(false);
    setDeleteTarget(null);
    fetchData();
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    setDeleting(true);
    await Promise.all(
      Array.from(selectedKeys).map((id) =>
        apiFetch(`/parking-areas/${id}`, { method: "DELETE" })
      )
    );
    setDeleting(false);
    setSelectedKeys(new Set());
    fetchData();
  };

  if (loading) return <p className="text-medium text-sm">Loading...</p>;

  const columns = [
    { key: "name", label: "Name", sortable: true, sortValue: (a: ParkingArea) => a.name, render: (a: ParkingArea) => <span className="font-medium text-dark">{a.name}</span> },
    { key: "location", label: "Location", sortable: true, sortValue: (a: ParkingArea) => a.location ?? "", className: "hidden md:table-cell", render: (a: ParkingArea) => <span className="text-medium">{a.location ?? "—"}</span> },
    { key: "capacity", label: "Capacity", sortable: true, sortValue: (a: ParkingArea) => a.capacity, render: (a: ParkingArea) => <span className="text-dark">{a.capacity}</span> },
    {
      key: "occupancy", label: "Occupancy", sortable: true, sortValue: (a: ParkingArea) => a.capacity > 0 ? a.occupied / a.capacity : 0, render: (a: ParkingArea) => {
        const pct = a.capacity > 0 ? Math.round((a.occupied / a.capacity) * 100) : 0;
        return (
          <div className="flex items-center gap-3">
            <div className="w-20 h-2 rounded-full bg-light-shade overflow-hidden">
              <div className={`h-full rounded-full ${pct > 80 ? "bg-danger" : pct > 50 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-medium text-xs">{a.occupied}/{a.capacity}</span>
          </div>
        );
      }
    },
    {
      key: "status", label: "Status", sortable: true, sortValue: (a: ParkingArea) => a.status, render: (a: ParkingArea) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>{a.status}</span>
      )
    },
    {
      key: "actions", label: "", render: (a: ParkingArea) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(a)} className="text-primary hover:text-primary-shade text-xs font-medium">Edit</button>
          <button onClick={() => setDeleteTarget(a)} className="text-danger hover:text-danger-shade text-xs font-medium">Delete</button>
        </div>
      )
    },
  ];

  return (
    <RequirePermission permission="parking_areas.view">
      <PageHeader
        title="Parking Areas"
        action={
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-shade transition">
            Add Area
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={areas}
        keyField="id"
        emptyMessage="No parking areas found."
        searchable
        searchPlaceholder="Search areas..."
        searchFn={(a, q) => a.name.toLowerCase().includes(q) || (a.location ?? "").toLowerCase().includes(q) || a.status.toLowerCase().includes(q)}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        toolbar={
          <button onClick={handleBulkDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-danger text-white hover:bg-danger-shade transition disabled:opacity-60">
            Delete Selected
          </button>
        }
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Parking Area" : "Add Parking Area"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Capacity</label>
            <input required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Location</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" placeholder="Optional" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ParkingArea["status"] })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-xl border border-light-shade text-dark hover:bg-light transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-shade transition disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Parking Area"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
  );
}
