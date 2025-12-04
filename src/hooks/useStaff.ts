import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { Staff } from '@/types/hospital';

export function useStaff(role?: string) {
  return useQuery({
    queryKey: ['staff', role],
    queryFn: async () => {
      try {
        let query = supabase
          .from('staff')
          .select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at');
        
        if (role && role !== 'all') {
          query = query.eq('role', role);
        }
        
        const { data, error } = await query.order('name');
        if (error) throw error;
        if (data && data.length > 0) return data as Staff[];
      } catch {
        console.log('Using local storage for staff');
      }
      
      let staff = store.getStaff();
      if (role && role !== 'all') {
        staff = staff.filter(s => s.role === role);
      }
      return staff;
    }
  });
}

export function useDoctors(onDutyOnly = false) {
  return useQuery({
    queryKey: ['doctors', onDutyOnly],
    queryFn: async () => {
      try {
        let query = supabase
          .from('staff')
          .select('*')
          .eq('role', 'doctor');
        
        if (onDutyOnly) {
          query = query.eq('on_duty', true);
        }
        
        const { data, error } = await query.order('name');
        if (error) throw error;
        if (data && data.length > 0) return data as Staff[];
      } catch {
        console.log('Using local storage for doctors');
      }
      
      let doctors = store.getDoctors();
      if (onDutyOnly) doctors = doctors.filter(d => d.on_duty);
      return doctors;
    }
  });
}

export function useNurses(onDutyOnly = false) {
  return useQuery({
    queryKey: ['nurses', onDutyOnly],
    queryFn: async () => {
      try {
        let query = supabase
          .from('staff')
          .select('*')
          .eq('role', 'nurse');
        
        if (onDutyOnly) {
          query = query.eq('on_duty', true);
        }
        
        const { data, error } = await query.order('name');
        if (error) throw error;
        if (data && data.length > 0) return data as Staff[];
      } catch {
        console.log('Using local storage for nurses');
      }
      
      let nurses = store.getNurses();
      if (onDutyOnly) nurses = nurses.filter(n => n.on_duty);
      return nurses;
    }
  });
}


export function useStaffMember(id?: string) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        if (data) return data as Staff;
      } catch {
        console.log('Using local storage for staff member');
      }
      
      return store.getStaffById(id) || null;
    },
    enabled: !!id
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (staff: Partial<Staff> & { password?: string }) => {
      // Check if email already exists
      const existingStaff = store.getStaffByEmail(staff.email || '');
      if (existingStaff) {
        throw new Error('A staff member with this email already exists');
      }
      
      // Validate password for new staff
      if (!staff.password || staff.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      try {
        const { data, error } = await supabase
          .from('staff')
          .insert({
            name: staff.name,
            email: staff.email,
            password_hash: store.hashPassword(staff.password),
            role: staff.role,
            contact: staff.contact,
            department: staff.department,
            specialization: staff.specialization,
            on_duty: staff.on_duty ?? false
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for create staff');
        return store.createStaff({
          name: staff.name || '',
          email: staff.email || '',
          password_hash: store.hashPassword(staff.password),
          role: staff.role || 'nurse',
          contact: staff.contact,
          department: staff.department,
          specialization: staff.specialization,
          on_duty: staff.on_duty ?? false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['nurses'] });
    }
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      try {
        const { data, error } = await supabase
          .from('staff')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for update staff');
        const updated = store.updateStaff(id, updates);
        if (!updated) throw new Error('Staff not found');
        return updated;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['nurses'] });
    }
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('staff')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch {
        console.log('Using local storage for delete staff');
        return store.deleteStaff(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['nurses'] });
    }
  });
}
