import React, { useMemo } from "react";
import { useExcel } from "../../context/excel/ExcelContext";
import "./home.scss";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import ItemsByDayEChart from "../../components/ItemsByDayEChart";

// --- Small sparkline (responsive) ---
const Sparkline: React.FC<{ data: { x: number; y: number }[] }> = ({ data }) => (
  <div className="sparkline" aria-hidden>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke="var(--accent-2)" fill="url(#spark)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// SVG defs for gradients
const ChartDefs = () => (
  <defs>
    <linearGradient id="barGradientA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--accent-1)" />
      <stop offset="100%" stopColor="var(--accent-2)" />
    </linearGradient>
    <linearGradient id="barGradientB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--accent-3)" />
      <stop offset="100%" stopColor="var(--accent-4)" />
    </linearGradient>
  </defs>
);

// Helpers
const str = (v: any) => (v ?? "").toString().trim();
const excelSerialToDate = (n: number) => new Date(Math.round((n - 25569) * 86400 * 1000));
const isoDay = (v: any): string | null => {
  if (!v) return null;
  const d = typeof v === "number" ? excelSerialToDate(v) : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const pick = (row: Record<string, any>, keys: string[]) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
};
const COLS = {
  day: ["Day", "Prep Date", "Date"],
  event: ["Event", "Full Event Name", "Event Name"],
  producer: ["Producer", "Assigned To", "Station"],
  itemName: ["Menu Item", "Item", "Menu Item Name", "Ingredient Name"],
  qty: ["Qty", "Quantity", "Qty.", "QTY"],
  unit: ["Unit", "Units"],
  kosher: ["Kosher Type", "Kosher"],
};
const NoData: React.FC<{ label?: string }> = ({ label = "No data" }) => (
  <div style={{ height: "100%", display: "grid", placeItems: "center", opacity: 0.6, fontSize: 14 }}>{label}</div>
);
// helpers near the top
const stripTags = (s: any) => String(s ?? "")
  .replace(/<[^>]*>/g, "")        // remove HTML tags
  .replace(/\s+/g, " ")           // collapse whitespace
  .trim();

const shortLabel = (s: string, max = 28) =>
  s.length <= max ? s : s.slice(0, max - 1) + "…";

// ---- replace your topItemsForUnit with this:
const topItemsForUnit = (unit: string, limit = 10) => {
  const map: Record<string, number> = {};
  for (const r of rows) {
    if (str(pickBy(r, KEYMAP.unit)) !== unit) continue;

    // always coerce to a clean string
    const rawName = stripTags(pickBy(r, KEYMAP.itemName));
    const name = rawName || "—";

    const qty = Number(pickBy(r, KEYMAP.qty) ?? 0);
    map[name] = (map[name] || 0) + (isNaN(qty) ? 0 : qty);
  }

  return Object.entries(map)
    .map(([item, qty]) => ({ item, qty, itemShort: shortLabel(item) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
};


// Canonicalize keys and fuzzy-find actual column names in the sheet
const canon = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const findKey = (keys: string[], aliases: string[], fuzzy: string[] = []) => {
  const ck = keys.map(k => ({ raw: k, c: canon(k) }));
  // 1) exact alias match
  for (const a of aliases) {
    const ca = canon(a);
    const hit = ck.find(k => k.c === ca);
    if (hit) return hit.raw;
  }
  // 2) fuzzy includes (e.g., "prepdate", "eventname", "assignedto")
  for (const f of fuzzy) {
    const cf = canon(f);
    const hit = ck.find(k => k.c.includes(cf));
    if (hit) return hit.raw;
  }
  return null;
};

// Build a runtime key map from your actual spreadsheet headers
const buildKeyMap = (sampleRow: Record<string, any> | undefined) => {
  const keys = sampleRow ? Object.keys(sampleRow) : [];
  return {
    day: findKey(keys, ["Day", "Prep Date", "Date"], ["prep", "date", "day"]),
    event: findKey(keys, ["Event", "Full Event Name", "Event Name"], ["event", "name"]),
    producer: findKey(keys, ["Producer", "Assigned To", "Station"], ["producer", "assigned", "station"]),
    itemName: findKey(keys, ["Menu Item", "Item", "Menu Item Name", "Ingredient Name"], ["menuitem","item","ingredient"]),
    qty: findKey(keys, ["Qty", "Quantity", "Qty.", "QTY"], ["qty", "quantity"]),
    unit: findKey(keys, ["Unit", "Units"], ["unit"]),
    kosher: findKey(keys, ["Kosher Type", "Kosher"], ["kosher"]),
  };
};

// safer pick that uses the resolved key map
const pickBy = (row: Record<string, any>, key: string | null) =>
  key ? row?.[key] : null;


// Label wrapping
const wrapLabelLines = (value: string, maxChars = 10, maxLines = 3): string[] => {
  if (!value) return [""];
  const words = String(value).split(" ");
  const lines: string[] = [];
  let current = "";
  const push = () => { if (current) { lines.push(current.trim()); current = ""; } };
  for (const w of words) {
    if (w.length > maxChars) {
      push();
      const chunks = w.match(new RegExp(`.{1,${maxChars}}`, "g")) || [w];
      for (const c of chunks) { if (lines.length >= maxLines) break; lines.push(c); }
      if (lines.length >= maxLines) break;
      continue;
    }
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars) { push(); current = w; }
    else { current = next; }
    if (lines.length >= maxLines) break;
  }
  push();
  if (lines.length > maxLines) lines.length = maxLines;
  return lines.length ? lines : [String(value)];
};
export const renderWrappedTick = (props: any, maxChars = 10, maxLines = 3) => {
  const { x, y, payload } = props;
  const lines = wrapLabelLines(payload?.value ?? "", maxChars, maxLines);
  const lineHeight = 12;
  const totalH = lineHeight * lines.length;
  return (
    <g transform={`translate(${x},${y + 10})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={i * lineHeight - totalH + lineHeight * lines.length} textAnchor="middle" fontSize={11} fill="#a9a9a9">
          {line}
        </text>
      ))}
    </g>
  );
};

// ---------- Component ----------
const Home: React.FC = () => {
  const { excelData } = useExcel();
  const rows = useMemo(() => {

    if (!excelData?.length) return [];
    if (Array.isArray(excelData[0])) {
      const headers: string[] = excelData[0].map((h: any, i: number) => (h ?? `Col_${i + 1}`).toString().trim());
      return excelData.slice(1).map((row: any[]) => Object.fromEntries(headers.map((h, i) => [h, row?.[i] ?? null])));
    }
    return excelData as Array<Record<string, any>>;
  }, [excelData]);
   
  const KEYMAP = useMemo(() => buildKeyMap(rows[0]), [rows]);

  // KPIs
  const kpis = useMemo(() => {
    const total = rows.length;
    const uniqueItems = new Set(rows.map((r) => str(pick(r, COLS.itemName) || ""))).size;
    const scheduled = rows.filter((r) => isoDay(pick(r, COLS.day))).length;
    const events = new Set(rows.map((r) => str(pick(r, COLS.event) || ""))).size;
    return { total, uniqueItems, scheduled, unscheduled: total - scheduled, events };
  }, [rows]);



  
  // Charts data
  const itemsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const d = isoDay(pick(r, COLS.day));
      if (d) map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
  }, [rows]);
  const workloadByProducer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(pick(r, COLS.producer) || "Unassigned");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([producer, count]) => ({ producer, count }));
  }, [rows]);
  const kosherBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(pick(r, COLS.kosher) || "Unknown");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([kosherType, count]) => ({ kosherType, count }));
  }, [rows]);
  const itemsByEvent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(pick(r, COLS.event) || "Unknown");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([event, count]) => ({ event, count }));
  }, [rows]);
  const topItemsForUnit = (unit: string, limit = 10) => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (str(pick(r, COLS.unit)) !== unit) continue;
      const name = str(pick(r, COLS.itemName) || "—");
      const qty = Number(pick(r, COLS.qty) ?? 0);
      map[name] = (map[name] || 0) + (isNaN(qty) ? 0 : qty);
    }
    return Object.entries(map).map(([item, qty]) => ({ item, qty })).sort((a, b) => b.qty - a.qty).slice(0, limit);
  };
  const topEA = useMemo(() => topItemsForUnit("EA", 10), [rows]);
  const pctScheduled = kpis.total > 0 ? Math.round((kpis.scheduled / kpis.total) * 100) : 0;
  const yAxisWidth = useMemo(() => {
    const maxLen = topEA.reduce((m, d) => Math.max(m, d.item.length), 0);
    return Math.min(240, Math.max(100, Math.round(maxLen * 7) + 12));
  }, [topEA]);
  if (!rows.length) {
    return (
      <div className="home" style={{ padding: 16 }}>
        <div className="box empty">Upload an Excel file on the <strong>Upload</strong> page to see Preppery KPIs and charts.</div>
      </div>
    );
  }

  const pieColors = ["var(--accent-3)", "var(--accent-2)", "var(--accent-1)", "var(--accent-4)"];

  return (
    <main className="home container">
      {/* KPI section */}
      
      <section className="box kpis">
        <div className="panel-title">Overview</div>
        <div className="kpi-grid">
          <div className="metric"><div className="icon">📦</div><div className="meta"><div className="label">Total line items</div><div className="value">{kpis.total}</div></div><Sparkline data={itemsByDay.map((d, i) => ({ x: i, y: d.count }))} /></div>
          <div className="metric"><div className="icon">🍽️</div><div className="meta"><div className="label">Unique menu items</div><div className="value">{kpis.uniqueItems}</div></div><Sparkline data={itemsByEvent.map((d, i) => ({ x: i, y: d.count }))} /></div>
          <div className="metric"><div className="icon">✅</div><div className="meta"><div className="label">Scheduled (count)</div><div className="value">{kpis.scheduled}</div></div></div>
          <div className="metric"><div className="icon">🕒</div><div className="meta"><div className="label">Unscheduled (count)</div><div className="value">{kpis.unscheduled}</div></div></div>
          <div className="metric span-2"><div className="icon">🗓️</div><div className="meta"><div className="label">Scheduled completion</div><div className="value">{pctScheduled}%</div></div><div className="progress"><span style={{ width: `${pctScheduled}%` }} /></div></div>
          <div className="metric"><div className="icon">🎪</div><div className="meta"><div className="label">Events</div><div className="value">{kpis.events}</div></div></div>
        </div>
      </section>

<section className="box topEA">
      <div className="panel-title">Top Items by Qty (EA)</div>
      <div className="chart chart--tall">
        {topEA.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topEA}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 16, left: 8 }}
              barCategoryGap={6}
              barGap={2}
            >
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="item"
                width={yAxisWidth}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any, name, payload: any) => {
                  const fullName = payload?.payload?.item ?? "";
                  if (name === "qty") return [value, fullName];
                  return [value, name];
                }}
                labelFormatter={() => ""}
              />
              <Legend wrapperStyle={{ display: "var(--legend-display)" }} />
              <Bar dataKey="qty" name="Qty" fill="url(#barGradientB)" radius={[0, 8, 8, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData label="No item quantity data" />
        )}
      </div>
    </section>


      {/* Workload by Producer */}
      <section className="box"><div className="panel-title">Workload by Producer</div><div className="chart">{workloadByProducer.length ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={workloadByProducer}><ChartDefs /><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="producer" tick={(p) => renderWrappedTick(p, 10, 2)} /><YAxis /><Tooltip /><Legend wrapperStyle={{ display: "var(--legend-display)" }} /><Bar dataKey="count" fill="url(#barGradientB)" /></BarChart></ResponsiveContainer>) : <NoData label="No producer data" />}</div></section>

      {/* Items by Event */}
      <section className="box"><div className="panel-title">Line Items by Event</div><div className="chart">{itemsByEvent.length ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={itemsByEvent}><ChartDefs /><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="event" tick={(p) => renderWrappedTick(p, 12, 3)} /><YAxis /><Tooltip /><Legend wrapperStyle={{ display: "var(--legend-display)" }} /><Bar dataKey="count" fill="url(#barGradientA)" /></BarChart></ResponsiveContainer>) : <NoData label="No event data" />}</div></section>

      {/* Kosher */}
      <section className="box"><div className="panel-title">Kosher Type Breakdown</div><div className="chart">{kosherBreakdown.length ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip /><Legend wrapperStyle={{ display: "var(--legend-display)" }} /><Pie data={kosherBreakdown} dataKey="count" nameKey="kosherType">{kosherBreakdown.map((_, i) => (<Cell key={i} fill={pieColors[i % pieColors.length]} />))}</Pie></PieChart></ResponsiveContainer>) : <NoData label="No kosher data" />}</div></section>

    </main>
  );
};

export default Home;
