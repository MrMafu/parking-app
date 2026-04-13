"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  pageSizes?: number[];
  defaultPageSize?: number;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  toolbar?: React.ReactNode;
};

export default function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No data found.",
  searchable = false,
  searchPlaceholder = "Search...",
  searchFn,
  pageSizes = [5, 10, 25, 50],
  defaultPageSize = 10,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Filter
  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return data;
    const q = search.toLowerCase();
    if (searchFn) return data.filter((row) => searchFn(row, q));
    return data.filter((row) => {
      return columns.some((col) => {
        if (col.sortValue) {
          return String(col.sortValue(row)).toLowerCase().includes(q);
        }
        const val = (row as Record<string, unknown>)[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      });
    });
  }, [data, search, searchable, searchFn, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset page on search/filter change
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handlePageSize = (v: number) => {
    setPageSize(v);
    setPage(1);
  };

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  // Selection helpers
  const allPageKeys = paged.map((row) => row[keyField] as string | number);
  const allSelected = selectable && allPageKeys.length > 0 && allPageKeys.every((k) => selectedKeys?.has(k));
  const someSelected = selectable && allPageKeys.some((k) => selectedKeys?.has(k)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (allSelected) {
      allPageKeys.forEach((k) => next.delete(k));
    } else {
      allPageKeys.forEach((k) => next.add(k));
    }
    onSelectionChange(next);
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sort?.key !== colKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-medium/50" />;
    return sort.dir === "asc"
      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: search + selection actions */}
      {(searchable || (selectable && selectedKeys && selectedKeys.size > 0)) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-medium" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-light-shade bg-white text-dark outline-none focus:border-primary w-64"
              />
            </div>
          )}
          {selectable && selectedKeys && selectedKeys.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-medium">{selectedKeys.size} selected</span>
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {paged.length === 0 ? (
        <div className="bg-white rounded-2xl border border-light-shade p-8 text-center text-medium text-sm">
          {search ? "No results match your search." : emptyMessage}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-light-shade overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-shade bg-light">
                {selectable && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="rounded accent-primary"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left px-5 py-3 font-medium text-medium ${col.className ?? ""} ${col.sortable ? "cursor-pointer select-none" : ""}`}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => {
                const rowKey = row[keyField] as string | number;
                const isSelected = selectable && selectedKeys?.has(rowKey);
                return (
                  <tr
                    key={String(rowKey)}
                    className={`${i !== paged.length - 1 ? "border-b border-light-shade" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    {selectable && (
                      <td className="w-10 px-3 py-4">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleRow(rowKey)}
                          className="rounded accent-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-4 ${col.className ?? ""}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm text-medium flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSize(Number(e.target.value))}
              className="rounded-lg border border-light-shade bg-white px-2 py-1 text-sm text-dark outline-none focus:border-primary"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1 rounded-lg hover:bg-light disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1 rounded-lg hover:bg-light disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
