import { supabase } from '../lib/supabase.js';
import { createNotification } from '../services/notifications.js';

interface Vitals {
  id: string;
  patient_id: string;
  heart_rate: number;
  spo2: number;
  resp_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  timestamp: string;
}

interface ContributingFactor {
  vital: string;
  value: number;
  status: 'normal' | 'warning' | 'critical';
  message: string;
}

interface ShapValue {
  feature: string;
  value: number;
  contribution: number;
}

const VITAL_RANGES = {
  heart_rate: { min: 60, max: 100, criticalMin: 40, criticalMax: 150 },
  spo2: { min: 95, criticalMin: 90 },
  resp_rate: { min: 12, max: 20, criticalMin: 8, criticalMax: 30 },
  systolic_bp: { min: 90, max: 140, criticalMin: 70, criticalMax: 180 },
  diastolic_bp: { min: 60, max: 90, criticalMin: 40, criticalMax: 120 },
  temperature: { min: 36.1, max: 37.2, criticalMin: 35, criticalMax: 39 },
};

function getVitalStatus(vital: keyof typeof VITAL_RANGES, value: number): 'normal' | 'warning' | 'critical' {
  const range = VITAL_RANGES[vital];
  
  if (vital === 'spo2') {
    if (value < range.criticalMin) return 'critical';
    if (value < range.min) return 'warning';
    return 'normal';
  }
  
  // For other vitals that have criticalMax and max
  const fullRange = range as { min: number; max: number; criticalMin: number; criticalMax: number };
  if (value <= fullRange.criticalMin || value >= fullRange.criticalMax) return 'critical';
  if (value < fullRange.min || value > fullRange.max) return 'warning';
  return 'normal';
}

function calculateRiskScore(vitals: Vitals): number {
  let score = 0;
  const weights = {
    heart_rate: 0.2,
    spo2: 0.25,
    resp_rate: 0.2,
    systolic_bp: 0.15,
    diastolic_bp: 0.1,
    temperature: 0.1,
  };
  
  for (const [vital, weight] of Object.entries(weights)) {
    const status = getVitalStatus(vital as keyof typeof VITAL_RANGES, vitals[vital as keyof Vitals] as number);
    if (status === 'critical') score += weight * 1.0;
    else if (status === 'warning') score += weight * 0.5;
  }
  
  return Math.min(score, 1);
}

function generateExplanation(factors: ContributingFactor[], riskLevel: string): string {
  const criticalFactors = factors.filter(f => f.status === 'critical');
  const warningFactors = factors.filter(f => f.status === 'warning');
  
  if (criticalFactors.length === 0 && warningFactors.length === 0) {
    return 'All vital signs are within normal ranges. Patient condition appears stable.';
  }
  
  let explanation = '';
  
  if (criticalFactors.length > 0) {
    explanation += `Critical concerns: ${criticalFactors.map(f => f.message).join('; ')}. `;
  }
  
  if (warningFactors.length > 0) {
    explanation += `Monitoring needed: ${warningFactors.map(f => f.message).join('; ')}. `;
  }
  
  if (riskLevel === 'High Risk') {
    explanation += 'Immediate medical attention recommended.';
  } else if (riskLevel === 'Moderate Risk') {
    explanation += 'Close monitoring advised.';
  }
  
  return explanation;
}

function calculateShapValues(vitals: Vitals): ShapValue[] {
  // Simplified SHAP-like contribution calculation
  const shapValues: ShapValue[] = [];
  const baseRisk = 0.1; // baseline risk
  
  const vitalKeys: (keyof typeof VITAL_RANGES)[] = ['heart_rate', 'spo2', 'resp_rate', 'systolic_bp', 'diastolic_bp', 'temperature'];
  
  for (const vital of vitalKeys) {
    const value = vitals[vital as keyof Vitals] as number;
    const status = getVitalStatus(vital, value);
    let contribution = 0;
    
    if (status === 'critical') contribution = 0.15;
    else if (status === 'warning') contribution = 0.05;
    
    shapValues.push({
      feature: vital,
      value,
      contribution
    });
  }
  
  return shapValues.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

export async function runPrediction(patientId: string, vitals: Vitals) {
  // Calculate risk score
  const riskScore = calculateRiskScore(vitals);
  
  // Determine risk level
  let riskLevel: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  if (riskScore >= 0.6) riskLevel = 'High Risk';
  else if (riskScore >= 0.3) riskLevel = 'Moderate Risk';
  else riskLevel = 'Low Risk';
  
  // Generate contributing factors
  const contributingFactors: ContributingFactor[] = [];
  const vitalLabels: Record<string, string> = {
    heart_rate: 'Heart Rate',
    spo2: 'SpO₂',
    resp_rate: 'Respiratory Rate',
    systolic_bp: 'Systolic BP',
    diastolic_bp: 'Diastolic BP',
    temperature: 'Temperature'
  };
  
  for (const [vital, label] of Object.entries(vitalLabels)) {
    const value = vitals[vital as keyof Vitals] as number;
    const status = getVitalStatus(vital as keyof typeof VITAL_RANGES, value);
    
    let message = `${label} is normal at ${value}`;
    if (status === 'warning') message = `${label} is elevated at ${value}`;
    if (status === 'critical') message = `${label} is critically abnormal at ${value}`;
    
    contributingFactors.push({ vital, value, status, message });
  }
  
  // Generate explanation
  const explanation = generateExplanation(contributingFactors, riskLevel);
  
  // Calculate SHAP values
  const shapValues = calculateShapValues(vitals);
  
  // Save prediction
  const { data: prediction, error } = await supabase
    .from('predictions')
    .insert({
      patient_id: patientId,
      risk_level: riskLevel,
      probability: riskScore,
      explanation,
      contributing_factors: contributingFactors,
      model_version: 'v1.0-rule-based'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create risk event if high/moderate risk
  if (riskLevel !== 'Low Risk') {
    await supabase.from('risk_events').insert({
      patient_id: patientId,
      event_type: 'risk_prediction',
      severity: riskLevel === 'High Risk' ? 'critical' : 'warning',
      message: explanation,
      vital_id: vitals.id,
      prediction_id: prediction.id
    });
    
    // Get assignment and notify staff
    const { data: assignment } = await supabase
      .from('assignments')
      .select('doctor_id, nurse_id')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .single();
    
    if (assignment) {
      const priority = riskLevel === 'High Risk' ? 'urgent' : 'high';
      
      if (assignment.doctor_id) {
        await createNotification({
          patient_id: patientId,
          staff_id: assignment.doctor_id,
          type: 'alert',
          priority,
          title: `${riskLevel} Alert`,
          message: explanation,
          data: { prediction_id: prediction.id, vitals_id: vitals.id }
        });
      }
      
      if (assignment.nurse_id) {
        await createNotification({
          patient_id: patientId,
          staff_id: assignment.nurse_id,
          type: 'alert',
          priority,
          title: `${riskLevel} Alert`,
          message: explanation,
          data: { prediction_id: prediction.id, vitals_id: vitals.id }
        });
      }
    }
  }
  
  return {
    ...prediction,
    shap_values: shapValues
  };
}
