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
  useReactTable,
  VisibilityState,
  ColumnSizingState,
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

const useDebounced = (cb: (v: string) => void, delay = 150) => {
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

  const baseData = useMemo(() => {
    return rows.map((r) => {
      const item = str(r["Menu Item"]) || str(r["Item"]);
      const qtyNum = Number(r["Qty"] ?? 0);
      const producer = str(r["Producer"]);
      const status =
        !producer ? "Unfulfilled" :
        qtyNum > 50 ? "In Progress" : "Fulfilled";
      return {
        item,
        event: str(r["Event"]) || "Unknown",
        producer: producer || "Unassigned",
        qty: r["Qty"] ?? "",
        unit: str(r["Unit"]),
        status,
      };
    });
  }, [rows]);

  // lists
  const producers = useMemo(() => Array.from(new Set(baseData.map(d => d.producer))).sort(), [baseData]);
  const events = useMemo(() => Array.from(new Set(baseData.map(d => d.event))).sort(), [baseData]);
  const units = useMemo(() => Array.from(new Set(baseData.map(d => d.unit))).sort(), [baseData]);

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<"" | "Fulfilled" | "In Progress" | "Unfulfilled">("");
  const [producerFilter, setProducerFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  const filteredData = useMemo(() => {
    return baseData.filter(row => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (producerFilter && row.producer !== producerFilter) return false;
      if (eventFilter && row.event !== eventFilter) return false;
      if (unitFilter && row.unit !== unitFilter) return false;
      return true;
    });
  }, [baseData, statusFilter, producerFilter, eventFilter, unitFilter]);

  // table
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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnResizeMode] = useState<"onChange" | "onEnd">("onChange");
  const [sorting, setSorting] = useState<any>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, columnVisibility, columnSizing },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode,
    globalFilterFn: (row, colId, filterValue) =>
      String(row.getValue(colId) ?? "").toLowerCase().includes(String(filterValue).toLowerCase()),
  });

  const debouncedSearch = useDebounced((v) => setGlobalFilter(v), 150);

  // UI
  const [zoom, setZoom] = useState(1);
  const [rowH, setRowH] = useState(40);

  const wrapStyle: React.CSSProperties = {
    ["--zoom" as any]: zoom,
    ["--rowH" as any]: `${rowH}px`,
  };

  const counts = useMemo(() => ({
    fulfilled: baseData.filter(d => d.status === "Fulfilled").length,
    inprog: baseData.filter(d => d.status === "In Progress").length,
    unfulfilled: baseData.filter(d => d.status === "Unfulfilled").length,
  }), [baseData]);

  return (
    <div className="upload-page">
      <div className="paper">

        {/* ===== Toolbar Shell ===== */}
        <div className="toolbar-shell">
          <div className="table-toolbar">
            <div className="title">Upload &amp; Items</div>

            <button
              className="gbtn ghost"
              onClick={() => {
                setStatusFilter(""); setProducerFilter(""); setEventFilter(""); setUnitFilter(""); setGlobalFilter("");
              }}
              title="Clear all filters"
            >
              Clear
            </button>

            <button
              className={`gbtn ok${statusFilter === "Fulfilled" ? " active" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "Fulfilled" ? "" : "Fulfilled")}
            >
              Fulfilled <span className="badge">{counts.fulfilled}</span>
            </button>

            <button
              className={`gbtn warn${statusFilter === "In Progress" ? " active" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "In Progress" ? "" : "In Progress")}
            >
              In&nbsp;Progress <span className="badge">{counts.inprog}</span>
            </button>

            <button
              className={`gbtn bad${statusFilter === "Unfulfilled" ? " active" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "Unfulfilled" ? "" : "Unfulfilled")}
            >
              Unfulfilled <span className="badge">{counts.unfulfilled}</span>
            </button>

            <button className="gbtn accent" onClick={() => setShowFilters(v => !v)}>
              {showFilters ? "Hide filters" : "Show filters"}
            </button>

            <div className="spacer" />

            <div className="search pill">
              <input
                placeholder="Search items, events, producers…"
                defaultValue={globalFilter ?? ""}
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-controls">
            <div className="ctl">
              <label>Zoom</label>
              <input
                type="range"
                min={0.75}
                max={1.5}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
              <span>{Math.round(zoom * 100)}%</span>
            </div>

            <div className="ctl">
              <label>Row height</label>
              <input
                type="range"
                min={28}
                max={64}
                step={2}
                value={rowH}
                onChange={(e) => setRowH(parseInt(e.target.value))}
              />
              <span>{rowH}px</span>
            </div>

            <div className="columns">
              <span className="muted">Columns:</span>
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="chip" title="Toggle column">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                  />
                  {col.columnDef.header as string}
                </label>
              ))}
            </div>
          </div>
        </div>
        {/* ===== /Toolbar Shell ===== */}

        {/* uploader area */}
        <div className="uploader-wrap">
          <UploadControls />
        </div>

        {/* table */}
        {rows.length > 0 ? (
          <div className="table-wrap" style={wrapStyle as React.CSSProperties}>
            <div className="table-inner">
              <table>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          style={{ width: h.getSize() }}
                          onClick={h.column.getToggleSortingHandler()}
                          title={h.column.getCanSort() ? "Sort" : ""}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{
                            asc: " ▲",
                            desc: " ▼",
                          }[h.column.getIsSorted() as string] ?? null}
                          {h.column.getCanResize() && (
                            <div
                              onMouseDown={h.getResizeHandler()}
                              onTouchStart={h.getResizeHandler()}
                              className="resizer"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-hint">Upload a sheet to view items.</div>
        )}
      </div>
    </div>
  );
};

export default Upload;
