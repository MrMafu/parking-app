"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Vehicle, VehicleType } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RequirePermission from "@/components/RequirePermission";

const emptyForm = { licensePlate: "", vehicleTypeId: "", color: "", ownerName: "" };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

  const fetchData = useCallback(async () => {
    const [vRes, vtRes] = await Promise.all([
      apiFetch("/vehicles"),
      apiFetch("/vehicle-types"),
    ]);
    if (vRes.ok) {
      const d = await vRes.json();
      setVehicles(d.data);
    }
    if (vtRes.ok) {
      const d = await vtRes.json();
      setVehicleTypes(d.data);
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

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      licensePlate: v.licensePlate,
      vehicleTypeId: String(v.vehicleTypeId),
      color: v.color,
      ownerName: v.ownerName,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      licensePlate: form.licensePlate,
      vehicleTypeId: Number(form.vehicleTypeId),
      color: form.color,
      ownerName: form.ownerName,
    };

    const res = editing
      ? await apiFetch(`/vehicles/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await apiFetch("/vehicles", { method: "POST", body: JSON.stringify(body) });

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
    const res = await apiFetch(`/vehicles/${deleteTarget.id}`, { method: "DELETE" });
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
        apiFetch(`/vehicles/${id}`, { method: "DELETE" })
      )
    );
    setDeleting(false);
    setSelectedKeys(new Set());
    fetchData();
  };

  if (loading) return <p className="text-medium text-sm">Loading...</p>;

  const columns = [
    { key: "plate", label: "License Plate", sortable: true, sortValue: (v: Vehicle) => v.licensePlate, render: (v: Vehicle) => <span className="font-medium text-dark">{v.licensePlate}</span> },
    { key: "type", label: "Type", sortable: true, sortValue: (v: Vehicle) => v.vehicleType?.name ?? "", render: (v: Vehicle) => <span className="text-dark">{v.vehicleType?.name ?? "—"}</span> },
    { key: "color", label: "Color", sortable: true, sortValue: (v: Vehicle) => v.color, render: (v: Vehicle) => <span className="text-dark">{v.color}</span> },
    { key: "owner", label: "Owner", sortable: true, sortValue: (v: Vehicle) => v.ownerName, className: "hidden md:table-cell", render: (v: Vehicle) => <span className="text-medium">{v.ownerName}</span> },
    {
      key: "actions", label: "", render: (v: Vehicle) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(v)} className="text-primary hover:text-primary-shade text-xs font-medium">Edit</button>
          <button onClick={() => setDeleteTarget(v)} className="text-danger hover:text-danger-shade text-xs font-medium">Delete</button>
        </div>
      )
    },
  ];

  return (
    <RequirePermission permission="vehicles.view">
      <PageHeader
        title="Vehicles"
        action={
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-shade transition">
            Add Vehicle
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={vehicles}
        keyField="id"
        emptyMessage="No vehicles found."
        searchable
        searchPlaceholder="Search vehicles..."
        searchFn={(v, q) => v.licensePlate.toLowerCase().includes(q) || v.ownerName.toLowerCase().includes(q) || v.color.toLowerCase().includes(q) || (v.vehicleType?.name ?? "").toLowerCase().includes(q)}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        toolbar={
          <button onClick={handleBulkDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-danger text-white hover:bg-danger-shade transition disabled:opacity-60">
            Delete Selected
          </button>
        }
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Vehicle" : "Add Vehicle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">License Plate</label>
            <input required value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Vehicle Type</label>
            <select required value={form.vehicleTypeId} onChange={(e) => setForm({ ...form, vehicleTypeId: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary">
              <option value="">Select type</option>
              {vehicleTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Color</label>
            <input required value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Owner Name</label>
            <input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
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
        title="Delete Vehicle"
        message={`Are you sure you want to delete vehicle "${deleteTarget?.licensePlate}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
  );
}
