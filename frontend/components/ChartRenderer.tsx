import React, { useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { formatTooltipValue, formatAxisTick } from '../utils/dataBeautifier';

interface ChartRendererProps {
  type: string;
  data: Record<string, any>[];
  showDownload?: boolean;
}

const COLORS = [
  "#6366F1", // brand primary
  "#3B82F6",
  "#34D399",
  "#FBBF24",
  "#EC4899",
  "#8B5CF6"
];


// Download icon component
const DownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const mainLabel = (label && label !== 'undefined') ? String(label) : (payload[0]?.name || 'N/A');
    const isMainLabelRedundant = payload[0] && payload[0].name === mainLabel;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 p-3 rounded-md shadow-lg text-sm">
        {!isMainLabelRedundant && mainLabel !== 'N/A' && (
          <p className="label text-gray-700 font-semibold mb-1">{`${mainLabel}`}</p>
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

// Custom diagonal tick for categorical or numeric x-axes
const DiagonalTick = ({ x, y, payload, formatter }: any) => {
  const raw = payload?.value;
  const text = typeof formatter === 'function' ? formatter(raw) : String(raw);
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

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, showDownload = true }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg h-[300px] flex items-center justify-center border border-gray-200">
        No data to display for this chart.
      </div>
    );
  }

  const keys = Object.keys(data[0]);
  const categoryKey = keys[0];
  const valueKeys = keys.slice(1);

  const handleDownload = async () => {
    if (!chartRef.current) return;

    try {
      // Use html2canvas to capture the chart
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff', // white
        scale: 2, // Higher quality
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `chart-${type.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Failed to download chart:', error);
    }
  };

  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'doughnut':
      case 'doughnut chart':
        if (keys.length < 2) {
            return <div className="h-[300px] flex items-center justify-center text-gray-500 p-4 text-center">Doughnut chart requires at least two columns: one for categories and one for values.</div>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Pie data={data} dataKey={valueKeys[0]} nameKey={categoryKey} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#10b981" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.7;
                const x = Number(cx) + radius * Math.cos(-Number(midAngle) * (Math.PI / 180));
                const y = Number(cy) + radius * Math.sin(-Number(midAngle) * (Math.PI / 180));
                return (
                    <text x={x} y={y} fill="#111827" textAnchor={x > Number(cx) ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                    {`${(Number(percent) * 100).toFixed(0)}%`}
                    </text>
                );
                }}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scorecard':
        const value = data[0][keys[0]];
        return (
            <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-600 text-lg capitalize">{keys[0].replace(/_/g, ' ')}</div>
                    <div className="text-6xl font-bold text-blue-600 mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                </div>
            </div>
        );
      case 'bar chart':
        if (keys.length < 2) {
            return <div className="h-[300px] flex items-center justify-center text-gray-500 p-4 text-center">Bar chart requires at least two columns: one for categories and one for values.</div>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey={categoryKey} 
                      stroke="#6b7280" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      height={80}
                      interval={0}
                      tick={<DiagonalTick formatter={(value: any) => {
                        const s = String(value);
                        return s.length > 15 ? s.substring(0, 12) + '...' : s;
                      }} />}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => formatAxisTick(value, valueKeys[0])}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}/>
                    <Legend wrapperStyle={{fontSize: "12px", color: "#374151"}}/>
                    {valueKeys.map((key, index) => (
                        <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
      case 'line chart':
        if (keys.length < 2) {
            return <div className="h-[300px] flex items-center justify-center text-gray-500 p-4 text-center">Line chart requires at least two columns: one for categories and one for values.</div>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis 
                  dataKey={categoryKey} 
                  stroke="#6b7280" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  height={80}
                  interval={0}
                  tick={<DiagonalTick formatter={(value: any) => {
                    const s = String(value);
                    return s.length > 15 ? s.substring(0, 12) + '...' : s;
                  }} />}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => formatAxisTick(value, valueKeys[0])}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: "12px", color: "#374151"}}/>
                {valueKeys.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie chart':
        if (keys.length < 2) {
            return <div className="h-[300px] flex items-center justify-center text-gray-500 p-4 text-center">Pie chart requires at least two columns: one for categories and one for values.</div>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Pie data={data} dataKey={valueKeys[0]} nameKey={categoryKey} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                // FIX: The types for recharts label properties are not always inferred correctly.
                // Explicitly cast them to Number to prevent arithmetic errors.
                const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
                const x = Number(cx) + radius * Math.cos(-Number(midAngle) * (Math.PI / 180));
                const y = Number(cy) + radius * Math.sin(-Number(midAngle) * (Math.PI / 180));
                return (
                    <text x={x} y={y} fill="white" textAnchor={x > Number(cx) ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                    {`${(Number(percent) * 100).toFixed(0)}%`}
                    </text>
                );
                }}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
        case 'scatter plot':
            if (keys.length < 2) {
                return <div className="h-[300px] flex items-center justify-center text-gray-500">Scatter plot requires at least 2 numerical data columns.</div>;
            }
            const xAxisKey = keys[0];
            const yAxisKey = keys[1];
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          type="number" 
                          dataKey={xAxisKey} 
                          name={xAxisKey} 
                          stroke="#6b7280" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          height={60}
                          tick={<DiagonalTick formatter={(value: any) => formatAxisTick(value, xAxisKey)} />}
                        />
                        <YAxis 
                          type="number" 
                          dataKey={yAxisKey} 
                          name={yAxisKey} 
                          stroke="#6b7280" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => formatAxisTick(value, yAxisKey)}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{fontSize: "12px", color: "#374151"}}/>
                        <Scatter name="Data points" data={data} fill={COLORS[0]} />
                    </ScatterChart>
                </ResponsiveContainer>
            );
        case 'heat map':
            if (keys.length < 3) {
                return <div className="h-[300px] flex items-center justify-center text-gray-500">Heat map requires 3 columns: an x-axis category, a y-axis category, and a numerical value.</div>;
            }
            const xKey = keys[0];
            const yKey = keys[1];
            const valueKey = keys[2];

            const xLabels = [...new Set(data.map(d => d[xKey]))].sort();
            const yLabels = [...new Set(data.map(d => d[yKey]))].sort();
        
            const values = data.map(d => d[valueKey]).filter((v): v is number => typeof v === 'number' && isFinite(v));
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            const getColor = (value?: number) => {
                if (value === undefined || value === null) return 'rgb(51 65 85 / 0.5)'; // bg-slate-700 with opacity
                if (max <= min) return 'rgb(56, 189, 248)'; // sky-400, for single-value case
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
                    <table className="w-full text-xs text-center border-separate" style={{borderSpacing: '2px'}}>
                        <thead>
                            <tr>
                                <th className="p-2"></th>
                                {xLabels.map((label, i) => (
                                    <th key={i} className="p-2 text-slate-400 font-normal truncate">{String(label)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {yLabels.map((yLabel, i) => (
                                <tr key={i}>
                                    <td className="p-2 text-slate-400 font-normal text-right truncate">{String(yLabel)}</td>
                                    {xLabels.map((xLabel, j) => {
                                        const entry = data.find(d => d[yKey] === yLabel && d[xKey] === xLabel);
                                        const value = entry ? entry[valueKey] : undefined;
                                        return (
                                            <td key={j} className="p-2 rounded-md relative has-tooltip" style={{ backgroundColor: getColor(value) }}>
                                                <div className='tooltip absolute z-10 bottom-full mb-2 w-max p-1.5 text-xs leading-tight text-white bg-slate-900 rounded-md shadow-lg'>
                                                    {value !== undefined ? value.toLocaleString() : 'N/A'}
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
        case 'table':
            return (
                <div className="overflow-x-auto h-[300px]">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                {keys.map(key => <th key={key} scope="col" className="px-4 py-2 font-semibold">{key}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                                    {keys.map(key => <td key={key} className="px-4 py-2 font-mono text-xs whitespace-nowrap">{String(row[key])}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
      default:
        return <div className="h-[300px] flex items-center justify-center text-gray-500">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="w-full">
      {showDownload && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleDownload}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
            title="Download chart as PNG"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      <div ref={chartRef} className="bg-white rounded-lg p-4 border border-gray-100">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartRenderer;
