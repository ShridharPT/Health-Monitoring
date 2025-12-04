import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { Assignment } from '@/types/hospital';

export function useAssignments(filters?: { patient_id?: string; doctor_id?: string; nurse_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['assignments', filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from('assignments')
          .select(`
            *,
            patient:patients(*),
            doctor:staff!assignments_doctor_id_fkey(id, name, email, role, specialization),
            nurse:staff!assignments_nurse_id_fkey(id, name, email, role)
          `);
        
        if (filters?.patient_id) query = query.eq('patient_id', filters.patient_id);
        if (filters?.doctor_id) query = query.eq('doctor_id', filters.doctor_id);
        if (filters?.nurse_id) query = query.eq('nurse_id', filters.nurse_id);
        if (filters?.status) query = query.eq('status', filters.status);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) return data as unknown as Assignment[];
      } catch {
        console.log('Using local storage for assignments');
      }
      
      const assignments = store.getAssignmentsByFilter(filters || {});
      return assignments.map(store.enrichAssignment);
    }
  });
}

export function useMyAssignments(staffId?: string) {
  return useQuery({
    queryKey: ['my-assignments', staffId],
    queryFn: async () => {
      if (!staffId) return [];
      
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select(`
            *,
            patient:patients(*),
            doctor:staff!assignments_doctor_id_fkey(id, name, email, role, specialization),
            nurse:staff!assignments_nurse_id_fkey(id, name, email, role)
          `)
          .or(`doctor_id.eq.${staffId},nurse_id.eq.${staffId}`)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data && data.length > 0) return data as unknown as Assignment[];
      } catch {
        console.log('Using local storage for my assignments');
      }
      
      const assignments = store.getAssignments()
        .filter(a => (a.doctor_id === staffId || a.nurse_id === staffId) && a.status === 'active');
      return assignments.map(store.enrichAssignment);
    },
    enabled: !!staffId
  });
}


export function usePatientAssignment(patientId?: string) {
  return useQuery({
    queryKey: ['patient-assignment', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select(`
            *,
            doctor:staff!assignments_doctor_id_fkey(id, name, email, role, specialization, contact),
            nurse:staff!assignments_nurse_id_fkey(id, name, email, role, contact)
          `)
          .eq('patient_id', patientId)
          .eq('status', 'active')
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (data) return data as unknown as Assignment;
      } catch {
        console.log('Using local storage for patient assignment');
      }
      
      const assignment = store.getAssignments().find(a => a.patient_id === patientId && a.status === 'active');
      return assignment ? store.enrichAssignment(assignment) : null;
    },
    enabled: !!patientId
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignment: { patient_id: string; doctor_id: string; nurse_id?: string; notes?: string }) => {
      try {
        // Check if this exact assignment already exists
        const { data: existing } = await supabase
          .from('assignments')
          .select('*')
          .eq('patient_id', assignment.patient_id)
          .eq('doctor_id', assignment.doctor_id)
          .eq('status', 'active')
          .maybeSingle();
        
        // If nurse_id matches too (or both are null), return existing
        if (existing && existing.nurse_id === (assignment.nurse_id || null)) {
          return existing;
        }
        
        const { data, error } = await supabase
          .from('assignments')
          .insert(assignment)
          .select(`
            *,
            patient:patients(*),
            doctor:staff!assignments_doctor_id_fkey(*),
            nurse:staff!assignments_nurse_id_fkey(*)
          `)
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for create assignment');
        const newAssignment = store.createAssignment(assignment);
        return store.enrichAssignment(newAssignment);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    }
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Assignment> & { id: string }) => {
      if (updates.status === 'completed') {
        updates.end_time = new Date().toISOString();
      }
      
      try {
        const { data, error } = await supabase
          .from('assignments')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for update assignment');
        const updated = store.updateAssignment(id, updates);
        if (!updated) throw new Error('Assignment not found');
        return store.enrichAssignment(updated);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-assignment'] });
    }
  });
}
