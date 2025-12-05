import { supabase } from '../lib/supabase.js';
import { createNotification } from '../services/notifications.js';
import { predictDeteriorationRisk, generateExplanation as mlGenerateExplanation, getModelInfo } from './mlModel.js';

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

// Log model info on startup
const modelInfo = getModelInfo();
console.log(`ML Model loaded: ${modelInfo.version} (${modelInfo.type})${modelInfo.accuracy ? `, AUC: ${modelInfo.accuracy.toFixed(3)}` : ''}`);

function calculateShapValues(vitals: Vitals, contributingFactors: ContributingFactor[]): ShapValue[] {
  // Convert contributing factors to SHAP-like values
  return contributingFactors.map(f => ({
    feature: f.vital,
    value: f.value,
    contribution: f.status === 'critical' ? 0.15 : f.status === 'warning' ? 0.05 : 0
  })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

export async function runPrediction(patientId: string, vitals: Vitals) {
  // Use ML model for prediction
  const mlResult = predictDeteriorationRisk({
    heart_rate: vitals.heart_rate,
    spo2: vitals.spo2,
    resp_rate: vitals.resp_rate,
    systolic_bp: vitals.systolic_bp,
    diastolic_bp: vitals.diastolic_bp,
    temperature: vitals.temperature,
  });
  
  const riskScore = mlResult.risk_score;
  const riskLevel = mlResult.risk_level;
  
  // Convert contributing factors to expected format
  const contributingFactors: ContributingFactor[] = mlResult.contributing_factors.map(f => ({
    vital: f.vital,
    value: f.value,
    status: f.status,
    message: f.message,
  }));
  
  // Generate explanation using ML model
  const explanation = mlGenerateExplanation(mlResult);
  
  // Calculate SHAP values from contributing factors
  const shapValues = calculateShapValues(vitals, contributingFactors);
  
  // Save prediction
  const { data: prediction, error } = await supabase
    .from('predictions')
    .insert({
      patient_id: patientId,
      risk_level: riskLevel,
      probability: riskScore,
      explanation,
      contributing_factors: contributingFactors,
      model_version: mlResult.model_version
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
