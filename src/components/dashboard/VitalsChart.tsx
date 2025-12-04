import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import { Vitals, VITAL_RANGES, VitalType } from '@/types/medical';
import { cn } from '@/lib/utils';

interface VitalsChartProps {
  vitals: Vitals[];
  type: VitalType;
  title: string;
  color: string;
  className?: string;
}

const vitalUnits: Record<VitalType, string> = {
  heart_rate: 'bpm',
  spo2: '%',
  resp_rate: '/min',
  systolic_bp: 'mmHg',
  diastolic_bp: 'mmHg',
  temperature: '°C',
};

export function VitalsChart({ vitals, type, title, color, className }: VitalsChartProps) {
  const chartData = useMemo(() => {
    return [...vitals]
      .reverse()
      .slice(-30)
      .map((v) => ({
        time: format(new Date(v.timestamp), 'HH:mm'),
        value: v[type] as number,
        timestamp: v.timestamp,
      }));
  }, [vitals, type]);

  const ranges = VITAL_RANGES[type];
  const minValue = Math.min(...chartData.map((d) => d.value), ranges.min || ranges.criticalMin);
  const maxValue = Math.max(...chartData.map((d) => d.value), 'max' in ranges ? ranges.max : 100);
  const yDomain = [Math.floor(minValue * 0.9), Math.ceil(maxValue * 1.1)];

  return (
    <div className={cn('chart-container', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{vitalUnits[type]}</span>
      </div>
      
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis
            domain={yDomain}
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />

          {/* Normal range area */}
          {'min' in ranges && 'max' in ranges && (
            <>
              <ReferenceLine
                y={ranges.min}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={ranges.max}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            </>
          )}

          {/* Critical thresholds */}
          {'criticalMin' in ranges && (
            <ReferenceLine
              y={ranges.criticalMin}
              stroke="hsl(var(--critical))"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
          )}
          {'criticalMax' in ranges && (
            <ReferenceLine
              y={ranges.criticalMax}
              stroke="hsl(var(--critical))"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
          )}

          <Area
            type="monotone"
            dataKey="value"
            stroke="transparent"
            fill={`url(#gradient-${type})`}
          />
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: color,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
