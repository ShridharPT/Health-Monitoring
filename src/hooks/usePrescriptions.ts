import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { Prescription, PrescriptionMedicine } from '@/types/hospital';

export function usePrescriptions(filters?: { 
  patient_id?: string; 
  doctor_id?: string; 
  nurse_id?: string; 
  status?: string;
  staffId?: string;
  role?: 'admin' | 'doctor' | 'nurse';
}) {
  return useQuery({
    queryKey: ['prescriptions', filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from('prescriptions')
          .select(`
            *,
            patient:patients(id, name, room_no, allergies),
            doctor:staff!prescriptions_doctor_id_fkey(id, name, role),
            nurse:staff!prescriptions_nurse_id_fkey(id, name, role)
          `);
        
        if (filters?.patient_id) query = query.eq('patient_id', filters.patient_id);
        if (filters?.doctor_id) query = query.eq('doctor_id', filters.doctor_id);
        if (filters?.nurse_id) query = query.eq('nurse_id', filters.nurse_id);
        if (filters?.status) query = query.eq('status', filters.status);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) return data as unknown as Prescription[];
      } catch {
        console.log('Using local storage for prescriptions');
      }
      
      let prescriptions = store.getPrescriptions();
      if (filters?.patient_id) prescriptions = prescriptions.filter(p => p.patient_id === filters.patient_id);
      if (filters?.doctor_id) prescriptions = prescriptions.filter(p => p.doctor_id === filters.doctor_id);
      if (filters?.nurse_id) prescriptions = prescriptions.filter(p => p.nurse_id === filters.nurse_id);
      if (filters?.status) prescriptions = prescriptions.filter(p => p.status === filters.status);
      
      // Filter by assignment if staffId and role provided (for non-admin)
      if (filters?.staffId && filters?.role && filters.role !== 'admin') {
        const assignments = store.getAssignments().filter(a => 
          (a.doctor_id === filters.staffId || a.nurse_id === filters.staffId) && a.status === 'active'
        );
        const assignedPatientIds = new Set(assignments.map(a => a.patient_id));
        prescriptions = prescriptions.filter(p => assignedPatientIds.has(p.patient_id));
      }
      
      return prescriptions.map(store.enrichPrescription);
    }
  });
}

export function usePatientPrescriptions(patientId?: string) {
  return useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            doctor:staff!prescriptions_doctor_id_fkey(id, name),
            nurse:staff!prescriptions_nurse_id_fkey(id, name)
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data && data.length > 0) return data as unknown as Prescription[];
      } catch {
        console.log('Using local storage for patient prescriptions');
      }
      
      return store.getPrescriptions().filter(p => p.patient_id === patientId).map(store.enrichPrescription);
    },
    enabled: !!patientId
  });
}


export function useNursePrescriptionInbox(nurseId?: string) {
  return useQuery({
    queryKey: ['prescription-inbox', nurseId],
    queryFn: async () => {
      if (!nurseId) return [];
      
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            patient:patients(id, name, room_no, allergies),
            doctor:staff!prescriptions_doctor_id_fkey(id, name)
          `)
          .eq('nurse_id', nurseId)
          .in('status', ['pending', 'acknowledged'])
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data && data.length > 0) return data as unknown as Prescription[];
      } catch {
        console.log('Using local storage for prescription inbox');
      }
      
      // Get nurse's assigned patients
      const assignments = store.getAssignments().filter(a => 
        a.nurse_id === nurseId && a.status === 'active'
      );
      const assignedPatientIds = new Set(assignments.map(a => a.patient_id));
      
      // Filter prescriptions by assigned patients
      return store.getPrescriptions()
        .filter(p => 
          assignedPatientIds.has(p.patient_id) && 
          ['pending', 'acknowledged'].includes(p.status)
        )
        .map(store.enrichPrescription);
    },
    enabled: !!nurseId
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (prescription: {
      patient_id: string;
      doctor_id: string;
      medicines: PrescriptionMedicine[];
      from_voice?: boolean;
      voice_transcript?: string;
      priority?: string;
      notes?: string;
    }) => {
      try {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('nurse_id')
          .eq('patient_id', prescription.patient_id)
          .eq('status', 'active')
          .single();
        
        const insertData = {
          patient_id: prescription.patient_id,
          doctor_id: prescription.doctor_id,
          medicines: JSON.parse(JSON.stringify(prescription.medicines)),
          from_voice: prescription.from_voice,
          voice_transcript: prescription.voice_transcript,
          priority: prescription.priority,
          notes: prescription.notes,
          nurse_id: assignment?.nurse_id
        };
        
        const { data, error } = await supabase
          .from('prescriptions')
          .insert(insertData)
          .select(`
            *,
            patient:patients(*),
            doctor:staff!prescriptions_doctor_id_fkey(*),
            nurse:staff!prescriptions_nurse_id_fkey(*)
          `)
          .single();
        
        if (error) throw error;
        return data as unknown as Prescription;
      } catch {
        console.log('Using local storage for create prescription');
        const assignment = store.getAssignments().find(a => a.patient_id === prescription.patient_id && a.status === 'active');
        const newPrescription = store.createPrescription({
          patient_id: prescription.patient_id,
          doctor_id: prescription.doctor_id,
          medicines: prescription.medicines,
          from_voice: prescription.from_voice || false,
          voice_transcript: prescription.voice_transcript,
          priority: (prescription.priority as Prescription['priority']) || 'normal',
          notes: prescription.notes,
          nurse_id: assignment?.nurse_id,
          status: 'pending',
        });
        return store.enrichPrescription(newPrescription);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-inbox'] });
    }
  });
}

export function useUpdatePrescriptionStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (notes) updates.notes = notes;
      
      if (status === 'acknowledged') {
        updates.acknowledged_at = new Date().toISOString();
      } else if (status === 'administered') {
        updates.administered_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for update prescription status');
        const updated = store.updatePrescription(id, updates as Partial<Prescription>);
        if (!updated) throw new Error('Prescription not found');
        return updated;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-inbox'] });
    }
  });
}


export function useUpdatePrescription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prescription> & { id: string }) => {
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for update prescription');
        const updated = store.updatePrescription(id, updates);
        if (!updated) throw new Error('Prescription not found');
        return store.enrichPrescription(updated);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-inbox'] });
    }
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('prescriptions')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch {
        console.log('Using local storage for delete prescription');
        return store.deletePrescription(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-inbox'] });
    }
  });
}
