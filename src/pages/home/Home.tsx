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

/* -------------------- Small sparkline (solid color) -------------------- */
const Sparkline: React.FC<{ data: { x: number; y: number }[] }> = ({ data }) => (
  <div className="sparkline" aria-hidden>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="monotone"
          dataKey="y"
          stroke="var(--accent-2)"
          strokeWidth={2}
          fill="var(--accent-2)"
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

/* -------------------- Helpers -------------------- */
const str = (v: any) => (v ?? "").toString().trim();
const excelSerialToDate = (n: number) => new Date(Math.round((n - 25569) * 86400 * 1000));
const isoDay = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = typeof v === "number" ? excelSerialToDate(v) : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const stripTags = (s: any) =>
  String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const canon = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const findKey = (keys: string[], aliases: string[], fuzzy: string[] = []) => {
  const ck = keys.map(k => ({ raw: k, c: canon(k) }));
  for (const a of aliases) {
    const ca = canon(a);
    const hit = ck.find(k => k.c === ca);
    if (hit) return hit.raw;
  }
  for (const f of fuzzy) {
    const cf = canon(f);
    const hit = ck.find(k => k.c.includes(cf));
    if (hit) return hit.raw;
  }
  return null;
};
const buildKeyMap = (sampleRow: Record<string, any> | undefined) => {
  const keys = sampleRow ? Object.keys(sampleRow) : [];
  return {
    day:      findKey(keys, ["Day", "Prep Date", "Date"], ["prep", "date", "day"]),
    event:    findKey(keys, ["Event", "Full Event Name", "Event Name"], ["event", "name"]),
    producer: findKey(keys, ["Producer", "Assigned To", "Station"], ["producer", "assigned", "station"]),
    itemName: findKey(keys, ["Menu Item", "Item", "Menu Item Name", "Ingredient Name"], ["menuitem","item","ingredient"]),
    qty:      findKey(keys, ["Qty", "Quantity", "Qty.", "QTY"], ["qty", "quantity"]),
    unit:     findKey(keys, ["Unit", "Units"], ["unit"]),
    kosher:   findKey(keys, ["Kosher Type", "Kosher"], ["kosher"]),
  };
};
const pickBy = (row: Record<string, any>, key: string | null) => (key ? row?.[key] : null);

/* axis label wrapping */
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
    if (next.length > maxChars) { push(); current = w; } else { current = next; }
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
      {lines.map((line: string, i: number) => (
        <text key={i} x={0} y={i * lineHeight - totalH + lineHeight * lines.length} textAnchor="middle" fontSize={11} fill="#a9a9a9">
          {line}
        </text>
      ))}
    </g>
  );
};

const NoData: React.FC<{ label?: string }> = ({ label = "No data" }) => (
  <div style={{ height: "100%", display: "grid", placeItems: "center", opacity: 0.6, fontSize: 14 }}>{label}</div>
);

