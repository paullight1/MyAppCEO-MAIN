import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CapTableChartProps {
  data: { name: string; value: number; type: string; color?: string }[];
  size?: number;
}

/** Single source of truth for cap-table ownership-type colors (shared with CapTablePage). */
export const CAP_TABLE_COLORS: Record<string, string> = {
  founder: '#3b82f6',
  cofounder: '#10b981',
  investor: '#8b5cf6',
  employee: '#f59e0b',
  advisor: '#ec4899',
  option_pool: '#6b7280',
};

export const capTableColor = (type: string) => CAP_TABLE_COLORS[type] || '#6b7280';

export const CapTableChart: React.FC<CapTableChartProps> = ({ data, size = 300 }) => {
  if (!data.length) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      No cap table data available
    </div>
  );

  return (
    <div className="w-full" style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.25}
            outerRadius={size * 0.4}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color || capTableColor(entry.type)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Equity']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
