"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
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

      {loading ? (
        <p className="text-medium text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-light-shade p-8 text-center text-medium text-sm">
          No activity logs found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-light-shade overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-shade bg-light">
                <th className="text-left px-5 py-3 font-medium text-medium">Time</th>
                <th className="text-left px-5 py-3 font-medium text-medium">User</th>
                <th className="text-left px-5 py-3 font-medium text-medium">Action</th>
                <th className="text-left px-5 py-3 font-medium text-medium hidden lg:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={i !== logs.length - 1 ? "border-b border-light-shade" : ""}>
                  <td className="px-5 py-3 text-medium whitespace-nowrap text-xs">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium text-dark">{log.user.fullname}</p>
                      <p className="text-xs text-medium">{log.user.username}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-medium text-xs hidden lg:table-cell">
                    {log.details ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RequirePermission>
  );
}
