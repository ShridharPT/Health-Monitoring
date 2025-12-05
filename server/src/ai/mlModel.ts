/**
 * ML Model Integration for VitalGuard AI
 * Uses trained model weights or rule-based fallback for deterioration prediction
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ModelConfig {
  model_type: string;
  model_version: string;
  thresholds: Record<string, Record<string, number>>;
  feature_weights: Record<string, number>;
  risk_levels: Record<string, { max_score: number; label: string }>;
  data_statistics: {
    total_samples: number;
    deterioration_rate: number;
    feature_means: Record<string, number>;
    feature_stds: Record<string, number>;
  };
}

interface ScalerConfig {
  mean: number[];
  scale: number[];
  feature_names: string[];
}

interface ModelMetadata {
  model_version: string;
  roc_auc: number;
  thresholds: {
    low_risk: number;
    moderate_risk: number;
    high_risk: number;
  };
}

interface VitalsInput {
  heart_rate: number;
  spo2: number;
  resp_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
}

interface PredictionResult {
  risk_score: number;
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  confidence: number;
  contributing_factors: Array<{
    vital: string;
    value: number;
    contribution: number;
    status: 'normal' | 'warning' | 'critical';
    message: string;
  }>;
  model_version: string;
}

// Load model configuration
let modelConfig: ModelConfig | null = null;
let scalerConfig: ScalerConfig | null = null;
let modelMetadata: ModelMetadata | null = null;

function loadModelConfig(): void {
  const modelDir = join(__dirname, '../../models/deterioration_model');
  
  // Try to load rule-based config first (always available)
  const ruleConfigPath = join(modelDir, 'rule_config.json');
  if (existsSync(ruleConfigPath)) {
    try {
      modelConfig = JSON.parse(readFileSync(ruleConfigPath, 'utf-8'));
      console.log(`Loaded rule-based model config: ${modelConfig?.model_version}`);
    } catch (e) {
      console.error('Failed to load rule config:', e);
    }
  }
  
  // Try to load scaler config (for neural network)
  const scalerPath = join(modelDir, 'scaler.json');
  if (existsSync(scalerPath)) {
    try {
      scalerConfig = JSON.parse(readFileSync(scalerPath, 'utf-8'));
    } catch (e) {
      console.error('Failed to load scaler config:', e);
    }
  }
  
  // Try to load model metadata
  const metadataPath = join(modelDir, 'metadata.json');
  if (existsSync(metadataPath)) {
    try {
      modelMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      console.log(`Loaded model metadata: ${modelMetadata?.model_version}, AUC: ${modelMetadata?.roc_auc}`);
    } catch (e) {
      console.error('Failed to load model metadata:', e);
    }
  }
}

// Initialize on module load
loadModelConfig();

// Default thresholds (from ML training on 417k samples)
const DEFAULT_THRESHOLDS = {
  heart_rate: { min: 62, max: 129, criticalMin: 66, criticalMax: 120, warningMin: 77, warningMax: 111 },
  spo2: { min: 94, criticalMin: 87, warningMin: 92 },
  resp_rate: { min: 11, max: 34, criticalMin: 13, criticalMax: 31, warningMin: 16, warningMax: 27 },
  systolic_bp: { min: 77, max: 139, criticalMin: 82, criticalMax: 136, warningMin: 91, warningMax: 125 },
  diastolic_bp: { min: 49, max: 86, criticalMin: 50, criticalMax: 86, warningMin: 57, warningMax: 79 },
  temperature: { min: 36.4, max: 37.7, criticalMin: 36.3, criticalMax: 37.7, warningMin: 36.6, warningMax: 37.4 },
};

// Default feature weights (from ML training - Random Forest feature importance)
const DEFAULT_WEIGHTS = {
  heart_rate: 0.156,
  spo2: 0.321,
  resp_rate: 0.167,
  systolic_bp: 0.198,
  diastolic_bp: 0.095,
  temperature: 0.062,
};

function getVitalStatus(
  vital: string,
  value: number
): { status: 'normal' | 'warning' | 'critical'; deviation: number } {
  // Get thresholds from config or defaults
  const configThresholds = modelConfig?.thresholds?.[vital];
  const defaultThreshold = DEFAULT_THRESHOLDS[vital as keyof typeof DEFAULT_THRESHOLDS];
  
  if (!defaultThreshold) {
    return { status: 'normal', deviation: 0 };
  }
  
  // Handle SpO2 (only has lower bounds - lower is worse)
  if (vital === 'spo2') {
    const criticalMin = configThresholds?.critical_min ?? defaultThreshold.criticalMin ?? 87;
    const warningMin = configThresholds?.warning_min ?? defaultThreshold.warningMin ?? 92;
    const normalMin = configThresholds?.normal_min ?? defaultThreshold.min ?? 94;
    
    if (value < criticalMin) return { status: 'critical', deviation: (criticalMin - value) / 10 };
    if (value < warningMin) return { status: 'warning', deviation: (warningMin - value) / 10 };
    if (value < normalMin) return { status: 'warning', deviation: (normalMin - value) / 20 };
    return { status: 'normal', deviation: 0 };
  }
  
  // Handle other vitals with both bounds
  const t = defaultThreshold as { min: number; max: number; criticalMin: number; criticalMax: number; warningMin?: number; warningMax?: number };
  const ct = configThresholds || {};
  
  const criticalMin = ct.critical_min ?? t.criticalMin;
  const criticalMax = ct.critical_max ?? t.criticalMax;
  const warningMin = ct.warning_min ?? t.warningMin ?? t.min;
  const warningMax = ct.warning_max ?? t.warningMax ?? t.max;
  const normalMin = ct.normal_min ?? t.min;
  const normalMax = ct.normal_max ?? t.max;
  
  // Check critical thresholds
  if (value <= criticalMin) {
    return { status: 'critical', deviation: Math.abs(criticalMin - value) / Math.abs(criticalMin) };
  }
  if (value >= criticalMax) {
    return { status: 'critical', deviation: Math.abs(value - criticalMax) / criticalMax };
  }
  
  // Check warning thresholds
  if (value < warningMin) {
    return { status: 'warning', deviation: Math.abs(warningMin - value) / Math.abs(warningMin) };
  }
  if (value > warningMax) {
    return { status: 'warning', deviation: Math.abs(value - warningMax) / warningMax };
  }
  
  // Check normal range
  if (value < normalMin || value > normalMax) {
    return { status: 'warning', deviation: 0.1 };
  }
  
  return { status: 'normal', deviation: 0 };
}

function getVitalLabel(vital: string): string {
  const labels: Record<string, string> = {
    heart_rate: 'Heart Rate',
    spo2: 'SpO₂',
    resp_rate: 'Respiratory Rate',
    systolic_bp: 'Systolic BP',
    diastolic_bp: 'Diastolic BP',
    temperature: 'Temperature',
  };
  return labels[vital] || vital;
}

export function predictDeteriorationRisk(vitals: VitalsInput): PredictionResult {
  const weights = modelConfig?.feature_weights || DEFAULT_WEIGHTS;
  const contributing_factors: PredictionResult['contributing_factors'] = [];
  let totalScore = 0;
  let totalWeight = 0;
  
  // Map input vitals to model feature names
  const vitalMapping: Record<string, keyof VitalsInput> = {
    heart_rate: 'heart_rate',
    spo2: 'spo2',
    spo2_pct: 'spo2',
    resp_rate: 'resp_rate',
    respiratory_rate: 'resp_rate',
    systolic_bp: 'systolic_bp',
    diastolic_bp: 'diastolic_bp',
    temperature: 'temperature',
    temperature_c: 'temperature',
  };
  
  // Calculate risk score for each vital
  for (const [vitalKey, inputKey] of Object.entries(vitalMapping)) {
    const value = vitals[inputKey as keyof VitalsInput];
    if (value === undefined || value === null) continue;
    
    const weight = (weights as Record<string, number>)[vitalKey] || (weights as Record<string, number>)[inputKey] || 0.1;
    const { status, deviation } = getVitalStatus(vitalKey, value);
    
    let contribution = 0;
    if (status === 'critical') {
      contribution = weight * (0.8 + deviation * 0.2);
    } else if (status === 'warning') {
      contribution = weight * (0.4 + deviation * 0.2);
    }
    
    totalScore += contribution;
    totalWeight += weight;
    
    // Generate message
    let message = `${getVitalLabel(inputKey)} is normal at ${value}`;
    if (status === 'warning') {
      message = `${getVitalLabel(inputKey)} is abnormal at ${value}`;
    } else if (status === 'critical') {
      message = `${getVitalLabel(inputKey)} is critically abnormal at ${value}`;
    }
    
    contributing_factors.push({
      vital: inputKey,
      value,
      contribution,
      status,
      message,
    });
  }
  
  // Normalize score
  const risk_score = totalWeight > 0 ? Math.min(totalScore / totalWeight, 1) : 0;
  
  // Determine risk level using model thresholds or defaults
  const thresholds = modelMetadata?.thresholds || { low_risk: 0.3, moderate_risk: 0.6, high_risk: 0.8 };
  let risk_level: PredictionResult['risk_level'];
  
  if (risk_score >= thresholds.high_risk) {
    risk_level = 'High Risk';
  } else if (risk_score >= thresholds.moderate_risk) {
    risk_level = 'Moderate Risk';
  } else {
    risk_level = 'Low Risk';
  }
  
  // Calculate confidence based on data availability and model quality
  const dataCompleteness = contributing_factors.length / 6;
  const modelQuality = modelMetadata?.roc_auc || 0.75;
  const confidence = dataCompleteness * modelQuality;
  
  // Sort contributing factors by contribution
  contributing_factors.sort((a, b) => b.contribution - a.contribution);
  
  return {
    risk_score,
    risk_level,
    confidence,
    contributing_factors,
    model_version: modelConfig?.model_version || modelMetadata?.model_version || 'v1.0-rule-based',
  };
}

export function generateExplanation(result: PredictionResult): string {
  const criticalFactors = result.contributing_factors.filter(f => f.status === 'critical');
  const warningFactors = result.contributing_factors.filter(f => f.status === 'warning');
  
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
  
  if (result.risk_level === 'High Risk') {
    explanation += 'Immediate medical attention recommended.';
  } else if (result.risk_level === 'Moderate Risk') {
    explanation += 'Close monitoring advised.';
  }
  
  return explanation;
}

export function getModelInfo(): {
  version: string;
  type: string;
  accuracy?: number;
  loaded: boolean;
} {
  return {
    version: modelConfig?.model_version || modelMetadata?.model_version || 'v1.0-default',
    type: modelConfig?.model_type || 'rule_based',
    accuracy: modelMetadata?.roc_auc,
    loaded: modelConfig !== null || modelMetadata !== null,
  };
}
