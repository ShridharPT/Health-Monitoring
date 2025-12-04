import { supabase } from '../lib/supabase.js';
import { createNotification } from '../services/notifications.js';

interface VitalForecast {
  timestamp: string;
  heart_rate: number;
  spo2: number;
  resp_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  confidence: number;
}

const VITAL_RANGES = {
  heart_rate: { min: 60, max: 100, criticalMin: 40, criticalMax: 150 },
  spo2: { min: 95, criticalMin: 90 },
  resp_rate: { min: 12, max: 20, criticalMin: 8, criticalMax: 30 },
  systolic_bp: { min: 90, max: 140, criticalMin: 70, criticalMax: 180 },
  diastolic_bp: { min: 60, max: 90, criticalMin: 40, criticalMax: 120 },
  temperature: { min: 36.1, max: 37.2, criticalMin: 35, criticalMax: 39 },
};

function predictNextValue(values: number[], minutesAhead: number): { value: number; confidence: number } {
  if (values.length < 2) {
    return { value: values[0] || 0, confidence: 0.5 };
  }
  
  // Simple linear regression for trend
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Predict future value
  const futureIndex = n + (minutesAhead / 5); // Assuming 5-minute intervals
  let predictedValue = intercept + slope * futureIndex;
  
  // Add some noise for realism
  const noise = (Math.random() - 0.5) * 2;
  predictedValue += noise;
  
  // Calculate confidence based on data consistency
  const variance = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n;
  const confidence = Math.max(0.3, Math.min(0.95, 1 - variance / 100));
  
  return { value: predictedValue, confidence };
}

function assessRiskProjection(forecasts: VitalForecast[]): 'stable' | 'improving' | 'declining' | 'critical' {
  if (forecasts.length < 2) return 'stable';
  
  const lastForecast = forecasts[forecasts.length - 1];
  let criticalCount = 0;
  let warningCount = 0;
  
  // Check each vital in the last forecast
  if (lastForecast.spo2 < VITAL_RANGES.spo2.criticalMin) criticalCount++;
  else if (lastForecast.spo2 < VITAL_RANGES.spo2.min) warningCount++;
  
  if (lastForecast.heart_rate < VITAL_RANGES.heart_rate.criticalMin || 
      lastForecast.heart_rate > VITAL_RANGES.heart_rate.criticalMax) criticalCount++;
  else if (lastForecast.heart_rate < VITAL_RANGES.heart_rate.min || 
           lastForecast.heart_rate > VITAL_RANGES.heart_rate.max) warningCount++;
  
  if (lastForecast.resp_rate < VITAL_RANGES.resp_rate.criticalMin || 
      lastForecast.resp_rate > VITAL_RANGES.resp_rate.criticalMax) criticalCount++;
  
  if (lastForecast.systolic_bp < VITAL_RANGES.systolic_bp.criticalMin || 
      lastForecast.systolic_bp > VITAL_RANGES.systolic_bp.criticalMax) criticalCount++;
  
  if (criticalCount >= 2) return 'critical';
  if (criticalCount >= 1 || warningCount >= 3) return 'declining';
  
  // Check trend
  const firstForecast = forecasts[0];
  const spo2Trend = lastForecast.spo2 - firstForecast.spo2;
  
  if (spo2Trend > 2) return 'improving';
  if (spo2Trend < -3) return 'declining';
  
  return 'stable';
}

