"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Role, Permission } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";

const emptyForm = { name: "", description: "", permissionIds: [] as number[] };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const [rolesRes, permsRes] = await Promise.all([
      apiFetch("/roles"),
      apiFetch("/roles/permissions"),
    ]);
    if (rolesRes.ok) setRoles((await rolesRes.json()).data);
    if (permsRes.ok) setPermissions((await permsRes.json()).data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description ?? "",
      permissionIds: role.permissions.map((p) => p.id),
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      description: form.description || undefined,
      permissionIds: form.permissionIds,
    };

    const res = editing
      ? await apiFetch(`/roles/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await apiFetch("/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    if (res.ok) {
      setModalOpen(false);
      fetchData();
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.message ?? "Something went wrong");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiFetch(`/roles/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteTarget(null);
      fetchData();
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.message ?? "Failed to delete role");
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const togglePermission = (id: number) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((pid) => pid !== id)
        : [...prev.permissionIds, id],
    }));
  };

  const selectAllInGroup = (group: Permission[]) => {
    const allIds = group.map((p) => p.id);
    const allSelected = allIds.every((id) => form.permissionIds.includes(id));
    setForm((prev) => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter((id) => !allIds.includes(id))
        : [...new Set([...prev.permissionIds, ...allIds])],
    }));
  };

  // Group permissions by prefix (e.g. "users", "rates", etc.)
  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const group = p.name.includes(".") ? p.name.split(".")[0] : "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});

  if (loading) return <p className="text-medium text-sm">Loading...</p>;

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-shade transition"
          >
            Add Role
          </button>
        }
      />

      {error && !modalOpen && (
        <div className="rounded-xl px-4 py-3 text-sm bg-[#fff0f0] border border-danger-tint text-danger">
          {error}
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-4">
        {roles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-light-shade p-8 text-center text-medium text-sm">
            No roles found.
          </div>
        ) : (
          roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            return (
              <div key={role.id} className="bg-white rounded-2xl border border-light-shade overflow-hidden">
                {/* Role Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-light/50 transition"
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-dark capitalize">{role.name}</h3>
                      <p className="text-xs text-medium mt-0.5">
                        {role.description ?? "No description"} &middot; {role.permissions.length} permissions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-light-shade text-medium hover:bg-light hover:text-dark transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(role); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-danger-tint text-danger hover:bg-danger/5 transition"
                    >
                      Delete
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-medium" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-medium" />
                    )}
                  </div>
                </div>

                {/* Expanded Permissions */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-light-shade pt-4">
                    {role.permissions.length === 0 ? (
                      <p className="text-sm text-medium">No permissions assigned.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((perm) => (
                          <span
                            key={perm.id}
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary"
                            title={perm.description ?? undefined}
                          >
                            {perm.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Role" : "New Role"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Name</label>
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition border border-light-shade bg-light text-dark focus:border-primary"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Description</label>
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition border border-light-shade bg-light text-dark focus:border-primary"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Permissions grouped by category */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark">Permissions</label>
            <div className="max-h-64 overflow-y-auto space-y-3 rounded-xl border border-light-shade p-3 bg-light">
              {Object.entries(permissionGroups).map(([group, perms]) => {
                const allSelected = perms.every((p) => form.permissionIds.includes(p.id));
                const someSelected = perms.some((p) => form.permissionIds.includes(p.id));
                return (
                  <div key={group}>
                    <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={() => selectAllInGroup(perms)}
                        className="accent-primary"
                      />
                      <span className="text-xs font-semibold text-dark uppercase tracking-wide">{group}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.permissionIds.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="accent-primary"
                          />
                          <span className="text-xs text-medium" title={perm.description ?? undefined}>
                            {perm.name.includes(".") ? perm.name.split(".")[1] : perm.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-medium">{form.permissionIds.length} of {permissions.length} selected</p>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm bg-[#fff0f0] border border-danger-tint text-danger">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-light-shade text-medium hover:bg-light transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-shade transition disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
