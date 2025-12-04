import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Forecast } from '@/types/hospital';

export function useLatestForecast(patientId?: string) {
  return useQuery({
    queryKey: ['forecast', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Forecast | null;
    },
    enabled: !!patientId
  });
}

export function useForecasts(patientId?: string, limit = 10) {
  return useQuery({
    queryKey: ['forecasts', patientId, limit],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Forecast[];
    },
    enabled: !!patientId
  });
}

export function useGenerateForecast() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ patientId, horizonMinutes = 30 }: { patientId: string; horizonMinutes?: number }) => {
      // Get recent vitals
      const { data: vitals, error: vitalsError } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (vitalsError) throw vitalsError;
      if (!vitals || vitals.length < 2) {
        throw new Error('Not enough vitals data for forecasting');
      }
      
      // Simple linear forecast (in production, use ML model)
      const forecasts = generateSimpleForecast(vitals.reverse(), horizonMinutes);
      const riskProjection = assessRiskProjection(forecasts);
      
      const { data, error } = await supabase
        .from('forecasts')
        .insert({
          patient_id: patientId,
          forecast_json: { forecasts, summary: generateSummary(riskProjection) },
          horizon_minutes: horizonMinutes,
          model_version: 'v1.0-client',
          confidence: 0.75,
          risk_projection: riskProjection
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Forecast;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forecast', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['forecasts', data.patient_id] });
    }
  });
}

function generateSimpleForecast(vitals: any[], horizonMinutes: number) {
  const forecasts = [];
  const intervals = [5, 10, 15, 20, 25, 30].filter(m => m <= horizonMinutes);
  const now = new Date();
  
  const latest = vitals[vitals.length - 1];
  const trend = vitals.length > 1 ? {
    heart_rate: (vitals[vitals.length - 1].heart_rate - vitals[0].heart_rate) / vitals.length,
    spo2: (vitals[vitals.length - 1].spo2 - vitals[0].spo2) / vitals.length,
    resp_rate: (vitals[vitals.length - 1].resp_rate - vitals[0].resp_rate) / vitals.length,
    systolic_bp: (vitals[vitals.length - 1].systolic_bp - vitals[0].systolic_bp) / vitals.length,
    diastolic_bp: (vitals[vitals.length - 1].diastolic_bp - vitals[0].diastolic_bp) / vitals.length,
    temperature: (vitals[vitals.length - 1].temperature - vitals[0].temperature) / vitals.length,
  } : { heart_rate: 0, spo2: 0, resp_rate: 0, systolic_bp: 0, diastolic_bp: 0, temperature: 0 };
  
  for (const minutes of intervals) {
    const factor = minutes / 5;
    forecasts.push({
      timestamp: new Date(now.getTime() + minutes * 60000).toISOString(),
      heart_rate: Math.round(Math.max(40, Math.min(180, latest.heart_rate + trend.heart_rate * factor + (Math.random() - 0.5) * 5))),
      spo2: Math.round(Math.max(80, Math.min(100, latest.spo2 + trend.spo2 * factor + (Math.random() - 0.5) * 1)) * 10) / 10,
      resp_rate: Math.round(Math.max(8, Math.min(35, latest.resp_rate + trend.resp_rate * factor + (Math.random() - 0.5) * 2))),
      systolic_bp: Math.round(Math.max(70, Math.min(200, latest.systolic_bp + trend.systolic_bp * factor + (Math.random() - 0.5) * 5))),
      diastolic_bp: Math.round(Math.max(40, Math.min(130, latest.diastolic_bp + trend.diastolic_bp * factor + (Math.random() - 0.5) * 3))),
      temperature: Math.round(Math.max(35, Math.min(40, latest.temperature + trend.temperature * factor + (Math.random() - 0.5) * 0.2)) * 10) / 10,
      confidence: Math.max(0.5, 0.9 - minutes * 0.01)
    });
  }
  
  return forecasts;
}

function assessRiskProjection(forecasts: any[]): 'stable' | 'improving' | 'declining' | 'critical' {
  if (forecasts.length < 2) return 'stable';
  
  const last = forecasts[forecasts.length - 1];
  
  if (last.spo2 < 90 || last.heart_rate > 150 || last.heart_rate < 40) return 'critical';
  if (last.spo2 < 94 || last.heart_rate > 120 || last.resp_rate > 25) return 'declining';
  
  const first = forecasts[0];
  if (last.spo2 > first.spo2 + 1) return 'improving';
  
  return 'stable';
}

function generateSummary(projection: string): string {
  switch (projection) {
    case 'critical': return 'ALERT: Critical deterioration predicted. Immediate attention required.';
    case 'declining': return 'Warning: Vital signs may decline. Close monitoring recommended.';
    case 'improving': return 'Patient vitals show improving trends.';
    default: return 'Patient vitals are expected to remain stable.';
  }
}

export function useRealtimeForecasts(patientId?: string) {
  const queryClient = useQueryClient();
  
  if (patientId) {
    supabase
      .channel(`forecasts-${patientId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'forecasts',
        filter: `patient_id=eq.${patientId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['forecast', patientId] });
        queryClient.invalidateQueries({ queryKey: ['forecasts', patientId] });
      })
      .subscribe();
  }
}
