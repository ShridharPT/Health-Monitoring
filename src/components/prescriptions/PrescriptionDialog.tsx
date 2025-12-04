import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMedicines } from '@/hooks/useMedicines';
import { useCreatePrescription, useUpdatePrescription } from '@/hooks/usePrescriptions';
import { usePatient } from '@/hooks/usePatients';
import { Mic, MicOff, Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Prescription, PrescriptionMedicine } from '@/types/hospital';

interface PrescriptionDialogProps {
  patientId: string;
  doctorId: string;
  open: boolean;
  onClose: () => void;
  editPrescription?: Prescription;
}

export function PrescriptionDialog({ patientId, doctorId, open, onClose, editPrescription }: PrescriptionDialogProps) {
  const { data: medicines } = useMedicines();
  const { data: patient } = usePatient(patientId);
  const createPrescription = useCreatePrescription();
  const updatePrescription = useUpdatePrescription();
  
  const isEditMode = !!editPrescription;
  
  const [selectedMedicines, setSelectedMedicines] = useState<PrescriptionMedicine[]>([]);
  const [currentMedicine, setCurrentMedicine] = useState<Partial<PrescriptionMedicine>>({});
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Initialize form with edit data
  useEffect(() => {
    if (editPrescription) {
      setSelectedMedicines((editPrescription.medicines as PrescriptionMedicine[]) || []);
      setPriority(editPrescription.priority || 'normal');
      setNotes(editPrescription.notes || '');
      setVoiceTranscript(editPrescription.voice_transcript || '');
    } else {
      setSelectedMedicines([]);
      setPriority('normal');
      setNotes('');
      setVoiceTranscript('');
    }
  }, [editPrescription, open]);

  const handleAddMedicine = () => {
    if (!currentMedicine.medicine_name || !currentMedicine.dosage) {
      toast.error('Please select a medicine and dosage');
      return;
    }

    setSelectedMedicines([...selectedMedicines, {
      medicine_id: currentMedicine.medicine_id,
      medicine_name: currentMedicine.medicine_name,
      dosage: currentMedicine.dosage,
      unit: currentMedicine.unit || 'mg',
      frequency: currentMedicine.frequency || 'once daily',
      duration: currentMedicine.duration || '7 days',
      route: currentMedicine.route || 'oral',
      instructions: currentMedicine.instructions
    } as PrescriptionMedicine]);

    setCurrentMedicine({});
  };

  const handleRemoveMedicine = (index: number) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const handleMedicineSelect = (medicineId: string) => {
    const medicine = medicines?.find(m => m.id === medicineId);
    if (medicine) {
      setCurrentMedicine({
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        dosage: medicine.default_dosage,
        unit: medicine.unit,
        route: medicine.route
      });
    }
  };

  const handleVoiceToggle = () => {
    if (!isRecording) {
      // Start recording using Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          toast.error('Voice recognition error');
        };

        recognition.start();
        setIsRecording(true);
        (window as any).currentRecognition = recognition;
      } else {
        toast.error('Voice recognition not supported in this browser');
      }
    } else {
      // Stop recording
      if ((window as any).currentRecognition) {
        (window as any).currentRecognition.stop();
      }
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    // Allow voice prescriptions without medicines, but require either medicines or voice transcript
    const isVoicePrescription = voiceTranscript && voiceTranscript.trim().length > 0;
    
    if (selectedMedicines.length === 0 && !isVoicePrescription) {
      toast.error('Please add at least one medicine or use voice prescription');
      return;
    }

    try {
      if (isEditMode && editPrescription) {
        await updatePrescription.mutateAsync({
          id: editPrescription.id,
          medicines: selectedMedicines,
          from_voice: isVoicePrescription,
          voice_transcript: voiceTranscript || undefined,
          priority: priority as Prescription['priority'],
          notes: notes || undefined
        });
        toast.success('Prescription updated successfully');
      } else {
        await createPrescription.mutateAsync({
          patient_id: patientId,
          doctor_id: doctorId,
          medicines: selectedMedicines,
          from_voice: isVoicePrescription,
          voice_transcript: voiceTranscript || undefined,
          priority,
          notes: notes || undefined
        });
        toast.success(isVoicePrescription && selectedMedicines.length === 0 
          ? 'Voice prescription created successfully' 
          : 'Prescription created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update prescription' : 'Failed to create prescription');
    }
  };

  // Check for allergies
  const allergyWarnings = selectedMedicines.filter(med => 
    patient?.allergies?.some(allergy => 
      med.medicine_name.toLowerCase().includes(allergy.toLowerCase())
    )
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'New'} Prescription for {patient?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Allergy Warning */}
          {patient?.allergies && patient.allergies.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Patient Allergies:</span>
              </div>
              <p className="text-sm mt-1">{patient.allergies.join(', ')}</p>
            </div>
          )}

          {/* Voice Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Voice Prescription</Label>
              {voiceTranscript && (
                <Badge variant="secondary" className="text-xs">
                  🎤 Voice mode - can submit without selecting medicines
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                onClick={handleVoiceToggle}
              >
                {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              {voiceTranscript && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoiceTranscript('')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {voiceTranscript && (
              <Textarea
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Voice transcript will appear here. You can edit it before submitting..."
                className="mt-2 min-h-[100px]"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Use voice to dictate prescription. You can submit with just voice transcript or add medicines below.
            </p>
          </div>

          {/* Medicine Selection */}
          <div className="space-y-4">
            <Label>Add Medicine</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select onValueChange={handleMedicineSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {medicines?.map((med) => (
                    <SelectItem key={med.id} value={med.id}>
                      {med.name} ({med.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Dosage"
                value={currentMedicine.dosage || ''}
                onChange={(e) => setCurrentMedicine({ ...currentMedicine, dosage: e.target.value })}
              />
              <Select 
                value={currentMedicine.frequency || ''} 
                onValueChange={(v) => setCurrentMedicine({ ...currentMedicine, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once daily">Once daily</SelectItem>
                  <SelectItem value="twice daily">Twice daily</SelectItem>
                  <SelectItem value="three times daily">Three times daily</SelectItem>
                  <SelectItem value="four times daily">Four times daily</SelectItem>
                  <SelectItem value="as needed">As needed</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={currentMedicine.duration || ''} 
                onValueChange={(v) => setCurrentMedicine({ ...currentMedicine, duration: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 days">3 days</SelectItem>
                  <SelectItem value="5 days">5 days</SelectItem>
                  <SelectItem value="7 days">7 days</SelectItem>
                  <SelectItem value="14 days">14 days</SelectItem>
                  <SelectItem value="30 days">30 days</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={handleAddMedicine}>
              <Plus className="w-4 h-4 mr-2" />
              Add Medicine
            </Button>
          </div>

          {/* Selected Medicines */}
          {selectedMedicines.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Medicines</Label>
              <div className="space-y-2">
                {selectedMedicines.map((med, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">{med.medicine_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {med.dosage}{med.unit} • {med.frequency} • {med.duration} • {med.route}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMedicine(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allergy Warnings for Selected */}
          {allergyWarnings.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Allergy Warning!</span>
              </div>
              <p className="text-sm mt-1">
                {allergyWarnings.map(m => m.medicine_name).join(', ')} may cause allergic reaction
              </p>
            </div>
          )}

          {/* Priority & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createPrescription.isPending || updatePrescription.isPending}>
              {(createPrescription.isPending || updatePrescription.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update' : 'Create'} Prescription
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