export async function runForecast(patientId: string, horizonMinutes: number = 30) {
  // Get recent vitals for trend analysis
  const { data: recentVitals, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  if (!recentVitals || recentVitals.length === 0) {
    throw new Error('No vitals data available for forecasting');
  }
  
  // Reverse to chronological order
  const vitals = recentVitals.reverse();
  
  // Extract time series for each vital
  const heartRates = vitals.map(v => v.heart_rate);
  const spo2Values = vitals.map(v => v.spo2);
  const respRates = vitals.map(v => v.resp_rate);
  const systolicBPs = vitals.map(v => v.systolic_bp);
  const diastolicBPs = vitals.map(v => v.diastolic_bp);
  const temperatures = vitals.map(v => v.temperature);
  
  // Generate forecasts for 5, 10, 15, 20, 25, 30 minutes
  const forecastIntervals = [5, 10, 15, 20, 25, 30].filter(m => m <= horizonMinutes);
  const forecasts: VitalForecast[] = [];
  
  const now = new Date();
  
  for (const minutes of forecastIntervals) {
    const hrPred = predictNextValue(heartRates, minutes);
    const spo2Pred = predictNextValue(spo2Values, minutes);
    const rrPred = predictNextValue(respRates, minutes);
    const sbpPred = predictNextValue(systolicBPs, minutes);
    const dbpPred = predictNextValue(diastolicBPs, minutes);
    const tempPred = predictNextValue(temperatures, minutes);
    
    const avgConfidence = (hrPred.confidence + spo2Pred.confidence + rrPred.confidence + 
                          sbpPred.confidence + dbpPred.confidence + tempPred.confidence) / 6;
    
    forecasts.push({
      timestamp: new Date(now.getTime() + minutes * 60000).toISOString(),
      heart_rate: Math.round(Math.max(30, Math.min(200, hrPred.value))),
      spo2: Math.round(Math.max(70, Math.min(100, spo2Pred.value)) * 10) / 10,
      resp_rate: Math.round(Math.max(5, Math.min(40, rrPred.value))),
      systolic_bp: Math.round(Math.max(60, Math.min(220, sbpPred.value))),
      diastolic_bp: Math.round(Math.max(30, Math.min(140, dbpPred.value))),
      temperature: Math.round(Math.max(34, Math.min(42, tempPred.value)) * 10) / 10,
      confidence: Math.round(avgConfidence * 100) / 100
    });
  }
  
  // Assess risk projection
  const riskProjection = assessRiskProjection(forecasts);
  
  // Generate summary
  let summary = 'Vital signs forecast: ';
  if (riskProjection === 'stable') {
    summary += 'Patient vitals are expected to remain stable over the next ' + horizonMinutes + ' minutes.';
  } else if (riskProjection === 'improving') {
    summary += 'Patient vitals show improving trends.';
  } else if (riskProjection === 'declining') {
    summary += 'Warning: Vital signs may decline. Close monitoring recommended.';
  } else {
    summary += 'ALERT: Critical deterioration predicted. Immediate attention required.';
  }
  
  // Calculate overall confidence
  const overallConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;
  
  // Save forecast
  const { data: forecast, error: saveError } = await supabase
    .from('forecasts')
    .insert({
      patient_id: patientId,
      forecast_json: { forecasts, summary },
      horizon_minutes: horizonMinutes,
      model_version: 'v1.0-linear',
      confidence: overallConfidence,
      risk_projection: riskProjection
    })
    .select()
    .single();
  
  if (saveError) throw saveError;
  
  // Create alert if critical or declining
  if (riskProjection === 'critical' || riskProjection === 'declining') {
    await supabase.from('risk_events').insert({
      patient_id: patientId,
      event_type: 'forecast_warning',
      severity: riskProjection === 'critical' ? 'critical' : 'warning',
      message: summary
    });
    
    // Notify assigned staff
    const { data: assignment } = await supabase
      .from('assignments')
      .select('doctor_id, nurse_id')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .single();
    
    if (assignment) {
      const priority = riskProjection === 'critical' ? 'urgent' : 'high';
      
      if (assignment.doctor_id) {
        await createNotification({
          patient_id: patientId,
          staff_id: assignment.doctor_id,
          type: 'alert',
          priority,
          title: 'Forecast Warning',
          message: summary,
          data: { forecast_id: forecast.id }
        });
      }
      
      if (assignment.nurse_id) {
        await createNotification({
          patient_id: patientId,
          staff_id: assignment.nurse_id,
          type: 'alert',
          priority,
          title: 'Forecast Warning',
          message: summary,
          data: { forecast_id: forecast.id }
        });
      }
    }
  }
  
  return forecast;
}
