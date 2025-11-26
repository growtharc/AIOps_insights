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

interface ChartRendererProps {
  type: string;
  data: Record<string, any>[];
  showDownload?: boolean;
}

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

    const isMainLabelRedundant = payload[0] && payload[0].name === mainLabel;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 p-3 rounded-md shadow-lg text-sm">
        {!isMainLabelRedundant && mainLabel !== "N/A" && (
          <p className="label text-gray-700 font-semibold mb-1">{mainLabel}</p>
        )}
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.color }} className="font-medium">
            {`${pld.name}: ${formatTooltipValue(pld.value, pld.name)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ---------------------------------------------------------------------------
// DIAGONAL X TICK
// ---------------------------------------------------------------------------
const DiagonalTick = ({ x, y, payload, formatter }: any) => {
  const value = payload?.value;
  const text = formatter ? formatter(value) : String(value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        transform="rotate(-45)"
        textAnchor="end"
        fill="#6b7280"
        fontSize={12}
      >
        {text}
      </text>
    </g>
  );
};

// NEW X-TICK (no rotation, margin-top: 10px)
const SmoothTick = ({ x, y, payload, formatter }: any) => {
  const value = payload?.value;
  const text = formatter ? formatter(value) : String(value);

  return (
    <g transform={`translate(${x},${y + 10})`}> 
      <text
        textAnchor="middle"
        fill="#6b7280"
        fontSize={12}
      >
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
  // Extract keys
  // ----------------------------------------------
  const keys = Object.keys(data[0]);
  const categoryKey = keys[0];
  const valueKeys = keys.slice(1);

  // 🔥 UNIVERSAL SORTING (IMPROVED)
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

  const isMonth = (val: any) => {
    if (typeof val !== "string") return false;
    const v = val.toLowerCase();
    return (
      MONTHS.includes(v) || MONTHS.some((m) => v.startsWith(m.slice(0, 3)))
    ); // support "Sep", "Oct"
  };

  let sortedData = [...data];

  // 1️⃣ Numeric sort
  if (sortedData.every((d) => typeof d[categoryKey] === "number")) {
    sortedData.sort((a, b) => a[categoryKey] - b[categoryKey]);
  }
  // 2️⃣ Month sorting (supports Sep/Sept/September)
  else if (sortedData.every((d) => isMonth(d[categoryKey]))) {
    sortedData.sort((a, b) => {
      const aIndex = MONTHS.findIndex((m) =>
        m.startsWith(String(a[categoryKey]).toLowerCase().slice(0, 3))
      );
      const bIndex = MONTHS.findIndex((m) =>
        m.startsWith(String(b[categoryKey]).toLowerCase().slice(0, 3))
      );
      return aIndex - bIndex;
    });
  }
  // 3️⃣ Before → After domain sort
  else if (
    sortedData.some((d) =>
      String(d[categoryKey]).toLowerCase().includes("before")
    )
  ) {
    sortedData.sort((a, b) => {
      const av = String(a[categoryKey]).toLowerCase();
      const bv = String(b[categoryKey]).toLowerCase();
      if (av.includes("before")) return -1;
      if (bv.includes("before")) return 1;
      return av.localeCompare(bv);
    });
  }
  // 4️⃣ Alphabetical fallback
  else {
    sortedData.sort((a, b) =>
      String(a[categoryKey]).localeCompare(String(b[categoryKey]))
    );
  }

  // ---------------------------------------------------------------------------
  // DOWNLOAD BUTTON HANDLER
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
      console.error("Failed to download:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // CHART RENDERING SWITCH
  // ---------------------------------------------------------------------------
  const renderChart = () => {
    switch (type.toLowerCase()) {
      // --------------------------------------------------
      // DOUGHNUT
      // --------------------------------------------------
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

      // --------------------------------------------------
      // SCORECARD
      // --------------------------------------------------
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

      // --------------------------------------------------
      // BAR CHART
      // --------------------------------------------------
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

      // --------------------------------------------------
      // LINE CHART
      // --------------------------------------------------
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

      // --------------------------------------------------
      // PIE CHART
      // --------------------------------------------------
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

      // --------------------------------------------------
      // SCATTER PLOT
      // --------------------------------------------------
      case "scatter plot":
        if (keys.length < 2)
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Scatter plot requires 2+ columns.
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

              <Scatter name="Data points" data={sortedData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      // --------------------------------------------------
      // HEAT MAP
      // --------------------------------------------------
      case "heat map":
        if (keys.length < 3) {
          return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Heat map requires 3 columns: an x-axis category, a y-axis
              category, and a numerical value.
            </div>
          );
        }
        const xKey = keys[0];
        const yKey = keys[1];
        const valueKey = keys[2];

        // heatmap axis uses same sorting rules
        const sortedX = [...new Set(sortedData.map((d) => d[xKey]))];
        const sortedY = [...new Set(sortedData.map((d) => d[yKey]))];

        const sortGeneric = (arr: any[]) => {
          if (arr.every((v) => typeof v === "number")) {
            return [...arr].sort((a, b) => a - b);
          }
          if (arr.every((v) => isMonth(v))) {
            return [...arr].sort((a, b) => {
              const ai = MONTHS.findIndex((m) =>
                m.startsWith(String(a).toLowerCase().slice(0, 3))
              );
              const bi = MONTHS.findIndex((m) =>
                m.startsWith(String(b).toLowerCase().slice(0, 3))
              );
              return ai - bi;
            });
          }
          if (arr.some((v) => String(v).toLowerCase().includes("before"))) {
            return [...arr].sort((a, b) => {
              const av = String(a).toLowerCase();
              const bv = String(b).toLowerCase();
              if (av.includes("before")) return -1;
              if (bv.includes("before")) return 1;
              return av.localeCompare(bv);
            });
          }
          return [...arr].sort((a, b) => String(a).localeCompare(String(b)));
        };

        const xLabels = sortGeneric(sortedX);
        const yLabels = sortGeneric(sortedY);

        const values = data
          .map((d) => d[valueKey])
          .filter((v): v is number => typeof v === "number" && isFinite(v));
        const min = Math.min(...values);
        const max = Math.max(...values);

        const getColor = (value?: number) => {
          if (value === undefined || value === null)
            return "rgb(51 65 85 / 0.5)"; // bg-slate-700 with opacity
          if (max <= min) return "rgb(56, 189, 248)"; // sky-400, for single-value case
          const percentage = (value - min) / (max - min);
          const r = 48 + percentage * (56 - 48);
          const g = 63 + percentage * (189 - 63);
          const b = 81 + percentage * (248 - 81);
          return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
        };

        return (
          <div className="overflow-x-auto h-[300px] p-4">
            <style>{`
                        .has-tooltip .tooltip { display: none; }
                        .has-tooltip:hover .tooltip { display: block; }
                    `}</style>
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
                    <td className="p-2 text-slate-400 font-normal text-right truncate">
                      {String(yLabel)}
                    </td>
                    {xLabels.map((xLabel, j) => {
                      const entry = data.find(
                        (d) => d[yKey] === yLabel && d[xKey] === xLabel
                      );
                      const value = entry ? entry[valueKey] : undefined;
                      return (
                        <td
                          key={j}
                          className="p-2 rounded-md relative has-tooltip"
                          style={{ backgroundColor: getColor(value) }}
                        >
                          <div className="tooltip absolute z-10 bottom-full mb-2 w-max p-1.5 text-xs leading-tight text-white bg-slate-900 rounded-md shadow-lg">
                            {value !== undefined
                              ? value.toLocaleString()
                              : "N/A"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      // --------------------------------------------------
      // TABLE
      // --------------------------------------------------
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
