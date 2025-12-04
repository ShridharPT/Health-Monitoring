import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient } from '@/types/medical';
import * as store from '@/lib/localStore';
import { toast } from 'sonner';

// Filter options for role-based access
interface PatientFilterOptions {
  staffId?: string;
  role?: 'admin' | 'doctor' | 'nurse';
}

export function usePatients(options?: PatientFilterOptions) {
  const { staffId, role } = options || {};
  
  return useQuery({
    queryKey: ['patients', staffId, role],
    queryFn: async () => {
      let patients: Patient[] = [];
      
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) {
          patients = data as Patient[];
        } else {
          patients = store.getPatients();
        }
      } catch {
        console.log('Using local storage for patients');
        patients = store.getPatients();
      }
      
      // Filter by assignments if not admin
      if (staffId && role && role !== 'admin') {
        const assignments = store.getAssignments().filter(a => 
          (a.doctor_id === staffId || a.nurse_id === staffId) && a.status === 'active'
        );
        const assignedPatientIds = new Set(assignments.map(a => a.patient_id));
        patients = patients.filter(p => assignedPatientIds.has(p.id));
      }
      
      return patients;
    },
  });
}

export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .maybeSingle();

        if (error) throw error;
        if (data) return data as Patient;
      } catch {
        console.log('Using local storage for patient');
      }
      
      return store.getPatientById(patientId) || null;
    },
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .insert(patient)
          .select()
          .single();

        if (error) throw error;
        return data as Patient;
      } catch {
        console.log('Using local storage for create patient');
        return store.createPatient(patient);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create patient: ' + error.message);
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Patient;
      } catch {
        console.log('Using local storage for update patient');
        const updated = store.updatePatient(id, updates);
        if (!updated) throw new Error('Patient not found');
        return updated;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      toast.success('Patient updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update patient: ' + error.message);
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch {
        console.log('Using local storage for delete patient');
        return store.deletePatient(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete patient: ' + error.message);
    },
  });
}
