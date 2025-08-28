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
} from "recharts";
import ItemsByDayEChart from "../../components/ItemsByDayEChart";

import { AreaChart, Area } from "recharts";

const Sparkline: React.FC<{ data: { x: any; y: number }[] }> = ({ data }) => (
  <div className="sparkline">
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



/** SVG defs for gradients (used by Recharts bars) */
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

/** Normalize excelData: supports array-of-arrays (header row) or array-of-objects */
function normalizeRows(excelData: any[]): Array<Record<string, any>> {
  if (!excelData || excelData.length === 0) return [];
  const first = excelData[0];

  if (Array.isArray(first)) {
    const headers: string[] = first.map((h: any, i: number) =>
      (h ?? `Col_${i + 1}`).toString().trim()
    );
    return excelData.slice(1).map((row: any[]) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => (obj[h] = row?.[i] ?? null));
      return obj;
    });
  }
  return excelData as Array<Record<string, any>>;
}

// ---------- Helpers ----------
const str = (v: any) => (v ?? "").toString().trim();

const excelSerialToDate = (n: number) => {
  // Excel 1900 date system
  const ms = Math.round((n - 25569) * 86400 * 1000);
  return new Date(ms);
};

const isoDay = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  let d: Date;
  if (typeof v === "number") d = excelSerialToDate(v);
  else d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** Wrap a label by spaces or chunk long words every N chars */
