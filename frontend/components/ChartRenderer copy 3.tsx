import React, { useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { formatTooltipValue, formatAxisTick } from "../utils/dataBeautifier";

// ---------------------------------------------------------------------------
// INTERFACE
// ---------------------------------------------------------------------------
interface ChartRendererProps {
  type: string;
  data: Record<string, any>[];
  showDownload?: boolean;
}

// ---------------------------------------------------------------------------
// COLORS
// ---------------------------------------------------------------------------
const COLORS = [
  "#6366F1",
  "#3B82F6",
  "#34D399",
  "#FBBF24",
  "#EC4899",
  "#8B5CF6",
];

// ---------------------------------------------------------------------------
// DOWNLOAD ICON
// ---------------------------------------------------------------------------
const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// TOOLTIP
// ---------------------------------------------------------------------------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const mainLabel =
      label && label !== "undefined"
        ? String(label)
        : payload[0]?.name || "N/A";

    const redundant = payload[0] && payload[0].name === mainLabel;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 p-3 rounded-md shadow-lg text-sm">
        {!redundant && mainLabel !== "N/A" && (
          <p className="label text-gray-700 font-semibold mb-1">{mainLabel}</p>
        )}
        {payload.map((item: any, i: number) => (
          <p key={i} style={{ color: item.color }} className="font-medium">
            {`${item.name}: ${formatTooltipValue(item.value, item.name)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ---------------------------------------------------------------------------
// HORIZONTAL TICK (NO ROTATION + MARGIN)
// ---------------------------------------------------------------------------
const SmoothTick = ({ x, y, payload, formatter }: any) => {
  const value = payload?.value;
  const text = formatter ? formatter(value) : String(value);

  return (
    <g transform={`translate(${x},${y + 10})`}>
      <text textAnchor="middle" fill="#6b7280" fontSize={12}>
        {text}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
const ChartRenderer: React.FC<ChartRendererProps> = ({
  type,
  data,
  showDownload = true,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg h-[300px] flex items-center justify-center border border-gray-200">
        No data to display for this chart.
      </div>
    );
  }

  // ----------------------------------------------
  // EXTRACT COLUMN KEYS
  // ----------------------------------------------
  const keys = Object.keys(data[0]);
  const categoryKey = keys[0];
  const valueKeys = keys.slice(1);

  // ----------------------------------------------
  // UNIVERSAL SORTING (FULLY FIXED)
  // ----------------------------------------------
  const MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const normalize = (v: any) =>
    String(v).trim().toLowerCase().replace(/\./g, "");

  const isMonth = (val: any) => {
    const v = normalize(val);
    if (MONTHS.includes(v)) return true;
    return MONTHS.some((m) => m.startsWith(v.slice(0, 3)));
  };

  let sortedData = [...data];

  // 🔥 Normalize category values
  sortedData = sortedData.map((item) => ({
    ...item,
    [categoryKey]: normalize(item[categoryKey]),
  }));

  // 1️⃣ Numeric ordering
  if (sortedData.every((d) => typeof d[categoryKey] === "number")) {
    sortedData.sort((a, b) => a[categoryKey] - b[categoryKey]);
  }
  // 2️⃣ Month ordering (supports Sep, Sept., September)
  else if (sortedData.every((d) => isMonth(d[categoryKey]))) {
    sortedData.sort((a, b) => {
      const ai = MONTHS.findIndex((m) =>
        m.startsWith(normalize(a[categoryKey]).slice(0, 3))
      );
      const bi = MONTHS.findIndex((m) =>
        m.startsWith(normalize(b[categoryKey]).slice(0, 3))
      );
      return ai - bi;
    });
  }
  // 3️⃣ Special rule: BEFORE AIOPS ALWAYS FIRST
  else if (
    sortedData.some((d) => normalize(d[categoryKey]).includes("before"))
  ) {
    sortedData.sort((a, b) => {
      const av = normalize(a[categoryKey]);
      const bv = normalize(b[categoryKey]);

      const aBefore = av.includes("before");
      const bBefore = bv.includes("before");

      if (aBefore && !bBefore) return -1;
      if (bBefore && !aBefore) return 1;

      return av.localeCompare(bv);
    });
  }
  // 4️⃣ Alphabetical fallback
  else {
    sortedData.sort((a, b) =>
      normalize(a[categoryKey]).localeCompare(normalize(b[categoryKey]))
    );
  }

  // ---------------------------------------------------------------------------
  // DOWNLOAD HANDLER
  // ---------------------------------------------------------------------------
  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `chart-${type}-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // CHART RENDERING
  // ---------------------------------------------------------------------------
  const renderChart = () => {
    switch (type.toLowerCase()) {
      /* ---------------------------
         DOUGHNUT
      --------------------------- */
      case "doughnut":
      case "doughnut chart":
        if (keys.length < 2)
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Doughnut chart requires 2+ columns.
            </div>
          );

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />

              <Pie
                data={sortedData}
                dataKey={valueKeys[0]}
                nameKey={categoryKey}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                labelLine={false}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  percent,
                }) => {
                  const r =
                    Number(innerRadius) +
                    (Number(outerRadius) - Number(innerRadius)) * 0.7;

                  const x =
                    Number(cx) + r * Math.cos(-midAngle * (Math.PI / 180));
                  const y =
                    Number(cy) + r * Math.sin(-midAngle * (Math.PI / 180));

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#111827"
                      fontSize={11}
                      dominantBaseline="central"
                      textAnchor={x > cx ? "start" : "end"}
                    >
                      {(percent * 100).toFixed(0)}%
                    </text>
                  );
                }}
              >
                {sortedData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      /* ---------------------------
         SCORECARD
      --------------------------- */
      case "scorecard":
        const val = sortedData[0][keys[0]];
        return (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-600 text-lg capitalize">
                {keys[0].replace(/_/g, " ")}
              </div>
              <div className="text-6xl font-bold text-blue-600 mt-2">
                {typeof val === "number" ? val.toLocaleString() : val}
              </div>
            </div>
          </div>
        );

      /* ---------------------------
         BAR CHART
      --------------------------- */
      case "bar chart":
        if (keys.length < 2)
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Bar chart requires 2+ columns.
            </div>
          );

        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sortedData}
              margin={{ top: 10, right: 20, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey={categoryKey}
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                interval={0}
                height={80}
                tick={
                  <SmoothTick
                    formatter={(v: any) => {
                      const s = String(v);
                      return s.length > 15 ? s.slice(0, 12) + "..." : s;
                    }}
                  />
                }
              />

              <YAxis
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatAxisTick(v, valueKeys[0])}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />

              {valueKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      /* ---------------------------
         LINE CHART
      --------------------------- */
      case "line chart":
        if (keys.length < 2)
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Line chart requires 2+ columns.
            </div>
          );

        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={sortedData}
              margin={{ top: 10, right: 20, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey={categoryKey}
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                interval={0}
                height={80}
                tick={
                  <SmoothTick
                    formatter={(v: any) => {
                      const s = String(v);
                      return s.length > 15 ? s.slice(0, 12) + "..." : s;
                    }}
                  />
                }
              />

              <YAxis
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatAxisTick(v, valueKeys[0])}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />

              {valueKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      /* ---------------------------
         PIE CHART
      --------------------------- */
      case "pie chart":
        if (keys.length < 2)
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Pie chart requires 2+ columns.
            </div>
          );

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />

              <Pie
                data={sortedData}
                dataKey={valueKeys[0]}
                nameKey={categoryKey}
                outerRadius={100}
                labelLine={false}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  percent,
                }) => {
                  const r =
                    Number(innerRadius) +
                    (Number(outerRadius) - Number(innerRadius)) * 0.5;

                  const x =
                    Number(cx) + r * Math.cos(-midAngle * (Math.PI / 180));
                  const y =
                    Number(cy) + r * Math.sin(-midAngle * (Math.PI / 180));

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="white"
                      fontSize={12}
                      dominantBaseline="central"
                      textAnchor={x > cx ? "start" : "end"}
                    >
                      {(percent * 100).toFixed(0)}%
                    </text>
                  );
                }}
              >
                {sortedData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      /* ---------------------------
         SCATTER PLOT
      --------------------------- */
      case "scatter plot":
        if (keys.length < 2)
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Scatter plot requires 2+ numerical columns.
            </div>
          );

        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                type="number"
                dataKey={keys[0]}
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                tick={
                  <SmoothTick
                    formatter={(v: any) => formatAxisTick(v, keys[0])}
                  />
                }
              />

              <YAxis
                type="number"
                dataKey={keys[1]}
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatAxisTick(v, keys[1])}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />

              <Scatter name="points" data={sortedData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      /* ---------------------------
         HEAT MAP
      --------------------------- */
      case "heat map":
        if (keys.length < 3) {
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Heat map requires 3 columns.
            </div>
          );
        }

        const xKey = keys[0];
        const yKey = keys[1];
        const valueKey = keys[2];

        const sortGeneric = (arr: any[]) => {
          const normalized = arr.map(normalize);
          const originalMap = normalized.reduce((map, val, i) => {
            map[val] = arr[i];
            return map;
          }, {} as Record<string, any>);

          if (arr.every((v) => typeof v === "number")) {
            return [...arr].sort((a, b) => a - b);
          }

          if (arr.every((v) => isMonth(v))) {
            return [...arr].sort((a, b) => {
              const ai = MONTHS.findIndex((m) =>
                m.startsWith(normalize(a).slice(0, 3))
              );
              const bi = MONTHS.findIndex((m) =>
                m.startsWith(normalize(b).slice(0, 3))
              );
              return ai - bi;
            });
          }

          if (normalized.some((v) => v.includes("before"))) {
            return [...arr].sort((a, b) => {
              const av = normalize(a);
              const bv = normalize(b);
              const aBefore = av.includes("before");
              const bBefore = bv.includes("before");
              if (aBefore && !bBefore) return -1;
              if (bBefore && !aBefore) return 1;
              return av.localeCompare(bv);
            });
          }

          return [...arr].sort((a, b) =>
            normalize(a).localeCompare(normalize(b))
          );
        };

        const xLabels = sortGeneric([
          ...new Set(sortedData.map((d) => d[xKey])),
        ]);
        const yLabels = sortGeneric([
          ...new Set(sortedData.map((d) => d[yKey])),
        ]);

        const values = sortedData
          .map((d) => d[valueKey])
          .filter((v): v is number => typeof v === "number" && isFinite(v));

        const min = Math.min(...values);
        const max = Math.max(...values);

        const getColor = (value?: number) => {
          if (value === undefined || value === null)
            return "rgb(51 65 85 / 0.5)";

          if (max === min) return "rgb(56 189 248)";

          const p = (value - min) / (max - min);
          const r = 48 + p * (56 - 48);
          const g = 63 + p * (189 - 63);
          const b = 81 + p * (248 - 81);
          return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        };

        return (
          <div className="overflow-x-auto h-[300px] p-4">
            <table
              className="w-full text-xs text-center border-separate"
              style={{ borderSpacing: "2px" }}
            >
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {xLabels.map((label, i) => (
                    <th
                      key={i}
                      className="p-2 text-slate-400 font-normal truncate"
                    >
                      {String(label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yLabels.map((yLabel, i) => (
                  <tr key={i}>
                    <td className="p-2 text-slate-400 text-right truncate">
                      {String(yLabel)}
                    </td>
                    {xLabels.map((xLabel, j) => {
                      const entry = sortedData.find(
                        (d) => d[yKey] === yLabel && d[xKey] === xLabel
                      );
                      const value = entry ? entry[valueKey] : undefined;

                      return (
                        <td
                          key={j}
                          className="p-2 rounded-md"
                          style={{ backgroundColor: getColor(value) }}
                        >
                          <span className="hidden group-hover:inline text-white text-xs">
                            {value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      /* ---------------------------
         TABLE
      --------------------------- */
      case "table":
        return (
          <div className="overflow-x-auto h-[300px]">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-600 uppercase bg-gray-100 sticky top-0">
                <tr>
                  {keys.map((key) => (
                    <th key={key} className="px-4 py-2 font-semibold">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {keys.map((key) => (
                      <td
                        key={key}
                        className="px-4 py-2 font-mono text-xs whitespace-nowrap"
                      >
                        {String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Unsupported chart type: {type}
          </div>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // MAIN RETURN
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full">
      {showDownload && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleDownload}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={chartRef}
        className="bg-white rounded-lg p-4 border border-gray-100"
      >
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartRenderer;
