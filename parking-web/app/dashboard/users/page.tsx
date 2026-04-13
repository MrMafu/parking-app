"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { PublicUser } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Role = { id: number; name: string };

const emptyForm = { fullname: "", username: "", email: "", password: "", roleId: "", isActive: true };

export default function UsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PublicUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    const [usersRes, rolesRes] = await Promise.all([
      apiFetch("/users"),
      apiFetch("/roles"),
    ]);
    if (usersRes.ok) {
      const d = await usersRes.json();
      setUsers(d.data);
    }
    if (rolesRes.ok) {
      const d = await rolesRes.json();
      setRoles(d.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
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

  const openEdit = (u: PublicUser) => {
    setEditing(u);
    setForm({
      fullname: u.fullname,
      username: u.username,
      email: u.email,
      password: "",
      roleId: String(u.role.id),
      isActive: u.isActive,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      fullname: form.fullname,
      username: form.username,
      email: form.email,
      roleId: Number(form.roleId),
      isActive: form.isActive,
    };
    if (form.password) body.password = form.password;

    const res = editing
      ? await apiFetch(`/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await apiFetch("/users", { method: "POST", body: JSON.stringify({ ...body, password: form.password }) });

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
    const res = await apiFetch(`/users/${deleteTarget.id}`, { method: "DELETE" });
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
    { key: "fullname", label: "Name", render: (u: PublicUser) => <span className="font-medium text-dark">{u.fullname}</span> },
    { key: "username", label: "Username", render: (u: PublicUser) => <span className="text-medium">{u.username}</span> },
    { key: "email", label: "Email", className: "hidden md:table-cell", render: (u: PublicUser) => <span className="text-medium">{u.email}</span> },
    { key: "role", label: "Role", render: (u: PublicUser) => (
      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary/10 text-secondary">{u.role.name}</span>
    )},
    { key: "status", label: "Status", render: (u: PublicUser) => (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? "bg-success text-white" : "bg-medium text-white"}`}>
        {u.isActive ? "Active" : "Inactive"}
      </span>
    )},
    {
      key: "actions", label: "", render: (u: PublicUser) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(u)} className="text-primary hover:text-primary-shade text-xs font-medium">Edit</button>
          <button onClick={() => setDeleteTarget(u)} className="text-danger hover:text-danger-shade text-xs font-medium">Deactivate</button>
        </div>
      )
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        action={
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-shade transition">
            Add User
          </button>
        }
      />

      <DataTable columns={columns} data={users} keyField="id" emptyMessage="No users found." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit User" : "Add User"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Full Name</label>
            <input required value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Username</label>
              <input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Password{editing ? " (leave blank to keep)" : ""}</label>
            <input type="password" {...(editing ? {} : { required: true })} minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary" autoComplete="new-password" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Role</label>
              <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary">
                <option value="">Select role</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-dark">Status</label>
              <select value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })} className="w-full rounded-xl px-4 py-2.5 text-sm border border-light-shade bg-light text-dark outline-none focus:border-primary">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
        title="Deactivate User"
        message={`Are you sure you want to deactivate "${deleteTarget?.fullname}"?`}
        confirmLabel="Deactivate"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
