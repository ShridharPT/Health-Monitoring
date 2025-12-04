import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Patient, Vitals, Prediction } from '@/types/medical';
import { User, BedDouble, Calendar, ChevronRight, Heart, Droplets } from 'lucide-react';
import { format } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  latestVitals?: Vitals;
  latestPrediction?: Prediction;
  className?: string;
}

export function PatientCard({ patient, latestVitals, latestPrediction, className }: PatientCardProps) {
  const statusConfig = {
    stable: { color: 'text-success', dot: 'status-dot-stable', label: 'Stable' },
    monitoring: { color: 'text-warning', dot: 'status-dot-monitoring', label: 'Monitoring' },
    critical: { color: 'text-critical', dot: 'status-dot-critical', label: 'Critical' },
  };

  const config = statusConfig[patient.status];

  const riskConfig = latestPrediction ? {
    'Low Risk': { color: 'text-success', bg: 'bg-success/20' },
    'Moderate Risk': { color: 'text-warning', bg: 'bg-warning/20' },
    'High Risk': { color: 'text-critical', bg: 'bg-critical/20' },
  }[latestPrediction.risk_level] : null;

  return (
    <Link
      to={`/patient/${patient.id}`}
      className={cn(
        'block vital-card hover:border-primary/50 transition-all duration-300 group',
        patient.status === 'critical' && 'border-critical/30',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {patient.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{patient.age}y</span>
              <span>•</span>
              <span>{patient.gender}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={config.dot} />
          <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BedDouble className="w-4 h-4" />
          <span>Room {patient.room_no}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(patient.admission_date), 'MMM d')}</span>
        </div>
      </div>

      {latestVitals && (
        <div className="flex items-center gap-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-vitals-heartRate" />
            <span className="font-mono text-sm">{latestVitals.heart_rate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-vitals-spo2" />
            <span className="font-mono text-sm">{latestVitals.spo2}%</span>
          </div>
          {riskConfig && (
            <div className={cn('ml-auto px-2 py-1 rounded text-xs font-medium', riskConfig.bg, riskConfig.color)}>
              {latestPrediction?.risk_level.replace(' Risk', '')}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end pt-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
        <span>View Details</span>
        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
