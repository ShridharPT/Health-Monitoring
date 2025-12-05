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
      console.log('usePrescriptions called with filters:', filters);
      
      try {
        // For nurses, get their assigned patients first
        let assignedPatientIds: string[] = [];
        if (filters?.staffId && filters?.role === 'nurse') {
          const { data: assignments } = await supabase
            .from('assignments')
            .select('patient_id')
            .eq('nurse_id', filters.staffId)
            .eq('status', 'active');
          assignedPatientIds = assignments?.map(a => a.patient_id) || [];
          console.log('Nurse assigned patients:', assignedPatientIds);
        }
        
        // For doctors, get their assigned patients
        if (filters?.staffId && filters?.role === 'doctor') {
          const { data: assignments } = await supabase
            .from('assignments')
            .select('patient_id')
            .eq('doctor_id', filters.staffId)
            .eq('status', 'active');
          assignedPatientIds = assignments?.map(a => a.patient_id) || [];
          console.log('Doctor assigned patients:', assignedPatientIds);
        }
        
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
        
        console.log('All prescriptions from Supabase:', data);
        
        // Filter by role if needed
        let filteredData = data || [];
        if (filters?.staffId && filters?.role === 'nurse' && assignedPatientIds.length > 0) {
          filteredData = filteredData.filter(p => 
            p.nurse_id === filters.staffId || assignedPatientIds.includes(p.patient_id)
          );
        } else if (filters?.staffId && filters?.role === 'doctor') {
          filteredData = filteredData.filter(p => 
            p.doctor_id === filters.staffId || assignedPatientIds.includes(p.patient_id)
          );
        }
        
        console.log('Filtered prescriptions:', filteredData);
        
        if (filteredData.length > 0) return filteredData as unknown as Prescription[];
      } catch (e) {
        console.log('Error fetching prescriptions from Supabase:', e);
      }
      
      // Fallback to localStorage
      console.log('Using local storage for prescriptions');
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
        prescriptions = prescriptions.filter(p => 
          assignedPatientIds.has(p.patient_id) || 
          p.nurse_id === filters.staffId || 
          p.doctor_id === filters.staffId
        );
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
      
      console.log('Fetching prescription inbox for nurse:', nurseId);
      
      try {
        // First get the nurse's assigned patients
        const { data: assignments, error: assignError } = await supabase
          .from('assignments')
          .select('patient_id')
          .eq('nurse_id', nurseId)
          .eq('status', 'active');
        
        console.log('Nurse assignments:', assignments, 'Error:', assignError);
        
        const assignedPatientIds = assignments?.map(a => a.patient_id) || [];
        
        // Get ALL pending/acknowledged prescriptions first
        const { data: allPrescriptions, error: rxError } = await supabase
          .from('prescriptions')
          .select(`
            *,
            patient:patients(id, name, room_no, allergies),
            doctor:staff!prescriptions_doctor_id_fkey(id, name)
          `)
          .in('status', ['pending', 'acknowledged'])
          .order('created_at', { ascending: false });
        
        console.log('All pending prescriptions:', allPrescriptions, 'Error:', rxError);
        
        if (rxError) throw rxError;
        
        // Filter client-side: nurse_id matches OR patient is assigned to this nurse
        const filteredPrescriptions = (allPrescriptions || []).filter(rx => 
          rx.nurse_id === nurseId || assignedPatientIds.includes(rx.patient_id)
        );
        
        console.log('Filtered prescriptions for nurse:', filteredPrescriptions);
        
        if (filteredPrescriptions.length > 0) {
          return filteredPrescriptions as unknown as Prescription[];
        }
      } catch (e) {
        console.log('Error fetching prescription inbox from Supabase:', e);
      }
      
      // Get nurse's assigned patients from localStorage
      console.log('Falling back to localStorage for prescription inbox');
      const assignments = store.getAssignments().filter(a => 
        a.nurse_id === nurseId && a.status === 'active'
      );
      const assignedPatientIds = new Set(assignments.map(a => a.patient_id));
      
      console.log('Local assignments for nurse:', assignments);
      
      // Filter prescriptions by assigned patients OR nurse_id
      const localPrescriptions = store.getPrescriptions()
        .filter(p => 
          (assignedPatientIds.has(p.patient_id) || p.nurse_id === nurseId) && 
          ['pending', 'acknowledged'].includes(p.status)
        )
        .map(store.enrichPrescription);
      
      console.log('Local prescriptions for nurse:', localPrescriptions);
      return localPrescriptions;
    },
    enabled: !!nurseId,
    refetchInterval: 5000, // Refetch every 5 seconds
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
      let nurseId: string | null = null;
      
      // Try to get nurse from Supabase assignments
      try {
        const { data: assignment, error: assignError } = await supabase
          .from('assignments')
          .select('nurse_id')
          .eq('patient_id', prescription.patient_id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (!assignError && assignment?.nurse_id) {
          nurseId = assignment.nurse_id;
        }
      } catch (e) {
        console.log('Failed to get assignment from Supabase:', e);
      }
      
      // Fallback to localStorage if no nurse found
      if (!nurseId) {
        const localAssignment = store.getAssignments().find(
          a => a.patient_id === prescription.patient_id && a.status === 'active'
        );
        nurseId = localAssignment?.nurse_id || null;
      }
      
      console.log('Creating prescription with nurse_id:', nurseId);
      
      try {
        const insertData = {
          patient_id: prescription.patient_id,
          doctor_id: prescription.doctor_id,
          medicines: JSON.parse(JSON.stringify(prescription.medicines)),
          from_voice: prescription.from_voice || false,
          voice_transcript: prescription.voice_transcript || null,
          priority: prescription.priority || 'normal',
          notes: prescription.notes || null,
          nurse_id: nurseId,
          status: 'pending'
        };
        
        console.log('Inserting prescription to Supabase:', insertData);
        
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
        
        if (error) {
          console.error('Supabase insert error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          throw error;
        }
        console.log('Prescription created in Supabase:', data);
        return data as unknown as Prescription;
      } catch (e: any) {
        console.error('Failed to create prescription in Supabase:', e);
        console.error('Error details:', e?.message, e?.code, e?.details);
        const newPrescription = store.createPrescription({
          patient_id: prescription.patient_id,
          doctor_id: prescription.doctor_id,
          medicines: prescription.medicines,
          from_voice: prescription.from_voice || false,
          voice_transcript: prescription.voice_transcript,
          priority: (prescription.priority as Prescription['priority']) || 'normal',
          notes: prescription.notes,
          nurse_id: nurseId || undefined,
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
      // Convert medicines to JSON if present
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.medicines) {
        dbUpdates.medicines = JSON.parse(JSON.stringify(updates.medicines));
      }
      // Remove enriched fields that don't exist in DB
      delete dbUpdates.patient;
      delete dbUpdates.doctor;
      delete dbUpdates.nurse;
      
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .update(dbUpdates)
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


// Real-time subscription for prescription updates
export function useRealtimePrescriptions(nurseId?: string) {
  const queryClient = useQueryClient();
  
  if (nurseId) {
    supabase
      .channel(`prescriptions-nurse-${nurseId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'prescriptions'
      }, (payload) => {
        console.log('Prescription change detected:', payload);
        queryClient.invalidateQueries({ queryKey: ['prescription-inbox', nurseId] });
        queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      })
      .subscribe();
  }
}