/* -------------------- Component -------------------- */
const Home: React.FC = () => {
  const { excelData } = useExcel();

  /* normalize rows whether array-of-arrays or array-of-objects */
  const rows = useMemo(() => {
    if (!excelData?.length) return [];
    if (Array.isArray(excelData[0])) {
      const headers: string[] = (excelData[0] as any[]).map((h: any, i: number) =>
        (h ?? `Col_${i + 1}`).toString().trim()
      );
      return (excelData as any[]).slice(1).map((row: any[]) =>
        Object.fromEntries(headers.map((h, i) => [h, row?.[i] ?? null]))
      );
    }
    return excelData as Array<Record<string, any>>;
  }, [excelData]);

  /* resolve header names from the first row */
  const KEYMAP = useMemo(() => buildKeyMap(rows[0]), [rows]);

  /* -------- KPIs -------- */
  const kpis = useMemo(() => {
    const total = rows.length;
    const uniqueItems = new Set(rows.map((r) => str(pickBy(r, KEYMAP.itemName) || ""))).size;
    const scheduled = rows.filter((r) => isoDay(pickBy(r, KEYMAP.day))).length;
    const events = new Set(rows.map((r) => str(pickBy(r, KEYMAP.event) || ""))).size;
    return { total, uniqueItems, scheduled, unscheduled: total - scheduled, events };
  }, [rows, KEYMAP]);

  /* -------- Datasets for charts -------- */
  const itemsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const d = isoDay(pickBy(r, KEYMAP.day));
      if (!d) continue;
      map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
  }, [rows, KEYMAP]);

  const workloadByProducer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(pickBy(r, KEYMAP.producer) || "Unassigned");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([producer, count]) => ({ producer, count }));
  }, [rows, KEYMAP]);

  const kosherBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(pickBy(r, KEYMAP.kosher) || "Unknown");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([kosherType, count]) => ({ kosherType, count }));
  }, [rows, KEYMAP]);

  const itemsByEvent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = str(pickBy(r, KEYMAP.event) || "Unknown");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([event, count]) => ({ event, count }));
  }, [rows, KEYMAP]);

  const shortLabel = (s: string, max = 28) => (s.length <= max ? s : s.slice(0, max - 1) + "…");
  const topItemsForUnit = (unit: string, limit = 10) => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (str(pickBy(r, KEYMAP.unit)) !== unit) continue;
      const rawName = stripTags(pickBy(r, KEYMAP.itemName));
      const name = rawName || "—";
      const qty = Number(pickBy(r, KEYMAP.qty) ?? 0);
      map[name] = (map[name] || 0) + (isNaN(qty) ? 0 : qty);
    }
    return Object.entries(map)
      .map(([item, qty]) => ({ item, itemShort: shortLabel(item), qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);
  };
  const topEA = useMemo(() => topItemsForUnit("EA", 10), [rows, KEYMAP]);

  /* Derived KPIs */
  const pctScheduled = kpis.total ? Math.round((kpis.scheduled / kpis.total) * 100) : 0;
  const busiestDay = useMemo(() => {
    if (!itemsByDay.length) return null;
    return itemsByDay.reduce((a, b) => (b.count > a.count ? b : a));
  }, [itemsByDay]);
  const topProducer = useMemo(() => {
    if (!workloadByProducer.length) return null;
    return workloadByProducer.reduce((a, b) => (b.count > a.count ? b : a));
  }, [workloadByProducer]);

  /* early empty state */
  if (!rows.length) {
    return (
      <div className="home" style={{ padding: 16 }}>
        <div className="box empty">
          Upload an Excel file on the <strong>Upload</strong> page to see Prep Deck KPIs and charts.
        </div>
      </div>
    );
  }

  const pieColors = ["var(--accent-3)", "var(--accent-2)", "var(--accent-1)", "var(--accent-4)"];

  /* axis width for long item names */
  const yAxisWidth = useMemo(() => {
    const maxLen = topEA.reduce((m, d) => Math.max(m, d.itemShort.length), 0);
    return Math.min(260, Math.max(100, Math.round(maxLen * 7) + 12));
  }, [topEA]);

  return (
    <main className="home container">
      {/* ---------- KPIs ---------- */}
      <section className="box kpis">
        <div className="panel-title">Overview</div>
        <div className="kpi-grid">
          <div className="metric">
            <div className="icon" aria-hidden>📦</div>
            <div className="meta">
              <div className="label">Total line items</div>
              <div className="value">{kpis.total}</div>
            </div>
            <Sparkline data={itemsByDay.map((d, i) => ({ x: i, y: d.count }))} />
          </div>

          <div className="metric">
            <div className="icon" aria-hidden>🍽️</div>
            <div className="meta">
              <div className="label">Unique menu items</div>
              <div className="value">{kpis.uniqueItems}</div>
            </div>
            <Sparkline data={itemsByEvent.map((d, i) => ({ x: i, y: d.count }))} />
          </div>

          <div className="metric">
            <div className="icon" aria-hidden>✅</div>
            <div className="meta">
              <div className="label">Scheduled items</div>
              <div className="value">{kpis.scheduled}</div>
            </div>
          </div>

          <div className="metric">
            <div className="icon" aria-hidden>🕒</div>
            <div className="meta">
              <div className="label">Unscheduled items</div>
              <div className="value">{kpis.unscheduled}</div>
            </div>
          </div>

          <div className="metric span-2">
            <div className="icon" aria-hidden>🗓️</div>
            <div className="meta">
              <div className="label">Completion rate</div>
              <div className="value">{pctScheduled}%</div>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={pctScheduled} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pctScheduled}%` }} />
            </div>
          </div>

          <div className="metric">
            <div className="icon" aria-hidden>🎪</div>
            <div className="meta">
              <div className="label">Events</div>
              <div className="value">{kpis.events}</div>
            </div>
          </div>

          <div className="metric">
            <div className="icon" aria-hidden>📈</div>
            <div className="meta">
              <div className="label">Busiest day</div>
              <div className="value">{busiestDay ? busiestDay.day : "—"}</div>
            </div>
          </div>

          <div className="metric">
            <div className="icon" aria-hidden>👤</div>
            <div className="meta">
              <div className="label">Top producer</div>
              <div className="value">
                {topProducer ? `${topProducer.producer} (${topProducer.count})` : "—"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Line Items by Production Day (solid) ---------- */}
      <section className="box">
        <div className="panel-title">Line Items by Production Day</div>
        <div className="chart">
          {itemsByDay.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent-1)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData label="No day data" />
          )}
        </div>
      </section>

      {/* ---------- Workload by Producer (solid) ---------- */}
      <section className="box work">
        <div className="panel-title">Workload by Producer</div>
        <div className="chart">
          {workloadByProducer.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadByProducer} margin={{ top: 8, right: 12, bottom: 48, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="producer"
                  interval="preserveStartEnd"
                  minTickGap={8}
                  height={70}
                  tickMargin={6}
                  tick={(p) => renderWrappedTick(p, 10, 2)}
                />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ display: "var(--legend-display)" }} />
                <Bar dataKey="count" name="Tickets" fill="var(--accent-3)" radius={[8, 8, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData label="No producer data" />
          )}
        </div>
      </section>

      {/* ---------- Line Items by Event (solid) ---------- */}
      <section className="box byEvt">
        <div className="panel-title">Line Items by Event</div>
        <div className="chart">
          {itemsByEvent.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemsByEvent} margin={{ top: 8, right: 12, bottom: 72, left: 8 }}>
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
                <Legend wrapperStyle={{ display: "var(--legend-display)" }} />
                <Bar dataKey="count" name="Items" fill="var(--accent-2)" radius={[8, 8, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData label="No event data" />
          )}
        </div>
      </section>

      {/* ---------- Kosher Type Breakdown (solid) ---------- */}
      <section className="box kosher">
        <div className="panel-title">Kosher Type Breakdown</div>
        <div className="chart">
          {kosherBreakdown.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend wrapperStyle={{ display: "var(--legend-display)" }} />
                <Pie
                  data={kosherBreakdown}
                  dataKey="count"
                  nameKey="kosherType"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  stroke="#0e0e0e"
                  strokeWidth={2}
                >
                  {kosherBreakdown.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoData label="No kosher data" />
          )}
        </div>
      </section>

      {/* ---------- Top Items by Qty (EA) (solid) ---------- */}
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
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="itemShort" width={yAxisWidth} tickLine={false} />
                <Tooltip
                  formatter={(value: any, name: string, payload: any) => {
                    const fullName = payload?.payload?.item ?? "";
                    if (name === "qty") return [value, fullName];
                    return [value, name];
                  }}
                  labelFormatter={() => ""}
                />
                <Legend wrapperStyle={{ display: "var(--legend-display)" }} />
                <Bar dataKey="qty" name="Qty" fill="var(--accent-4)" radius={[0, 8, 8, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData label="No item quantity data" />
          )}
        </div>
      </section>
    </main>
  );
};

export default Home;
