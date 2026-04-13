"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import RequirePermission from "@/components/RequirePermission";

type ActivityLog = {
  id: number;
  action: string;
  details: string | null;
  createdAt: string;
  user: { id: number; fullname: string; username: string };
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/activity-logs");
    if (res.ok) {
      const d = await res.json();
      setLogs(d.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <p className="text-medium text-sm">Loading...</p>;

  const columns = [
    {
      key: "createdAt",
      label: "Time",
      sortable: true,
      sortValue: (log: ActivityLog) => new Date(log.createdAt).getTime(),
      render: (log: ActivityLog) => (
        <span className="text-medium whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</span>
      ),
    },
    {
      key: "user",
      label: "User",
      sortable: true,
      sortValue: (log: ActivityLog) => log.user.fullname,
      render: (log: ActivityLog) => (
        <div>
          <p className="font-medium text-dark">{log.user.fullname}</p>
          <p className="text-xs text-medium">{log.user.username}</p>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      sortValue: (log: ActivityLog) => log.action,
      render: (log: ActivityLog) => (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
          {log.action}
        </span>
      ),
    },
    {
      key: "details",
      label: "Details",
      className: "hidden lg:table-cell",
      render: (log: ActivityLog) => (
        <span className="text-medium text-xs">{log.details ?? "—"}</span>
      ),
    },
  ];

  return (
    <RequirePermission permission="logs.view">
      <PageHeader
        title="Activity Logs"
        action={
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-light-shade text-dark hover:bg-light transition disabled:opacity-60"
          >
            Refresh
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={logs}
        keyField="id"
        emptyMessage="No activity logs found."
        searchable
        searchPlaceholder="Search logs..."
        searchFn={(log, q) => log.user.fullname.toLowerCase().includes(q) || log.user.username.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || (log.details ?? "").toLowerCase().includes(q)}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        defaultPageSize={25}
      />
    </RequirePermission>
  );
}