/** Split by spaces and hard-wrap long words to maxChars; cap maxLines */
const wrapLabelLines = (value: string, maxChars = 10, maxLines = 3): string[] => {
  if (!value) return [""];
  const words = String(value).split(" ");
  const lines: string[] = [];
  let current = "";

  const push = () => {
    if (current) { lines.push(current.trim()); current = ""; }
  };

  for (const w of words) {
    if (w.length > maxChars) {
      push();
      const chunks = w.match(new RegExp(`.{1,${maxChars}}`, "g")) || [w];
      for (const c of chunks) {
        if (lines.length >= maxLines) break;
        lines.push(c);
      }
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

/** Multi-line tick; center aligned; adds vertical spacing */
export const renderWrappedTick = (props: any, maxChars = 10, maxLines = 3) => {
  const { x, y, payload } = props;
  const lines = wrapLabelLines(payload?.value ?? "", maxChars, maxLines);
  const lineHeight = 12;
  const totalH = lineHeight * lines.length;
  return (
    <g transform={`translate(${x},${y + 10})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={i * lineHeight - totalH + lineHeight * lines.length}
          textAnchor="middle"
          fontSize={11}
          fill="#a9a9a9"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

// ---------- Component ----------
const Home: React.FC = () => {
  const { excelData } = useExcel();
  const rows = useMemo(() => normalizeRows(excelData || []), [excelData]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const total = rows.length;
    const uniqueItems = new Set(
      rows.map((r) => str(r["Menu Item"]) || str(r["Item"]))
    ).size;
    const scheduled = rows.filter((r) => isoDay(r["Day"])).length;
    const events = new Set(rows.map((r) => str(r["Event"]))).size;
    return { total, uniqueItems, scheduled, unscheduled: total - scheduled, events };
  }, [rows]);

  // --- Charts data ---
  const itemsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const d = isoDay(r["Day"]);
      if (!d) continue;
      map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));
  }, [rows]);

  const workloadByProducer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(r["Producer"]) || "Unassigned";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([producer, count]) => ({ producer, count }));
  }, [rows]);

  const kosherBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(r["Kosher Type"]) || "Unknown";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([kosherType, count]) => ({ kosherType, count }));
  }, [rows]);

  const itemsByEvent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(r["Event"]) || "Unknown";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([event, count]) => ({ event, count }));
  }, [rows]);

  const topItemsForUnit = (unit: string, limit = 10) => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (str(r["Unit"]) !== unit) continue;
      const name = str(r["Menu Item"]) || str(r["Item"]) || "—";
      const qty = Number(r["Qty"] ?? 0);
      map[name] = (map[name] || 0) + (isNaN(qty) ? 0 : qty);
    }
    return Object.entries(map)
      .map(([item, qty]) => ({ item, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);
  };

  const topEA = useMemo(() => topItemsForUnit("EA", 10), [rows]);
  const pctScheduled = kpis.total > 0 ? Math.round((kpis.scheduled / kpis.total) * 100) : 0;

  // Empty state
  if (!rows.length) {
    return (
      <div className="home" style={{ padding: 20 }}>
        <div className="box">
          Upload an Excel file on the <strong>Upload</strong> page to see Preppery KPIs and charts.
        </div>
      </div>
    );
  }

  const pieColors = ["var(--accent-3)", "var(--accent-2)", "var(--accent-1)", "var(--accent-4)"];

  return (
    <div className="home">
      {/* KPI column */}
      <section className="box kpis">
  <div className="panel-title" style={{ marginBottom: 10 }}>Overview</div>

  <div className="kpi-grid">
    {/* Total line items */}
    <div className="metric">
      <div className="icon">📦</div>
      <div className="meta">
        <div className="label">Total line items</div>
        <div className="value">{kpis.total}</div>
      </div>
      <div className={`delta ${kpis.total >= 0 ? "up" : "down"}`}>+12%</div>
      {/* sparkline */}
      <Sparkline data={itemsByDay.map((d, i) => ({ x: i, y: d.count }))} />
    </div>

    {/* Unique menu items */}
    <div className="metric">
      <div className="icon">🍽️</div>
      <div className="meta">
        <div className="label">Unique menu items</div>
        <div className="value">{kpis.uniqueItems}</div>
      </div>
      <div className="delta up">+4%</div>
      <Sparkline data={itemsByEvent.map((d, i) => ({ x: i, y: d.count }))} />
    </div>

    {/* Scheduled % with progress bar */}
    <div className="metric" style={{ gridColumn: "1 / -1" }}>
      <div className="icon">🗓️</div>
      <div className="meta">
        <div className="label">Scheduled completion</div>
        <div className="value">{pctScheduled}%</div>
      </div>
      <div className={`delta ${pctScheduled >= 50 ? "up" : "down"}`}>
        {pctScheduled >= 50 ? "On track" : "Needs attention"}
      </div>
      <div className="progress">
        <span style={{ width: `${pctScheduled}%` }} />
      </div>
    </div>

    {/* Events count */}
    <div className="metric">
      <div className="icon">🎪</div>
      <div className="meta">
        <div className="label">Events</div>
        <div className="value">{kpis.events}</div>
      </div>
      <div className="delta up">+1</div>
      <Sparkline data={workloadByProducer.map((d, i) => ({ x: i, y: d.count }))} />
    </div>
  </div>
</section>


      {/* Items by Day (ECharts with built-in wrapping) */}
      <section className="box byDay">
        <div className="panel-title">Line Items by Production Day</div>
        <div className="chart">
          <ItemsByDayEChart data={itemsByDay} />
        </div>
      </section>

      {/* Workload by Producer (Recharts + wrapped ticks) */}
      <section className="box work">
        <div className="panel-title">Workload by Producer</div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadByProducer} margin={{ top: 8, right: 12, bottom: 48, left: 8 }}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="producer"
                interval="preserveStartEnd"   // 👈 let Recharts hide ticks when crowded
                minTickGap={8}                // 👈 extra collision guard
                height={70}                   // 👈 more space under chart
                tickMargin={6}
                tick={(p) => renderWrappedTick(p, 10, 2)}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Tickets" fill="url(#barGradientB)" radius={[8, 8, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Items by Event (Recharts + wrapped ticks) */}
      <section className="box byEvt">
        <div className="panel-title">Line Items by Event</div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itemsByEvent} margin={{ top: 8, right: 12, bottom: 72, left: 8 }}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 3" />
             <XAxis
  dataKey="event"
  interval="preserveStartEnd"
  minTickGap={8}
  height={90}
  tickMargin={8}
  tick={(p) => renderWrappedTick(p, 12, 3)}
/>
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Items" fill="url(#barGradientA)" radius={[8, 8, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Kosher Type Breakdown */}
      <section className="box kosher">
        <div className="panel-title">Kosher Type Breakdown</div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={kosherBreakdown}
                dataKey="count"
                nameKey="kosherType"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                stroke="#0e0e0e"
                strokeWidth={2}
                label={({ name, value }) => `${name}: ${value}`}
                isAnimationActive
              >
                {kosherBreakdown.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top Items by Qty (EA) (Recharts + wrapped ticks) */}
      <section className="box topEA">
        <div className="panel-title">Top Items by Qty (EA)</div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topEA} margin={{ top: 8, right: 12, bottom: 84, left: 8 }}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
  dataKey="item"
  interval="preserveStartEnd"
  minTickGap={8}
  height={100}
  tickMargin={8}
  tick={(p) => renderWrappedTick(p, 14, 3)}
/>
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="qty" name="Qty" fill="url(#barGradientB)" radius={[8, 8, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Home;
