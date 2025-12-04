import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Prediction, ContributingFactor } from '@/types/medical';
import { Progress } from '@/components/ui/progress';

interface RiskIndicatorProps {
  prediction: Prediction | null;
  className?: string;
  showDetails?: boolean;
}

export function RiskIndicator({ prediction, className, showDetails = true }: RiskIndicatorProps) {
  if (!prediction) {
    return (
      <div className={cn('vital-card', className)}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="p-2 rounded-lg bg-muted">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-sm">No prediction available</span>
        </div>
      </div>
    );
  }

  const { risk_level, probability, explanation, contributing_factors } = prediction;
  const factors = contributing_factors as unknown as ContributingFactor[] || [];

  const riskConfig = {
    'Low Risk': {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/20',
      borderColor: 'border-success/30',
      progressColor: 'bg-success',
    },
    'Moderate Risk': {
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/20',
      borderColor: 'border-warning/30',
      progressColor: 'bg-warning',
    },
    'High Risk': {
      icon: AlertTriangle,
      color: 'text-critical',
      bgColor: 'bg-critical/20',
      borderColor: 'border-critical/30',
      progressColor: 'bg-critical',
    },
  };

  const config = riskConfig[risk_level];
  const Icon = config.icon;

  return (
    <div className={cn(
      'vital-card',
      risk_level === 'High Risk' && 'border-critical/50 shadow-glow-critical',
      risk_level === 'Moderate Risk' && 'border-warning/50',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>
            <Icon className={cn('w-5 h-5', config.color, risk_level === 'High Risk' && 'animate-pulse')} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">AI Risk Assessment</h3>
            <p className={cn('text-xs font-medium', config.color)}>{risk_level}</p>
          </div>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-bold',
          config.bgColor,
          config.color,
          config.borderColor,
          'border'
        )}>
          {(probability * 100).toFixed(0)}%
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Risk Probability</span>
            <span>{(probability * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', config.progressColor)}
              style={{ width: `${probability * 100}%` }}
            />
          </div>
        </div>

        {showDetails && (
          <>
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">{explanation}</p>
            </div>

            {factors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contributing Factors</p>
                <div className="space-y-1">
                  {factors.slice(0, 3).map((factor, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded text-xs',
                        factor.status === 'critical' && 'bg-critical/10 text-critical',
                        factor.status === 'warning' && 'bg-warning/10 text-warning',
                      )}
                    >
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        factor.status === 'critical' && 'bg-critical',
                        factor.status === 'warning' && 'bg-warning',
                      )} />
                      <span>{factor.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
