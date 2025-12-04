import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PatientCard } from '@/components/dashboard/PatientCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { AddPatientDialog } from '@/components/dashboard/AddPatientDialog';
import { usePatients } from '@/hooks/usePatients';
import { useAllLatestVitals, useRealtimeAllVitals } from '@/hooks/useVitals';
import { useAllLatestPredictions } from '@/hooks/usePredictions';
import { useRiskEvents, useRealtimeRiskEvents } from '@/hooks/useRiskEvents';
import { Users, AlertTriangle, Activity, Heart, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Index() {
  const { data: patients, isLoading: loadingPatients } = usePatients();
  const { data: latestVitals } = useAllLatestVitals();
  const { data: latestPredictions } = useAllLatestPredictions();
  const { data: riskEvents } = useRiskEvents(20);

  // Enable real-time updates
  useRealtimeAllVitals();
  useRealtimeRiskEvents();

  // Calculate stats
  const totalPatients = patients?.length || 0;
  const criticalPatients = patients?.filter((p) => p.status === 'critical').length || 0;
  const highRiskPatients = Object.values(latestPredictions || {}).filter(
    (p) => p.risk_level === 'High Risk'
  ).length;
  const stablePatients = patients?.filter((p) => p.status === 'stable').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time patient monitoring and risk assessment
            </p>
          </div>
          <AddPatientDialog />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Patients"
            value={totalPatients}
            subtitle="Currently admitted"
            icon={Users}
          />
          <StatsCard
            title="High Risk"
            value={highRiskPatients}
            subtitle="Requires attention"
            icon={AlertTriangle}
            variant="critical"
          />
          <StatsCard
            title="Critical Status"
            value={criticalPatients}
            subtitle="Immediate care needed"
            icon={Activity}
            variant="warning"
          />
          <StatsCard
            title="Stable"
            value={stablePatients}
            subtitle="Normal condition"
            icon={CheckCircle}
            variant="success"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Patients</h2>
              <a
                href="/patients"
                className="text-sm text-primary hover:underline"
              >
                View all
              </a>
            </div>

            {loadingPatients ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : patients && patients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.slice(0, 6).map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    latestVitals={latestVitals?.[patient.id]}
                    latestPrediction={latestPredictions?.[patient.id]}
                  />
                ))}
              </div>
            ) : (
              <div className="vital-card flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No patients yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first patient to get started
                </p>
                <AddPatientDialog />
              </div>
            )}
          </div>

          {/* Alerts Panel */}
          <div className="lg:col-span-1">
            <AlertPanel events={riskEvents || []} maxHeight="500px" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
