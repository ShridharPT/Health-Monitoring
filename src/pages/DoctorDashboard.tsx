import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PatientCard } from '@/components/dashboard/PatientCard';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAssignments } from '@/hooks/useAssignments';
import { usePatients } from '@/hooks/usePatients';
import { useAllLatestVitals } from '@/hooks/useVitals';
import { useAllLatestPredictions } from '@/hooks/usePredictions';
import { useRiskEvents } from '@/hooks/useRiskEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, MessageSquare, Activity, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PrescriptionDialog } from '@/components/prescriptions/PrescriptionDialog';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data: assignments } = useMyAssignments(user?.id);
  const { data: patients } = usePatients({ staffId: user?.id, role: user?.role as 'admin' | 'doctor' | 'nurse' });
  const { data: latestVitals } = useAllLatestVitals();
  const { data: latestPredictions } = useAllLatestPredictions();
  const { data: riskEvents } = useRiskEvents(20);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);

  // Use patients from usePatients hook (filtered by assignment)
  const myPatients = patients || [];
  const highRiskPatients = myPatients.filter(p => 
    latestPredictions?.[p.id]?.risk_level === 'High Risk'
  );

  const handlePrescribe = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowPrescriptionDialog(true);
  };

  const handleChat = (nurseId: string) => {
    setChatPartnerId(nurseId);
    setShowChat(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Dr. {user?.name?.split(' ').pop()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
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
                <Activity className="w-8 h-8 text-critical" />
                <div>
                  <p className="text-2xl font-bold">{highRiskPatients.length}</p>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{riskEvents?.filter(e => !e.acknowledged).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Pending Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <MessageSquare className="w-8 h-8 text-info" />
                <div>
                  <p className="text-2xl font-bold">{assignments?.filter(a => a.nurse).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Patients</h2>
              <Link to="/patients">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>

            {myPatients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPatients.map((patient) => patient && (
                  <div key={patient.id} className="relative">
                    <PatientCard
                      patient={patient}
                      latestVitals={latestVitals?.[patient.id]}
                      latestPrediction={latestPredictions?.[patient.id]}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handlePrescribe(patient.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Rx
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No patients assigned yet</p>
                </CardContent>
              </Card>
            )}

            {/* Care Teams */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Care Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignments?.filter(a => a.nurse).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{assignment.patient?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Nurse: {assignment.nurse?.name}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => assignment.nurse && handleChat(assignment.nurse.id)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Panel */}
          <div className="space-y-4">
            <AlertPanel 
              events={riskEvents?.filter(e => 
                myPatients.some(p => p?.id === e.patient_id)
              ) || []} 
              maxHeight="600px" 
            />
          </div>
        </div>
      </div>

      {/* Prescription Dialog */}
      {showPrescriptionDialog && selectedPatientId && (
        <PrescriptionDialog
          patientId={selectedPatientId}
          doctorId={user?.id || ''}
          open={showPrescriptionDialog}
          onClose={() => setShowPrescriptionDialog(false)}
        />
      )}

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
