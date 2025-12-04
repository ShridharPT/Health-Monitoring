import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prediction, Vitals } from '@/types/medical';
import * as store from '@/lib/localStore';
import { predictRisk } from '@/lib/riskPrediction';
import { toast } from 'sonner';

export function usePredictions(patientId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['predictions', patientId, limit],
    queryFn: async () => {
      if (!patientId) return [];
      
      try {
        const { data, error } = await supabase
          .from('predictions')
          .select('*')
          .eq('patient_id', patientId)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (data && data.length > 0) return data as unknown as Prediction[];
      } catch {
        console.log('Using local storage for predictions');
      }
      
      // No local predictions storage yet - return empty
      return [];
    },
    enabled: !!patientId,
  });
}

export function useLatestPrediction(patientId: string | undefined) {
  return useQuery({
    queryKey: ['latestPrediction', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      try {
        const { data, error } = await supabase
          .from('predictions')
          .select('*')
          .eq('patient_id', patientId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) return data as unknown as Prediction;
      } catch {
        console.log('Using local storage for latest prediction');
      }
      
      return null;
    },
    enabled: !!patientId,
  });
}

export function useAllLatestPredictions() {
  return useQuery({
    queryKey: ['allLatestPredictions'],
    queryFn: async () => {
      try {
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('id');

        if (patientsError) throw patientsError;
        if (patients && patients.length > 0) {
          const predictionsPromises = patients.map(async (patient) => {
            const { data, error } = await supabase
              .from('predictions')
              .select('*')
              .eq('patient_id', patient.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (error) throw error;
            return { patientId: patient.id, prediction: data as unknown as Prediction | null };
          });

          const results = await Promise.all(predictionsPromises);
          const predictionsMap = results.reduce((acc, { patientId, prediction }) => {
            if (prediction) acc[patientId] = prediction;
            return acc;
          }, {} as Record<string, Prediction>);
          
          if (Object.keys(predictionsMap).length > 0) return predictionsMap;
        }
      } catch {
        console.log('Using local storage for all predictions');
      }
      
      return {} as Record<string, Prediction>;
    },
  });
}

export function useCreatePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, vitals }: { patientId: string; vitals: Vitals }) => {
      const result = predictRisk(vitals);
      
      try {
        const { data, error } = await supabase
          .from('predictions')
          .insert({
            patient_id: patientId,
            risk_level: result.risk_level,
            probability: result.probability,
            explanation: result.explanation,
            contributing_factors: result.contributing_factors as unknown as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        if (result.risk_level === 'High Risk') {
          await supabase.from('risk_events').insert({
            patient_id: patientId,
            event_type: 'HIGH_RISK_DETECTED',
            severity: 'critical',
            message: result.explanation,
            prediction_id: data.id,
          });
        }

        return data as unknown as Prediction;
      } catch {
        console.log('Using local storage for create prediction');
        // Create risk event locally if high risk
        if (result.risk_level === 'High Risk') {
          store.createRiskEvent({
            patient_id: patientId,
            event_type: 'HIGH_RISK_DETECTED',
            severity: 'critical',
            message: result.explanation,
            acknowledged: false,
            timestamp: new Date().toISOString(),
          });
        }
        
        return {
          id: `pred-${Date.now()}`,
          patient_id: patientId,
          ...result,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        } as Prediction;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['predictions', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['latestPrediction', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['allLatestPredictions'] });
      queryClient.invalidateQueries({ queryKey: ['riskEvents'] });
      
      if (data.risk_level === 'High Risk') {
        toast.error(`High Risk Alert: ${data.explanation}`, {
          duration: 10000,
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to generate prediction: ' + error.message);
    },
  });
}

export function useRealtimePredictions(patientId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`predictions-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['predictions', patientId] });
          queryClient.invalidateQueries({ queryKey: ['latestPrediction', patientId] });
          queryClient.invalidateQueries({ queryKey: ['allLatestPredictions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);
}
