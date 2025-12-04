import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLatestForecast } from '@/hooks/useForecasts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { VitalType } from '@/types/medical';

interface ForecastChartProps {
  patientId: string;
  vitalType: VitalType;
  title: string;
  color: string;
  currentValue?: number;
  dangerThreshold?: { min?: number; max?: number };
}

export function ForecastChart({ 
  patientId, 
  vitalType, 
  title, 
  color, 
  currentValue,
  dangerThreshold 
}: ForecastChartProps) {
  const { data: forecast } = useLatestForecast(patientId);

  if (!forecast?.forecast_json?.forecasts) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title} Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No forecast data available</p>
        </CardContent>
      </Card>
    );
  }

  const forecasts = forecast.forecast_json.forecasts;
  
  // Prepare chart data
  const chartData = [
    // Current value as first point
    ...(currentValue ? [{
      time: 'Now',
      value: currentValue,
      isCurrent: true
    }] : []),
    // Forecast points
    ...forecasts.map((f: any) => ({
      time: format(new Date(f.timestamp), 'HH:mm'),
      value: f[vitalType],
      confidence: f.confidence,
      isForecast: true
    }))
  ];

  // Determine trend
  const firstForecast = forecasts[0]?.[vitalType];
  const lastForecast = forecasts[forecasts.length - 1]?.[vitalType];
  const trend = lastForecast - firstForecast;

  const TrendIcon = trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const trendColor = Math.abs(trend) < 2 ? 'text-muted-foreground' : 
    (vitalType === 'spo2' && trend < 0) || 
    (vitalType !== 'spo2' && Math.abs(trend) > 10) ? 'text-destructive' : 'text-success';

  // Check if any forecast crosses danger threshold
  const hasDangerCrossing = forecasts.some((f: any) => {
    const val = f[vitalType];
    if (dangerThreshold?.min && val < dangerThreshold.min) return true;
    if (dangerThreshold?.max && val > dangerThreshold.max) return true;
    return false;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title} Forecast</CardTitle>
          <div className="flex items-center gap-2">
            {hasDangerCrossing && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Warning
              </Badge>
            )}
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs">{trend > 0 ? '+' : ''}{trend.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                domain={['auto', 'auto']}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  value.toFixed(1),
                  name === 'value' ? title : name
                ]}
              />
              {dangerThreshold?.min && (
                <ReferenceLine 
                  y={dangerThreshold.min} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Min', fontSize: 10 }}
                />
              )}
              {dangerThreshold?.max && (
                <ReferenceLine 
                  y={dangerThreshold.max} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Max', fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isCurrent) {
                    return (
                      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
                    );
                  }
                  return (
                    <circle cx={cx} cy={cy} r={3} fill={color} opacity={payload.confidence || 0.7} />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Confidence: {((forecast.confidence || 0.75) * 100).toFixed(0)}%</span>
          <Badge variant={
            forecast.risk_projection === 'critical' ? 'destructive' :
            forecast.risk_projection === 'declining' ? 'secondary' :
            forecast.risk_projection === 'improving' ? 'default' : 'outline'
          }>
            {forecast.risk_projection || 'stable'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
