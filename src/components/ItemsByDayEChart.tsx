import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

type Point = { day: string; count: number };

/** Break by spaces; if a single word is long, chunk it every N chars */
const wrapEAxis = (value: string, maxChars = 10) => {
  if (!value) return "";
  const parts = value.split(" ");
  const lines: string[] = [];
  let current = "";

  const push = () => {
    if (current) {
      lines.push(current.trim());
      current = "";
    }
  };

  for (const p of parts) {
    if (p.length > maxChars) {
      push();
      const chunks = p.match(new RegExp(`.{1,${maxChars}}`, "g")) || [p];
      lines.push(...chunks);
      continue;
    }
    const next = current ? `${current} ${p}` : p;
    if (next.length > maxChars) {
      push();
      current = p;
    } else {
      current = next;
    }
  }
  push();
  return lines.join("\n");
};

const ItemsByDayEChart: React.FC<{ data: Point[] }> = ({ data }) => {
  const days = useMemo(() => data.map(d => d.day), [data]);
  const counts = useMemo(() => data.map(d => d.count), [data]);

  const option = {
    backgroundColor: "transparent",
    grid: { top: 24, right: 12, bottom: 48, left: 40 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      backgroundColor: "#121212",
      borderColor: "#2a2a2a",
      borderWidth: 1,
      textStyle: { color: "#eaeaea" },
      formatter: (p: any) => {
        const x = p?.[0]?.axisValueLabel ?? "";
        const y = p?.[0]?.data ?? 0;
        return `<b>${x}</b><br/>Items: <b>${y}</b>`;
      }
    },
 xAxis: {
  type: "category",
  data: days,
  axisLine: { lineStyle: { color: "#555" } },
  axisLabel: {
    color: "#a9a9a9",
    fontSize: 11,
    lineHeight: 12,
    margin: 12,
    interval: 0,             // show all categories
    hideOverlap: true,       // auto-hide if still colliding
    width: 80,               // wrap to this width
    overflow: "breakAll",    // break long words, not just spaces
    formatter: (val: string) => wrapEAxis(val, 10) // keep our manual wrap too
  }
},

    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: { color: "#a9a9a9", fontSize: 11 }
    },
    series: [
      {
        type: "bar",
        data: counts,
        barWidth: 18,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#7c5cff" },
              { offset: 1, color: "#4cc9f0" }
            ]
          },
          shadowBlur: 12,
          shadowColor: "rgba(0,0,0,0.35)",
          shadowOffsetY: 6
        },
        animationDuration: 700
      }
    ]
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
};

export default ItemsByDayEChart;
