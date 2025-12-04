import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePatients } from '@/hooks/usePatients';
import { useDoctors, useNurses } from '@/hooks/useStaff';
import { useAssignments, useCreateAssignment, useUpdateAssignment } from '@/hooks/useAssignments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserPlus, Stethoscope, Heart, BedDouble, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AssignmentManagement() {
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();
  const { data: nurses } = useNurses();
  const { data: assignments } = useAssignments({ status: 'active' });
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedNurses, setSelectedNurses] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Get patients without active assignments
  const unassignedPatients = patients?.filter(
    p => !assignments?.some(a => a.patient_id === p.id)
  );

  // Get existing assignments for a patient
  const getPatientAssignments = (patientId: string) => {
    return assignments?.filter(a => a.patient_id === patientId) || [];
  };

  // Get assigned doctors for a patient
  const getAssignedDoctors = (patientId: string) => {
    const patientAssignments = getPatientAssignments(patientId);
    return [...new Set(patientAssignments.map(a => a.doctor_id))];
  };

  // Get assigned nurses for a patient
  const getAssignedNurses = (patientId: string) => {
    const patientAssignments = getPatientAssignments(patientId);
    return [...new Set(patientAssignments.filter(a => a.nurse_id).map(a => a.nurse_id!))];
  };

  const handleAssign = async () => {
    if (!selectedPatient || selectedDoctors.length === 0) {
      toast.error('Please select a patient and at least one doctor');
      return;
    }

    try {
      // Create assignments for each doctor-nurse combination
      // If no nurses selected, create one assignment per doctor
      // If nurses selected, create assignments pairing doctors with nurses
      const assignmentPromises: Promise<unknown>[] = [];
      
      if (selectedNurses.length === 0) {
        // Just doctors, no nurses
        for (const doctorId of selectedDoctors) {
          assignmentPromises.push(
            createAssignment.mutateAsync({
              patient_id: selectedPatient,
              doctor_id: doctorId,
              notes: notes || undefined
            })
          );
        }
      } else {
        // Create assignments for each doctor with each nurse
        for (const doctorId of selectedDoctors) {
          for (const nurseId of selectedNurses) {
            assignmentPromises.push(
              createAssignment.mutateAsync({
                patient_id: selectedPatient,
                doctor_id: doctorId,
                nurse_id: nurseId,
                notes: notes || undefined
              })
            );
          }
        }
      }
      
      await Promise.all(assignmentPromises);
      toast.success(`Created ${assignmentPromises.length} assignment(s) successfully`);
      setShowAssignDialog(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };

  const handleEndAssignment = async (assignmentId: string) => {
    try {
      await updateAssignment.mutateAsync({
        id: assignmentId,
        status: 'completed'
      });
      toast.success('Assignment ended');
    } catch (error) {
      toast.error('Failed to end assignment');
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setSelectedDoctors([]);
    setSelectedNurses([]);
    setNotes('');
  };

  const toggleDoctor = (doctorId: string) => {
    setSelectedDoctors(prev => 
      prev.includes(doctorId) 
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const toggleNurse = (nurseId: string) => {
    setSelectedNurses(prev => 
      prev.includes(nurseId) 
        ? prev.filter(id => id !== nurseId)
        : [...prev, nurseId]
    );
  };

  const getPatientById = (id: string) => patients?.find(p => p.id === id);
  const getDoctorById = (id: string) => doctors?.find(d => d.id === id);
  const getNurseById = (id: string) => nurses?.find(n => n.id === id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Patient Assignments</h1>
            <p className="text-muted-foreground">Assign doctors and nurses to patients</p>
          </div>
          <Dialog open={showAssignDialog} onOpenChange={(open) => {
            setShowAssignDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          <div className="flex items-center gap-2">
                            <span>{patient.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Room {patient.room_no}
                            </Badge>
                            <Badge 
                              variant={patient.status === 'critical' ? 'destructive' : 
                                      patient.status === 'monitoring' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {patient.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Attending Doctors * (Select one or more)</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {doctors?.map((doctor) => (
                      <div key={doctor.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`doctor-${doctor.id}`}
                          checked={selectedDoctors.includes(doctor.id)}
                          onCheckedChange={() => toggleDoctor(doctor.id)}
                        />
                        <label
                          htmlFor={`doctor-${doctor.id}`}
                          className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                        >
                          <Stethoscope className="w-4 h-4" />
                          <span>{doctor.name}</span>
                          {doctor.on_duty && (
                            <Badge variant="default" className="text-xs">On Duty</Badge>
                          )}
                          {doctor.specialization && (
                            <span className="text-xs text-muted-foreground">
                              ({doctor.specialization})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                    {(!doctors || doctors.length === 0) && (
                      <p className="text-sm text-muted-foreground">No doctors available</p>
                    )}
                  </div>
                  {selectedDoctors.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedDoctors.length} doctor(s) selected
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assigned Nurses (Optional - Select one or more)</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {nurses?.map((nurse) => (
                      <div key={nurse.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`nurse-${nurse.id}`}
                          checked={selectedNurses.includes(nurse.id)}
                          onCheckedChange={() => toggleNurse(nurse.id)}
                        />
                        <label
                          htmlFor={`nurse-${nurse.id}`}
                          className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                        >
                          <Heart className="w-4 h-4" />
                          <span>{nurse.name}</span>
                          {nurse.on_duty && (
                            <Badge variant="default" className="text-xs">On Duty</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({nurse.department})
                          </span>
                        </label>
                      </div>
                    ))}
                    {(!nurses || nurses.length === 0) && (
                      <p className="text-sm text-muted-foreground">No nurses available</p>
                    )}
                  </div>
                  {selectedNurses.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedNurses.length} nurse(s) selected
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this assignment..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} disabled={createAssignment.isPending}>
                    {createAssignment.isPending ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{patients?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Check className="w-8 h-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{assignments?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <X className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{unassignedPatients?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Stethoscope className="w-8 h-8 text-info" />
                <div>
                  <p className="text-2xl font-bold">{doctors?.filter(d => d.on_duty).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Doctors On Duty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unassigned Patients Alert */}
        {unassignedPatients && unassignedPatients.length > 0 && (
          <Card className="border-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-warning flex items-center gap-2">
                <BedDouble className="w-5 h-5" />
                Patients Without Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unassignedPatients.map((patient) => (
                  <Badge 
                    key={patient.id} 
                    variant={patient.status === 'critical' ? 'destructive' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedPatient(patient.id);
                      setShowAssignDialog(true);
                    }}
                  >
                    {patient.name} (Room {patient.room_no})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Nurse</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments?.map((assignment) => {
                  const patient = assignment.patient || getPatientById(assignment.patient_id);
                  const doctor = assignment.doctor || getDoctorById(assignment.doctor_id);
                  const nurse = assignment.nurse_id ? (assignment.nurse || getNurseById(assignment.nurse_id)) : null;
                  
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{patient?.name || 'Unknown'}</TableCell>
                      <TableCell>{patient?.room_no || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={patient?.status === 'critical' ? 'destructive' : 
                                  patient?.status === 'monitoring' ? 'secondary' : 'outline'}
                        >
                          {patient?.status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-medium">{doctor?.name || 'Unknown'}</p>
                            {doctor?.specialization && (
                              <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {nurse ? (
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-pink-500" />
                            <p>{nurse.name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(assignment.start_time), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(assignment.patient_id);
                              setSelectedDoctors([assignment.doctor_id]);
                              setSelectedNurses(assignment.nurse_id ? [assignment.nurse_id] : []);
                              setShowAssignDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleEndAssignment(assignment.id)}
                          >
                            End
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!assignments || assignments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No active assignments. Click "New Assignment" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
