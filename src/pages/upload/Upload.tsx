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

  // base rows derived from raw excel rows (keep it close to source)
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

  // filters
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] =
    useState<"" | "Fulfilled" | "In Progress" | "Unfulfilled">("");
  const [producerFilter, setProducerFilter] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [unitFilter, setUnitFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    return baseData.filter(row => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (producerFilter && row.producer !== producerFilter) return false;
      if (eventFilter && row.event !== eventFilter) return false;
      if (unitFilter && row.unit !== unitFilter) return false;
      return true;
    });
  }, [baseData, statusFilter, producerFilter, eventFilter, unitFilter]);

  // table columns (resizable & hideable)
  const columns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: "item", header: "Item" },
    { accessorKey: "event", header: "Event",
      cell: (info) => <span className="muted">{info.getValue()}</span>
    },
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

  // column visibility + sizing state
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // No pagination model -> show all rows
    columnResizeMode,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    // global filter
    globalFilterFn: (row, colId, filterValue) => {
      const val = String(row.getValue(colId) ?? "").toLowerCase();
      return val.includes(String(filterValue).toLowerCase());
    },
  });

  const debouncedSearch = useDebouncedCallback((v) => setGlobalFilter(v), 150);

  // UI controls
  const [zoom, setZoom] = useState<number>(1);           // 0.75 - 1.5
  const [rowH, setRowH] = useState<number>(40);          // px

  // apply CSS variables
  const wrapStyle: React.CSSProperties = {
    ["--zoom" as any]: zoom,
    ["--rowH" as any]: `${rowH}px`,
  };

  return (
    <div className="upload-page">
      <div className="paper">
        {/* ===== Toolbar (solid buttons) ===== */}
        <div className="table-toolbar">
          <div className="title">Upload & Items</div>

          <button
            className="gbtn ghost"
            onClick={() => { setStatusFilter(""); setProducerFilter(""); setEventFilter(""); setUnitFilter(""); setGlobalFilter(""); }}
            title="Clear all filters"
          >
            Clear
          </button>
          <div className="divider" />
          <button
            className="gbtn ok"
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

        {/* ===== Second row: zoom / row height / column visibility ===== */}
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

          <div className="col-visibility">
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

        {/* ===== Table (no pagination) ===== */}
        {rows.length > 0 ? (
          <div className="table-wrap" style={wrapStyle as React.CSSProperties}>
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

                        {/* column resizer */}
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
        ) : (
          <div style={{ padding: 20, color: "#475569" }}>
            Upload a sheet to view items.
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
