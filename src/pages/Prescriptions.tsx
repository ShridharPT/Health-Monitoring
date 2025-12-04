import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePrescriptions, useUpdatePrescriptionStatus, useUpdatePrescription, useDeletePrescription } from '@/hooks/usePrescriptions';
import { usePatients } from '@/hooks/usePatients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pill, Check, Clock, X, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PrescriptionDialog } from '@/components/prescriptions/PrescriptionDialog';
import type { Prescription } from '@/types/hospital';

export default function Prescriptions() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [deletingPrescriptionId, setDeletingPrescriptionId] = useState<string | null>(null);
  
  // Filter prescriptions by role and assignment
  const filters = user?.role === 'admin' 
    ? {} 
    : { 
        staffId: user?.id, 
        role: user?.role as 'admin' | 'doctor' | 'nurse' 
      };
  
  const { data: prescriptions } = usePrescriptions(filters);
  const { data: patients } = usePatients({ 
    staffId: user?.id, 
    role: user?.role as 'admin' | 'doctor' | 'nurse' 
  });
  const updateStatus = useUpdatePrescriptionStatus();
  const updatePrescription = useUpdatePrescription();
  const deletePrescription = useDeletePrescription();

  const filteredPrescriptions = prescriptions?.filter(p => 
    statusFilter === 'all' || p.status === statusFilter
  );

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success('Prescription updated');
    } catch (error) {
      toast.error('Failed to update prescription');
    }
  };

  const handleDelete = async () => {
    if (!deletingPrescriptionId) return;
    try {
      await deletePrescription.mutateAsync(deletingPrescriptionId);
      toast.success('Prescription deleted');
      setDeletingPrescriptionId(null);
    } catch (error) {
      toast.error('Failed to delete prescription');
    }
  };

  const canEditDelete = (rx: Prescription) => {
    // Only doctors can edit/delete their own prescriptions that are still pending
    return user?.role === 'doctor' && rx.doctor_id === user.id && rx.status === 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'acknowledged': return <Badge variant="outline"><Check className="w-3 h-3 mr-1" />Acknowledged</Badge>;
      case 'administered': return <Badge variant="default"><Pill className="w-3 h-3 mr-1" />Administered</Badge>;
      case 'completed': return <Badge className="bg-success"><Check className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge variant="secondary">High</Badge>;
      case 'normal': return <Badge variant="outline">Normal</Badge>;
      case 'low': return <Badge variant="outline" className="opacity-60">Low</Badge>;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prescriptions</h1>
            <p className="text-muted-foreground">
              {user?.role === 'doctor' ? 'Prescriptions you have created' : 
               user?.role === 'nurse' ? 'Prescriptions assigned to you' : 
               'All prescriptions'}
            </p>
          </div>
          {user?.role === 'doctor' && (
            <Dialog open={showNewPrescription && !selectedPatientId} onOpenChange={(open) => {
              setShowNewPrescription(open);
              if (!open) setSelectedPatientId('');
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Prescription
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Patient</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {patients && patients.length > 0 ? (
                    <div className="space-y-2">
                      {patients.map((patient) => (
                        <Button
                          key={patient.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setSelectedPatientId(patient.id)}
                        >
                          <User className="w-4 h-4 mr-2" />
                          {patient.name} - Room {patient.room_no}
                          <Badge variant="outline" className="ml-auto">{patient.status}</Badge>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No patients available. Ask admin to add patients first.
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="administered">Administered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {filteredPrescriptions?.map((rx) => (
            <Card key={rx.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{rx.patient?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Room {rx.patient?.room_no} • {format(new Date(rx.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(rx.priority)}
                    {getStatusBadge(rx.status)}
                    {canEditDelete(rx) && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPrescription(rx)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingPrescriptionId(rx.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Voice Transcript for voice-only prescriptions */}
                  {rx.from_voice && rx.voice_transcript && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">🎤 Voice Prescription</Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{rx.voice_transcript}</p>
                    </div>
                  )}

                  {/* Medicines */}
                  {(rx.medicines as any[])?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Medications</p>
                    <div className="space-y-2">
                      {(rx.medicines as any[])?.map((med, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                          <Pill className="w-4 h-4 text-primary" />
                          <span className="font-medium">{med.medicine_name}</span>
                          <span className="text-muted-foreground">
                            {med.dosage}{med.unit} • {med.frequency} • {med.duration}
                          </span>
                          {med.route !== 'oral' && (
                            <Badge variant="outline" className="text-xs">{med.route}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Staff Info */}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Prescribed by: </span>
                      <span className="font-medium">Dr. {rx.doctor?.name}</span>
                    </div>
                    {rx.nurse && (
                      <div>
                        <span className="text-muted-foreground">Assigned to: </span>
                        <span className="font-medium">{rx.nurse.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Voice indicator - only show if no transcript displayed above */}
                  {rx.from_voice && !rx.voice_transcript && (
                    <Badge variant="outline" className="text-xs">
                      🎤 Voice Prescription
                    </Badge>
                  )}

                  {/* Notes */}
                  {rx.notes && (
                    <div className="p-2 rounded bg-muted/50 text-sm">
                      <span className="text-muted-foreground">Notes: </span>
                      {rx.notes}
                    </div>
                  )}

                  {/* Actions */}
                  {user?.role === 'nurse' && rx.status !== 'completed' && rx.status !== 'cancelled' && (
                    <div className="flex gap-2 pt-2">
                      {rx.status === 'pending' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(rx.id, 'acknowledged')}>
                          <Check className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                      {rx.status === 'acknowledged' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(rx.id, 'administered')}>
                          <Pill className="w-4 h-4 mr-1" />
                          Mark Administered
                        </Button>
                      )}
                      {rx.status === 'administered' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(rx.id, 'completed')}>
                          <Check className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                    {rx.acknowledged_at && <span>Acknowledged: {format(new Date(rx.acknowledged_at), 'HH:mm')}</span>}
                    {rx.administered_at && <span>Administered: {format(new Date(rx.administered_at), 'HH:mm')}</span>}
                    {rx.completed_at && <span>Completed: {format(new Date(rx.completed_at), 'HH:mm')}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!filteredPrescriptions || filteredPrescriptions.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No prescriptions found</p>
                {user?.role === 'doctor' && patients && patients.length > 0 && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowNewPrescription(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Prescription
                  </Button>
                )}
                {user?.role === 'doctor' && (!patients || patients.length === 0) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No patients assigned to you. Contact admin to assign patients.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Prescription Dialog - New */}
      {selectedPatientId && user && (
        <PrescriptionDialog
          patientId={selectedPatientId}
          doctorId={user.id}
          open={!!selectedPatientId && showNewPrescription}
          onClose={() => {
            setSelectedPatientId('');
            setShowNewPrescription(false);
          }}
        />
      )}

      {/* Prescription Dialog - Edit */}
      {editingPrescription && user && (
        <PrescriptionDialog
          patientId={editingPrescription.patient_id}
          doctorId={user.id}
          open={!!editingPrescription}
          onClose={() => setEditingPrescription(null)}
          editPrescription={editingPrescription}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPrescriptionId} onOpenChange={(open) => !open && setDeletingPrescriptionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prescription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prescription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
