"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Rate, VehicleType } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const RATE_TYPES = ["Hourly", "Daily", "Flat"] as const;
type FormState = { name: string; vehicleTypeId: string; rateType: Rate["rateType"]; priceCents: string; graceMinutes: string; validFrom: string; validTo: string };
const emptyForm: FormState = { name: "", vehicleTypeId: "", rateType: "Hourly", priceCents: "", graceMinutes: "0", validFrom: "", validTo: "" };

function formatCurrency(cents: number) {
  return `Rp ${(cents / 100).toLocaleString("id-ID")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Rate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    const [rRes, vtRes] = await Promise.all([
      apiFetch("/rates"),
      apiFetch("/vehicle-types"),
    ]);
    if (rRes.ok) {
      const d = await rRes.json();
      setRates(d.data);
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

  const openEdit = (r: Rate) => {
    setEditing(r);
    setForm({
      name: r.name,
      vehicleTypeId: String(r.vehicleTypeId),
      rateType: r.rateType,
      priceCents: String(r.priceCents),
      graceMinutes: String(r.graceMinutes),
      validFrom: r.validFrom.slice(0, 10),
      validTo: r.validTo.slice(0, 10),
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: form.name,
      vehicleTypeId: Number(form.vehicleTypeId),
      rateType: form.rateType,
      priceCents: Number(form.priceCents),
      graceMinutes: Number(form.graceMinutes),
      validFrom: form.validFrom,
      validTo: form.validTo,
    };

    const res = editing
      ? await apiFetch(`/rates/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await apiFetch("/rates", { method: "POST", body: JSON.stringify(body) });

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
    const res = await apiFetch(`/rates/${deleteTarget.id}`, { method: "DELETE" });
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
    { key: "name", label: "Name", render: (r: Rate) => <span className="font-medium text-dark">{r.name}</span> },
    { key: "type", label: "Vehicle Type", className: "hidden md:table-cell", render: (r: Rate) => <span className="text-medium">{r.vehicleType?.name ?? "—"}</span> },
    {
      key: "rateType", label: "Rate Type", render: (r: Rate) => (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-tertiary/10 text-tertiary">{r.rateType}</span>
      )
    },
    { key: "price", label: "Price", render: (r: Rate) => <span className="text-dark font-medium">{formatCurrency(r.priceCents)}</span> },
    { key: "validity", label: "Validity", className: "hidden lg:table-cell", render: (r: Rate) => <span className="text-medium text-xs">{formatDate(r.validFrom)} — {formatDate(r.validTo)}</span> },
    {
      key: "actions", label: "", render: (r: Rate) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(r)} className="text-primary hover:text-primary-shade text-xs font-medium">Edit</button>
          <button onClick={() => setDeleteTarget(r)} className="text-danger hover:text-danger-shade text-xs font-medium">Delete</button>
        </div>
      )
    },
  ];

  return (
    <>
      <PageHeader
        title="Rates"
        action={
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-shade transition">
            Add Rate
          </button>
        }
      />

      <DataTable columns={columns} data={rates} keyField="id" emptyMessage="No rates found." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Rate" : "Add Rate"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Vehicle Type</label>
              <select required value={form.vehicleTypeId} onChange={(e) => setForm({ ...form, vehicleTypeId: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary">
                <option value="">Select type</option>
                {vehicleTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Rate Type</label>
              <select required value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value as Rate["rateType"] })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary">
                {RATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Price (cents)</label>
              <input required type="number" min={0} value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Grace Minutes</label>
              <input type="number" min={0} value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Valid From</label>
              <input required type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Valid To</label>
              <input required type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
            </div>
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
        title="Delete Rate"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
