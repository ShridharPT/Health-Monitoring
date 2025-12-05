import { useParams, Link, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VitalCard } from '@/components/dashboard/VitalCard';
import { VitalsChart } from '@/components/dashboard/VitalsChart';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { EventTimeline } from '@/components/dashboard/EventTimeline';
import { RecordVitalsDialog } from '@/components/dashboard/RecordVitalsDialog';
import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { usePatient } from '@/hooks/usePatients';
import { useVitals, useLatestVitals, useRealtimeVitals } from '@/hooks/useVitals';
import { useLatestPrediction, usePredictions, useRealtimePredictions } from '@/hooks/usePredictions';
import { usePatientRiskEvents } from '@/hooks/useRiskEvents';
import { useLatestForecast, useGenerateForecast } from '@/hooks/useForecasts';
import { usePatientAssignment, useMyAssignments } from '@/hooks/useAssignments';
import { usePatientPrescriptions } from '@/hooks/usePrescriptions';
import { usePatientDevices } from '@/hooks/useDevices';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  BedDouble,
  Calendar,
  Clock,
  Activity,
  TrendingUp,
  Pill,
  Cpu,
  Download,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function PatientDetails() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const { data: patient, isLoading: loadingPatient } = usePatient(patientId);
  const { data: vitals, isLoading: loadingVitals } = useVitals(patientId, 100);
  const { data: latestVitals } = useLatestVitals(patientId);
  const { data: latestPrediction } = useLatestPrediction(patientId);
  const { data: predictions } = usePredictions(patientId);
  const { data: riskEvents } = usePatientRiskEvents(patientId, 20);
  const { data: forecast } = useLatestForecast(patientId);
  const { data: assignment } = usePatientAssignment(patientId);
  const { data: prescriptions } = usePatientPrescriptions(patientId);
  const { data: devices } = usePatientDevices(patientId);
  const { data: myAssignments } = useMyAssignments(user?.id);
  const generateForecast = useGenerateForecast();

  // Enable real-time updates
  useRealtimeVitals(patientId);
  useRealtimePredictions(patientId);
  
  // Check if user has access to this patient (admin can see all, others only assigned)
  const hasAccess = user?.role === 'admin' || 
    myAssignments?.some(a => a.patient_id === patientId);

  const handleGenerateForecast = async () => {
    if (!patientId) return;
    try {
      await generateForecast.mutateAsync({ patientId });
      toast.success('Forecast generated');
    } catch (error) {
      toast.error('Failed to generate forecast');
    }
  };

  const handleDownloadReport = async () => {
    if (!patientId) return;
    try {
      const response = await fetch(`${API_URL}/reports/patient/${patientId}/pdf?report_type=daily&hours=24`);
      if (!response.ok) throw new Error('Failed to generate report');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-report-${patient?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  if (loadingPatient) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="vital-card flex flex-col items-center justify-center py-12">
          <User className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Patient not found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The patient you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/patients">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Check access after patient is loaded
  if (!hasAccess && !loadingPatient) {
    return (
      <DashboardLayout>
        <div className="vital-card flex flex-col items-center justify-center py-12">
          <User className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Access Denied</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You don't have permission to view this patient. Contact admin to assign this patient to you.
          </p>
          <Link to="/patients">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = {
    stable: { color: 'text-success', bg: 'bg-success/20', label: 'Stable' },
    monitoring: { color: 'text-warning', bg: 'bg-warning/20', label: 'Monitoring' },
    critical: { color: 'text-critical', bg: 'bg-critical/20', label: 'Critical' },
  };

  const config = statusConfig[patient.status];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link to="/patients">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
                  <Badge className={cn(config.bg, config.color, 'border-0')}>
                    {config.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{patient.age} years • {patient.gender}</span>
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-4 h-4" />
                    Room {patient.room_no}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Admitted {format(new Date(patient.admission_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <RecordVitalsDialog patientId={patient.id} />
        </div>

        {/* Current Vitals */}
        {latestVitals ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Current Vitals</h2>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(latestVitals.timestamp), 'HH:mm:ss')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <VitalCard
                type="heart_rate"
                value={latestVitals.heart_rate}
                unit="bpm"
                label="Heart Rate"
              />
              <VitalCard
                type="spo2"
                value={latestVitals.spo2}
                unit="%"
                label="SpO₂"
              />
              <VitalCard
                type="resp_rate"
                value={latestVitals.resp_rate}
                unit="/min"
                label="Resp. Rate"
              />
              <VitalCard
                type="systolic_bp"
                value={latestVitals.systolic_bp}
                unit="mmHg"
                label="Systolic BP"
              />
              <VitalCard
                type="diastolic_bp"
                value={latestVitals.diastolic_bp}
                unit="mmHg"
                label="Diastolic BP"
              />
              <VitalCard
                type="temperature"
                value={latestVitals.temperature}
                unit="°C"
                label="Temperature"
              />
            </div>
          </div>
        ) : (
          <div className="vital-card flex flex-col items-center justify-center py-8">
            <Activity className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No vitals recorded yet</p>
            <RecordVitalsDialog patientId={patient.id} trigger={
              <Button variant="link" size="sm" className="mt-2">Record first vitals</Button>
            } />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs defaultValue="trends">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="trends">Vital Trends</TabsTrigger>
                  <TabsTrigger value="forecast">Future Predictions</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateForecast}
                    disabled={generateForecast.isPending || !vitals || vitals.length < 2}
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", generateForecast.isPending && "animate-spin")} />
                    Generate Forecast
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Report
                  </Button>
                </div>
              </div>
              
              <TabsContent value="trends" className="mt-4">
                {vitals && vitals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VitalsChart
                      vitals={vitals}
                      type="heart_rate"
                      title="Heart Rate"
                      color="hsl(var(--heart-rate))"
                    />
                    <VitalsChart
                      vitals={vitals}
                      type="spo2"
                      title="SpO₂"
                      color="hsl(var(--spo2))"
                    />
                    <VitalsChart
                      vitals={vitals}
                      type="resp_rate"
                      title="Respiratory Rate"
                      color="hsl(var(--resp-rate))"
                    />
                    <VitalsChart
                      vitals={vitals}
                      type="temperature"
                      title="Temperature"
                      color="hsl(var(--temperature))"
                    />
                  </div>
                ) : (
                  <div className="vital-card flex flex-col items-center justify-center py-12">
                    <Activity className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Record vitals to see trends</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="forecast" className="mt-4">
                {forecast ? (
                  <div className="space-y-4">
                    {/* Forecast Summary */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Forecast Summary</CardTitle>
                          <Badge variant={
                            forecast.risk_projection === 'critical' ? 'destructive' :
                            forecast.risk_projection === 'declining' ? 'secondary' :
                            forecast.risk_projection === 'improving' ? 'default' : 'outline'
                          }>
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {forecast.risk_projection || 'stable'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {forecast.forecast_json?.summary || 'No summary available'}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>Horizon: {forecast.horizon_minutes} min</span>
                          <span>Confidence: {((forecast.confidence || 0.75) * 100).toFixed(0)}%</span>
                          <span>Model: {forecast.model_version}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Forecast Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ForecastChart
                        patientId={patient.id}
                        vitalType="heart_rate"
                        title="Heart Rate"
                        color="hsl(var(--heart-rate))"
                        currentValue={latestVitals?.heart_rate}
                        dangerThreshold={{ min: 50, max: 120 }}
                      />
                      <ForecastChart
                        patientId={patient.id}
                        vitalType="spo2"
                        title="SpO₂"
                        color="hsl(var(--spo2))"
                        currentValue={latestVitals?.spo2}
                        dangerThreshold={{ min: 92 }}
                      />
                      <ForecastChart
                        patientId={patient.id}
                        vitalType="resp_rate"
                        title="Respiratory Rate"
                        color="hsl(var(--resp-rate))"
                        currentValue={latestVitals?.resp_rate}
                        dangerThreshold={{ min: 10, max: 25 }}
                      />
                      <ForecastChart
                        patientId={patient.id}
                        vitalType="temperature"
                        title="Temperature"
                        color="hsl(var(--temperature))"
                        currentValue={latestVitals?.temperature}
                        dangerThreshold={{ min: 36, max: 38 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="vital-card flex flex-col items-center justify-center py-12">
                    <TrendingUp className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">No forecast available yet</p>
                    <Button 
                      variant="outline" 
                      onClick={handleGenerateForecast}
                      disabled={generateForecast.isPending || !vitals || vitals.length < 2}
                    >
                      <RefreshCw className={cn("w-4 h-4 mr-2", generateForecast.isPending && "animate-spin")} />
                      Generate Forecast
                    </Button>
                    {(!vitals || vitals.length < 2) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Need at least 2 vitals records to generate forecast
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <RiskIndicator prediction={latestPrediction} />
            <EventTimeline events={riskEvents || []} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
