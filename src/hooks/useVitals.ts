import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Vitals } from '@/types/medical';
import * as store from '@/lib/localStore';
import { toast } from 'sonner';

export function useVitals(patientId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['vitals', patientId, limit],
    queryFn: async () => {
      if (!patientId) return [];
      
      try {
        const { data, error } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', patientId)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (data && data.length > 0) return data as Vitals[];
      } catch {
        console.log('Using local storage for vitals');
      }
      
      return store.getVitals(patientId).slice(0, limit);
    },
    enabled: !!patientId,
  });
}

export function useLatestVitals(patientId: string | undefined) {
  return useQuery({
    queryKey: ['latestVitals', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      try {
        const { data, error } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', patientId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) return data as Vitals;
      } catch {
        console.log('Using local storage for latest vitals');
      }
      
      const vitals = store.getVitals(patientId);
      return vitals.length > 0 ? vitals[vitals.length - 1] : null;
    },
    enabled: !!patientId,
  });
}

export function useAllLatestVitals() {
  return useQuery({
    queryKey: ['allLatestVitals'],
    queryFn: async () => {
      try {
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('id');

        if (patientsError) throw patientsError;
        if (patients && patients.length > 0) {
          const vitalsPromises = patients.map(async (patient) => {
            const { data, error } = await supabase
              .from('vitals')
              .select('*')
              .eq('patient_id', patient.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (error) throw error;
            return { patientId: patient.id, vitals: data as Vitals | null };
          });

          const results = await Promise.all(vitalsPromises);
          const vitalsMap = results.reduce((acc, { patientId, vitals }) => {
            if (vitals) acc[patientId] = vitals;
            return acc;
          }, {} as Record<string, Vitals>);
          
          if (Object.keys(vitalsMap).length > 0) return vitalsMap;
        }
      } catch {
        console.log('Using local storage for all latest vitals');
      }
      
      // Fallback to local storage
      const result: Record<string, Vitals> = {};
      for (const patient of store.getPatients()) {
        const vitals = store.getVitals(patient.id);
        if (vitals.length > 0) {
          result[patient.id] = vitals[vitals.length - 1];
        }
      }
      return result;
    },
  });
}


export function useCreateVitals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vitals: Omit<Vitals, 'id' | 'created_at'>) => {
      try {
        const { data, error } = await supabase
          .from('vitals')
          .insert(vitals)
          .select()
          .single();

        if (error) throw error;
        return data as Vitals;
      } catch {
        console.log('Using local storage for create vitals');
        return store.addVitals(vitals);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vitals', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['latestVitals', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['allLatestVitals'] });
    },
    onError: (error) => {
      toast.error('Failed to record vitals: ' + error.message);
    },
  });
}

export function useRealtimeVitals(patientId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`vitals-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vitals',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vitals', patientId] });
          queryClient.invalidateQueries({ queryKey: ['latestVitals', patientId] });
          queryClient.invalidateQueries({ queryKey: ['allLatestVitals'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);
}

export function useRealtimeAllVitals() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('all-vitals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vitals',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vitals'] });
          queryClient.invalidateQueries({ queryKey: ['latestVitals'] });
          queryClient.invalidateQueries({ queryKey: ['allLatestVitals'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
