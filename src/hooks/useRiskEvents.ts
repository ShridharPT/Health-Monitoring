import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RiskEvent } from '@/types/medical';
import * as store from '@/lib/localStore';

export function useRiskEvents(limit = 50) {
  return useQuery({
    queryKey: ['riskEvents', limit],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('risk_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (data && data.length > 0) return data as RiskEvent[];
      } catch {
        console.log('Using local storage for risk events');
      }
      
      return store.getRiskEvents().slice(0, limit);
    },
  });
}

export function usePatientRiskEvents(patientId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['riskEvents', patientId, limit],
    queryFn: async () => {
      if (!patientId) return [];
      
      try {
        const { data, error } = await supabase
          .from('risk_events')
          .select('*')
          .eq('patient_id', patientId)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (data && data.length > 0) return data as RiskEvent[];
      } catch {
        console.log('Using local storage for patient risk events');
      }
      
      return store.getRiskEvents().filter(e => e.patient_id === patientId).slice(0, limit);
    },
    enabled: !!patientId,
  });
}

export function useUnacknowledgedEvents() {
  return useQuery({
    queryKey: ['unacknowledgedEvents'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('risk_events')
          .select('*')
          .eq('acknowledged', false)
          .order('timestamp', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) return data as RiskEvent[];
      } catch {
        console.log('Using local storage for unacknowledged events');
      }
      
      return store.getRiskEvents().filter(e => !e.acknowledged);
    },
  });
}

export function useAcknowledgeEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      try {
        const { data, error } = await supabase
          .from('risk_events')
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
          })
          .eq('id', eventId)
          .select()
          .single();

        if (error) throw error;
        return data as RiskEvent;
      } catch {
        console.log('Using local storage for acknowledge event');
        const updated = store.acknowledgeRiskEvent(eventId);
        if (!updated) throw new Error('Event not found');
        return updated;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskEvents'] });
      queryClient.invalidateQueries({ queryKey: ['unacknowledgedEvents'] });
    },
  });
}

export function useRealtimeRiskEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('risk-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_events',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['riskEvents'] });
          queryClient.invalidateQueries({ queryKey: ['unacknowledgedEvents'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
