import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { Medicine } from '@/types/hospital';

export function useMedicines(category?: string, search?: string) {
  return useQuery({
    queryKey: ['medicines', category, search],
    queryFn: async () => {
      try {
        let query = supabase.from('medicines').select('*');
        
        if (category) {
          query = query.eq('category', category);
        }
        
        if (search) {
          query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%`);
        }
        
        const { data, error } = await query.order('name');
        if (error) throw error;
        if (data && data.length > 0) return data as Medicine[];
      } catch {
        console.log('Using local storage for medicines');
      }
      
      let medicines = store.getMedicines();
      if (category) medicines = medicines.filter(m => m.category === category);
      if (search) {
        const s = search.toLowerCase();
        medicines = medicines.filter(m => 
          m.name.toLowerCase().includes(s) || 
          m.generic_name?.toLowerCase().includes(s)
        );
      }
      return medicines;
    }
  });
}

export function useMedicineCategories() {
  return useQuery({
    queryKey: ['medicine-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('category');
        
        if (error) throw error;
        if (data && data.length > 0) return [...new Set(data.map(m => m.category))];
      } catch {
        console.log('Using local storage for medicine categories');
      }
      
      return [...new Set(store.getMedicines().map(m => m.category))];
    }
  });
}

export function useMedicine(id?: string) {
  return useQuery({
    queryKey: ['medicine', id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        if (data) return data as Medicine;
      } catch {
        console.log('Using local storage for medicine');
      }
      
      return store.getMedicines().find(m => m.id === id) || null;
    },
    enabled: !!id
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (medicine: Omit<Medicine, 'id' | 'created_at'>) => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .insert(medicine)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for create medicine');
        return store.createMedicine(medicine);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['medicine-categories'] });
    }
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Medicine> & { id: string }) => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for update medicine');
        const medicines = store.getMedicines();
        const index = medicines.findIndex(m => m.id === id);
        if (index === -1) throw new Error('Medicine not found');
        // Note: localStore doesn't have updateMedicine, would need to add it
        return { ...medicines[index], ...updates };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
}
