import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VitalCard } from '@/components/dashboard/VitalCard';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { usePatients } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { useAllLatestVitals, useRealtimeAllVitals } from '@/hooks/useVitals';
import { useAllLatestPredictions } from '@/hooks/usePredictions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Monitor, User, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Patient, Vitals, Prediction } from '@/types/medical';

interface PatientMonitorProps {
  patient: Patient;
  vitals?: Vitals;
  prediction?: Prediction;
}

function PatientMonitor({ patient, vitals, prediction }: PatientMonitorProps) {
  const statusConfig = {
    stable: { dot: 'status-dot-stable' },
    monitoring: { dot: 'status-dot-monitoring' },
    critical: { dot: 'status-dot-critical' },
  };

  return (
    <div className={cn(
      'vital-card',
      prediction?.risk_level === 'High Risk' && 'border-critical/50 shadow-glow-critical'
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{patient.name}</h3>
            <p className="text-xs text-muted-foreground">Room {patient.room_no}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={statusConfig[patient.status].dot} />
          <Link to={`/patient/${patient.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {vitals ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="font-mono text-lg font-bold text-vitals-heartRate">{vitals.heart_rate}</p>
              <p className="text-xs text-muted-foreground">HR</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="font-mono text-lg font-bold text-vitals-spo2">{vitals.spo2}%</p>
              <p className="text-xs text-muted-foreground">SpO₂</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="font-mono text-lg font-bold text-vitals-bloodPressure">
                {vitals.systolic_bp}/{vitals.diastolic_bp}
              </p>
              <p className="text-xs text-muted-foreground">BP</p>
            </div>
          </div>

          {prediction && (
            <div className={cn(
              'px-3 py-2 rounded text-sm font-medium text-center',
              prediction.risk_level === 'Low Risk' && 'bg-success/20 text-success',
              prediction.risk_level === 'Moderate Risk' && 'bg-warning/20 text-warning',
              prediction.risk_level === 'High Risk' && 'bg-critical/20 text-critical',
            )}>
              {prediction.risk_level} - {(prediction.probability * 100).toFixed(0)}%
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No vitals recorded</p>
        </div>
      )}
    </div>
  );
}

export default function Monitoring() {
  const { user } = useAuth();
  const { data: patients, isLoading } = usePatients({
    staffId: user?.id,
    role: user?.role as 'admin' | 'doctor' | 'nurse'
  });
  const { data: latestVitals, refetch: refetchVitals } = useAllLatestVitals();
  const { data: latestPredictions, refetch: refetchPredictions } = useAllLatestPredictions();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enable real-time updates
  useRealtimeAllVitals();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchVitals();
      refetchPredictions();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchVitals, refetchPredictions]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchVitals(), refetchPredictions()]);
    setIsRefreshing(false);
  };

  // Filter patients by risk
  const filteredPatients = patients?.filter((patient) => {
    if (filterRisk === 'all') return true;
    const prediction = latestPredictions?.[patient.id];
    if (filterRisk === 'high') return prediction?.risk_level === 'High Risk';
    if (filterRisk === 'moderate') return prediction?.risk_level === 'Moderate Risk';
    if (filterRisk === 'low') return prediction?.risk_level === 'Low Risk';
    return true;
  });

  // Sort by risk level (high risk first)
  const sortedPatients = [...(filteredPatients || [])].sort((a, b) => {
    const riskOrder = { 'High Risk': 0, 'Moderate Risk': 1, 'Low Risk': 2 };
    const aRisk = latestPredictions?.[a.id]?.risk_level;
    const bRisk = latestPredictions?.[b.id]?.risk_level;
    const aOrder = aRisk ? riskOrder[aRisk] : 3;
    const bOrder = bRisk ? riskOrder[bRisk] : 3;
    return aOrder - bOrder;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Live Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'admin' 
                ? 'Real-time patient vitals and risk status'
                : 'Your assigned patients - real-time vitals'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="moderate">Moderate Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Monitoring Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : sortedPatients && sortedPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPatients.map((patient) => (
              <PatientMonitor
                key={patient.id}
                patient={patient}
                vitals={latestVitals?.[patient.id]}
                prediction={latestPredictions?.[patient.id]}
              />
            ))}
          </div>
        ) : (
          <div className="vital-card flex flex-col items-center justify-center py-12">
            <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {patients?.length === 0 ? 'No patients to monitor' : 'No patients match filter'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {patients?.length === 0
                ? user?.role === 'admin' 
                  ? 'Add patients to start monitoring'
                  : 'No patients assigned to you. Contact admin for assignments.'
                : 'Try adjusting your filter settings'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
