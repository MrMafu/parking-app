type Column<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
};

export default function DataTable<T>({ columns, data, keyField, emptyMessage = "No data found." }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-light-shade p-8 text-center text-medium text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-light-shade overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-light-shade bg-light">
            {columns.map((col) => (
              <th key={col.key} className={`text-left px-5 py-3 font-medium text-medium ${col.className ?? ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={String(row[keyField])} className={i !== data.length - 1 ? "border-b border-light-shade" : ""}>
              {columns.map((col) => (
                <td key={col.key} className={`px-5 py-4 ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
