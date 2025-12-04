import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'critical';
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      valueColor: 'text-foreground',
    },
    success: {
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
      valueColor: 'text-success',
    },
    warning: {
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
      valueColor: 'text-warning',
    },
    critical: {
      iconBg: 'bg-critical/20',
      iconColor: 'text-critical',
      valueColor: 'text-critical',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn('vital-card', className)}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', styles.iconBg)}>
          <Icon className={cn('w-5 h-5', styles.iconColor)} />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend.isPositive ? 'text-success' : 'text-critical'
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className={cn('text-3xl font-bold font-mono', styles.valueColor)}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
