import React, { useMemo, useState } from "react";
import "./upload.scss";
import UploadControls from "../../components/UploadControl";
import { useExcel } from "../../context/excel/ExcelContext";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

/* ---------- Helpers ---------- */
function normalizeRows(excelData: any[]): Array<Record<string, any>> {
  if (!excelData || excelData.length === 0) return [];
  const first = excelData[0];
  if (Array.isArray(first)) {
    const headers: string[] = first.map((h: any, i: number) =>
      (h ?? `Col_${i + 1}`).toString().trim()
    );
    return excelData.slice(1).map((row: any[]) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => (obj[h] = row?.[i] ?? ""));
      return obj;
    });
  }
  return excelData as Array<Record<string, any>>;
}
const str = (v: any) => (v ?? "").toString().trim();

const useDebouncedCallback = (cb: (v: string) => void, delay = 150) => {
  const [t, setT] = useState<number | null>(null);
  return (v: string) => {
    if (t) window.clearTimeout(t);
    const id = window.setTimeout(() => cb(v), delay);
    setT(id);
  };
};

/* ---------- Component ---------- */
const Upload: React.FC = () => {
  const { excelData } = useExcel();
  const rows = useMemo(() => normalizeRows(excelData || []), [excelData]);

  // map raw rows -> tidy rows for the table
  const baseData = useMemo(() => {
    return rows.map((r) => ({
      item: str(r["Menu Item"]) || str(r["Item"]),
      event: str(r["Event"]) || "Unknown",
      producer: str(r["Producer"]) || "Unassigned",
      qty: r["Qty"] ?? "",
      unit: str(r["Unit"]),
      status:
        (str(r["Producer"]) || "") === "" ? "Unfulfilled" :
        Number(r["Qty"] ?? 0) > 50 ? "In Progress" : "Fulfilled",
    }));
  }, [rows]);

  // unique lists for selects
  const producers = useMemo(
    () => Array.from(new Set(baseData.map(d => d.producer))).sort(),
    [baseData]
  );
  const events = useMemo(
    () => Array.from(new Set(baseData.map(d => d.event))).sort(),
    [baseData]
  );
  const units = useMemo(
    () => Array.from(new Set(baseData.map(d => d.unit))).sort(),
    [baseData]
  );

  // gradient filter tray state
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<"" | "Fulfilled" | "In Progress" | "Unfulfilled">("");
  const [producerFilter, setProducerFilter] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [unitFilter, setUnitFilter] = useState<string>("");

  // apply our manual filters before TanStack sorting/pagination
  const filteredData = useMemo(() => {
    return baseData.filter(row => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (producerFilter && row.producer !== producerFilter) return false;
      if (eventFilter && row.event !== eventFilter) return false;
      if (unitFilter && row.unit !== unitFilter) return false;
      return true;
    });
  }, [baseData, statusFilter, producerFilter, eventFilter, unitFilter]);

  const columns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: "item", header: "Item" },
    { accessorKey: "event", header: "Event", cell: (info) => <span className="muted">{info.getValue()}</span> },
    { accessorKey: "producer", header: "Producer" },
    { accessorKey: "qty", header: "Qty" },
    { accessorKey: "unit", header: "Unit" },
    {
      accessorKey: "status",
      header: "Fulfillment",
      cell: (info) => {
        const v = String(info.getValue());
        const cls = v === "Fulfilled" ? "ok" : v === "In Progress" ? "warn" : "bad";
        return <span className={`status ${cls}`}>{v}</span>;
      },
    },
  ], []);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, colId, filterValue) => {
      const val = String(row.getValue(colId) ?? "").toLowerCase();
      return val.includes(String(filterValue).toLowerCase());
    },
  });

  const debouncedSearch = useDebouncedCallback((v) => setGlobalFilter(v), 150);

  return (
    <div className="upload-page">
      <div className="paper">
        {/* ===== Toolbar with gradient buttons ===== */}
        <div className="table-toolbar">
          <div className="title">Upload & Items</div>

          {/* Quick status gradient buttons */}
          <button
            className={`gbtn ghost`}
            onClick={() => { setStatusFilter(""); setProducerFilter(""); setEventFilter(""); setUnitFilter(""); }}
            title="Clear all filters"
          >
            Clear
          </button>
          <div className="divider" />
          <button
            className={`gbtn ok ${statusFilter === "Fulfilled" ? "" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "Fulfilled" ? "" : "Fulfilled")}
          >
            Fulfilled
          </button>
          <button
            className="gbtn warn"
            onClick={() => setStatusFilter(statusFilter === "In Progress" ? "" : "In Progress")}
          >
            In&nbsp;Progress
          </button>
          <button
            className="gbtn bad"
            onClick={() => setStatusFilter(statusFilter === "Unfulfilled" ? "" : "Unfulfilled")}
          >
            Unfulfilled
          </button>

          <div className="divider" />

          {/* Toggle filter tray */}
          <button className="gbtn" onClick={() => setShowFilters(v => !v)}>
            {showFilters ? "Hide filters" : "Show filters"}
          </button>

          <div style={{ flex: 1 }} />

          <div className="search">
            <input
              placeholder="Search items, events, producers…"
              defaultValue={globalFilter ?? ""}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ===== Collapsible Filter Tray ===== */}
        {showFilters && (
          <div className="filters">
            <div className="field">
              <label>Producer</label>
              <select value={producerFilter} onChange={(e) => setProducerFilter(e.target.value)}>
                <option value="">Any</option>
                {producers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Event</label>
              <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                <option value="">Any</option>
                {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Unit</label>
              <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <option value="">Any</option>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="">Any</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="In Progress">In Progress</option>
                <option value="Unfulfilled">Unfulfilled</option>
              </select>
            </div>
          </div>
        )}

        {/* ===== Upload controls ===== */}
        <div style={{ padding: 14 }}>
          <UploadControls />
        </div>

        {/* ===== Empty state ===== */}
        {!rows.length && (
          <div style={{ padding: 20, color: "#475569" }}>
            Upload a sheet to view items.
          </div>
        )}

        {/* ===== Table ===== */}
        {!!rows.length && (
          <>
            <div style={{ overflow: "auto" }}>
              <table>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          onClick={h.column.getToggleSortingHandler()}
                          style={{ cursor: h.column.getCanSort() ? "pointer" : "default", whiteSpace: "nowrap" }}
                          title={h.column.getCanSort() ? "Sort" : ""}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{
                            asc: " ▲",
                            desc: " ▼",
                          }[h.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <span className="muted">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>⏮</button>
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>◀</button>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>▶</button>
              <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>⏭</button>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Upload;
