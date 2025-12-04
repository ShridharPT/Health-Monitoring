import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VitalCard } from '@/components/dashboard/VitalCard';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAssignments } from '@/hooks/useAssignments';
import { usePatients } from '@/hooks/usePatients';
import { useAllLatestVitals } from '@/hooks/useVitals';
import { useNursePrescriptionInbox, useUpdatePrescriptionStatus } from '@/hooks/usePrescriptions';
import { useRiskEvents } from '@/hooks/useRiskEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Pill, MessageSquare, Activity, Check, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default function NurseDashboard() {
  const { user } = useAuth();
  const { data: assignments } = useMyAssignments(user?.id);
  const { data: patients } = usePatients({ staffId: user?.id, role: user?.role as 'admin' | 'doctor' | 'nurse' });
  const { data: latestVitals } = useAllLatestVitals();
  const { data: prescriptionInbox } = useNursePrescriptionInbox(user?.id);
  const { data: riskEvents } = useRiskEvents(20);
  const updateStatus = useUpdatePrescriptionStatus();
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);

  // Use patients from usePatients hook (filtered by assignment)
  const myPatients = patients || [];
  const pendingPrescriptions = prescriptionInbox?.filter(p => p.status === 'pending') || [];
  const acknowledgedPrescriptions = prescriptionInbox?.filter(p => p.status === 'acknowledged') || [];

  const handleAcknowledge = async (prescriptionId: string) => {
    try {
      await updateStatus.mutateAsync({ id: prescriptionId, status: 'acknowledged' });
      toast.success('Prescription acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge prescription');
    }
  };

  const handleAdminister = async (prescriptionId: string) => {
    try {
      await updateStatus.mutateAsync({ id: prescriptionId, status: 'administered' });
      toast.success('Marked as administered');
    } catch (error) {
      toast.error('Failed to update prescription');
    }
  };

  const handleComplete = async (prescriptionId: string) => {
    try {
      await updateStatus.mutateAsync({ id: prescriptionId, status: 'completed' });
      toast.success('Prescription completed');
    } catch (error) {
      toast.error('Failed to complete prescription');
    }
  };

  const handleChat = (doctorId: string) => {
    setChatPartnerId(doctorId);
    setShowChat(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nurse Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={() => setShowChat(!showChat)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat with Doctor
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{myPatients.length}</p>
                  <p className="text-sm text-muted-foreground">Assigned Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Pill className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{pendingPrescriptions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Rx</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-info" />
                <div>
                  <p className="text-2xl font-bold">{acknowledgedPrescriptions.length}</p>
                  <p className="text-sm text-muted-foreground">To Administer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Activity className="w-8 h-8 text-critical" />
                <div>
                  <p className="text-2xl font-bold">{riskEvents?.filter(e => !e.acknowledged).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Vitals */}
            <Card>
              <CardHeader>
                <CardTitle>Live Patient Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myPatients.map((patient) => patient && (
                    <div key={patient.id} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <Link to={`/patient/${patient.id}`} className="font-medium hover:underline">
                            {patient.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">Room {patient.room_no}</p>
                        </div>
                        <Badge variant={patient.status === 'critical' ? 'destructive' : patient.status === 'monitoring' ? 'secondary' : 'outline'}>
                          {patient.status}
                        </Badge>
                      </div>
                      {latestVitals?.[patient.id] ? (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          <VitalCard type="heart_rate" value={latestVitals[patient.id].heart_rate} unit="bpm" label="HR" compact />
                          <VitalCard type="spo2" value={latestVitals[patient.id].spo2} unit="%" label="SpO₂" compact />
                          <VitalCard type="resp_rate" value={latestVitals[patient.id].resp_rate} unit="/min" label="RR" compact />
                          <VitalCard type="systolic_bp" value={latestVitals[patient.id].systolic_bp} unit="mmHg" label="SBP" compact />
                          <VitalCard type="diastolic_bp" value={latestVitals[patient.id].diastolic_bp} unit="mmHg" label="DBP" compact />
                          <VitalCard type="temperature" value={latestVitals[patient.id].temperature} unit="°C" label="Temp" compact />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No vitals recorded</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Prescription Inbox */}
            <Card>
              <CardHeader>
                <CardTitle>Prescription Inbox</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending">
                  <TabsList>
                    <TabsTrigger value="pending">
                      Pending ({pendingPrescriptions.length})
                    </TabsTrigger>
                    <TabsTrigger value="acknowledged">
                      To Administer ({acknowledgedPrescriptions.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="space-y-3 mt-4">
                    {pendingPrescriptions.map((rx) => (
                      <div key={rx.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{rx.patient?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              From: Dr. {rx.doctor?.name} • {format(new Date(rx.created_at), 'HH:mm')}
                            </p>
                          </div>
                          <Badge variant={rx.priority === 'urgent' ? 'destructive' : rx.priority === 'high' ? 'secondary' : 'outline'}>
                            {rx.priority}
                          </Badge>
                        </div>
                        <div className="space-y-1 mb-3">
                          {(rx.medicines as any[])?.map((med, i) => (
                            <p key={i} className="text-sm">
                              • {med.medicine_name} {med.dosage}{med.unit} - {med.frequency}
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcknowledge(rx.id)}>
                            <Check className="w-4 h-4 mr-1" />
                            Acknowledge
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rx.doctor && handleChat(rx.doctor.id)}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingPrescriptions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No pending prescriptions</p>
                    )}
                  </TabsContent>
                  <TabsContent value="acknowledged" className="space-y-3 mt-4">
                    {acknowledgedPrescriptions.map((rx) => (
                      <div key={rx.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{rx.patient?.name}</p>
                            <p className="text-sm text-muted-foreground">Room {rx.patient?.room_no}</p>
                          </div>
                        </div>
                        <div className="space-y-1 mb-3">
                          {(rx.medicines as any[])?.map((med, i) => (
                            <p key={i} className="text-sm">
                              • {med.medicine_name} {med.dosage}{med.unit} - {med.frequency}
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAdminister(rx.id)}>
                            Administered
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleComplete(rx.id)}>
                            Complete
                          </Button>
                        </div>
                      </div>
                    ))}
                    {acknowledgedPrescriptions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No prescriptions to administer</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div>
            <AlertPanel 
              events={riskEvents?.filter(e => 
                myPatients.some(p => p?.id === e.patient_id)
              ) || []} 
              maxHeight="700px" 
            />
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && chatPartnerId && user && (
        <ChatPanel
          userId={user.id}
          partnerId={chatPartnerId}
          onClose={() => setShowChat(false)}
        />
      )}
    </DashboardLayout>
  );
}
