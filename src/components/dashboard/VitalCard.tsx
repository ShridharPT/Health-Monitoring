import { cn } from '@/lib/utils';
import { VITAL_RANGES, VitalType } from '@/types/medical';
import { Heart, Wind, Activity, Thermometer, Droplets } from 'lucide-react';

interface VitalCardProps {
  type: VitalType;
  value: number;
  unit: string;
  label: string;
  className?: string;
  compact?: boolean;
}

const vitalIcons: Record<VitalType, React.ElementType> = {
  heart_rate: Heart,
  spo2: Droplets,
  resp_rate: Wind,
  systolic_bp: Activity,
  diastolic_bp: Activity,
  temperature: Thermometer,
};

const vitalColors: Record<VitalType, string> = {
  heart_rate: 'text-vitals-heartRate',
  spo2: 'text-vitals-spo2',
  resp_rate: 'text-vitals-respRate',
  systolic_bp: 'text-vitals-bloodPressure',
  diastolic_bp: 'text-vitals-bloodPressure',
  temperature: 'text-vitals-temperature',
};

function getVitalStatus(type: VitalType, value: number): 'normal' | 'warning' | 'critical' {
  const ranges = VITAL_RANGES[type];
  
  if (type === 'spo2') {
    if (value < ranges.criticalMin) return 'critical';
    if (value < ranges.min) return 'warning';
    return 'normal';
  }

  if ('criticalMin' in ranges && 'criticalMax' in ranges) {
    if (value < ranges.criticalMin || value > ranges.criticalMax) return 'critical';
  }
  
  if ('min' in ranges && 'max' in ranges) {
    if (value < ranges.min || value > ranges.max) return 'warning';
  }

  return 'normal';
}

export function VitalCard({ type, value, unit, label, className, compact }: VitalCardProps) {
  const Icon = vitalIcons[type];
  const status = getVitalStatus(type, value);
  const colorClass = vitalColors[type];

  if (compact) {
    return (
      <div
        className={cn(
          'p-2 rounded-lg text-center',
          status === 'normal' && 'bg-muted/50',
          status === 'warning' && 'bg-warning/10 border border-warning/30',
          status === 'critical' && 'bg-critical/10 border border-critical/30',
          className
        )}
      >
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={cn(
          'text-lg font-bold',
          status === 'normal' && colorClass,
          status === 'warning' && 'text-warning',
          status === 'critical' && 'text-critical',
        )}>
          {typeof value === 'number' ? value.toFixed(type === 'temperature' || type === 'spo2' ? 1 : 0) : value}
          <span className="text-xs font-normal ml-0.5">{unit}</span>
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'vital-card group',
        status === 'critical' && 'border-critical/50 shadow-glow-critical',
        status === 'warning' && 'border-warning/50',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'p-2 rounded-lg',
          status === 'normal' && 'bg-muted',
          status === 'warning' && 'bg-warning/20',
          status === 'critical' && 'bg-critical/20',
        )}>
          <Icon className={cn(
            'w-5 h-5',
            status === 'normal' && colorClass,
            status === 'warning' && 'text-warning',
            status === 'critical' && 'text-critical animate-heartbeat',
          )} />
        </div>
        <div className={cn(
          'status-dot',
          status === 'normal' && 'status-dot-stable',
          status === 'warning' && 'status-dot-monitoring',
          status === 'critical' && 'status-dot-critical',
        )} />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className={cn(
            'vital-value',
            status === 'normal' && colorClass,
            status === 'warning' && 'text-warning',
            status === 'critical' && 'text-critical',
          )}>
            {typeof value === 'number' ? value.toFixed(type === 'temperature' || type === 'spo2' ? 1 : 0) : value}
          </span>
          <span className="text-muted-foreground text-sm font-medium">{unit}</span>
        </div>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>

      {status !== 'normal' && (
        <div className={cn(
          'mt-3 px-2 py-1 rounded text-xs font-medium',
          status === 'warning' && 'bg-warning/10 text-warning',
          status === 'critical' && 'bg-critical/10 text-critical',
        )}>
          {status === 'warning' ? 'Outside Normal Range' : 'Critical Value'}
        </div>
      )}
    </div>
  );
}
