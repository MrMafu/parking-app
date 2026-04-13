"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { VehicleType } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RequirePermission from "@/components/RequirePermission";

const emptyForm = { name: "", description: "" };

export default function VehicleTypesPage() {
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VehicleType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await apiFetch("/vehicle-types");
    if (res.ok) {
      const d = await res.json();
      setTypes(d.data);
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

  const openEdit = (t: VehicleType) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description ?? "" });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = { name: form.name, description: form.description || undefined };

    const res = editing
      ? await apiFetch(`/vehicle-types/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await apiFetch("/vehicle-types", { method: "POST", body: JSON.stringify(body) });

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
    const res = await apiFetch(`/vehicle-types/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.message || "Failed to delete");
    }
    setDeleting(false);
    setDeleteTarget(null);
    fetchData();
  };

  if (loading) return <p className="text-medium text-sm">Loading...</p>;

  const columns = [
    { key: "name", label: "Name", render: (t: VehicleType) => <span className="font-medium text-dark">{t.name}</span> },
    { key: "description", label: "Description", render: (t: VehicleType) => <span className="text-medium">{t.description ?? "—"}</span> },
    {
      key: "actions", label: "", render: (t: VehicleType) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(t)} className="text-primary hover:text-primary-shade text-xs font-medium">Edit</button>
          <button onClick={() => setDeleteTarget(t)} className="text-danger hover:text-danger-shade text-xs font-medium">Delete</button>
        </div>
      )
    },
  ];

  return (
    <RequirePermission permission="vehicles.view">
      <PageHeader
        title="Vehicle Types"
        action={
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-shade transition">
            Add Type
          </button>
        }
      />

      <DataTable columns={columns} data={types} keyField="id" emptyMessage="No vehicle types found." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Vehicle Type" : "Add Vehicle Type"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" placeholder="Optional" />
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
        title="Delete Vehicle Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
  );
}
