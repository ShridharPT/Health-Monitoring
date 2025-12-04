export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  blood_type?: string;
  room_no: string;
  bed_no?: string;
  admission_date: string;
  status: 'stable' | 'monitoring' | 'critical';
  diagnosis?: string;
  allergies?: string[];
  emergency_contact?: string;
  insurance_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Vitals {
  id: string;
  patient_id: string;
  heart_rate: number;
  spo2: number;
  resp_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  timestamp: string;
  created_at: string;
}

export interface Prediction {
  id: string;
  patient_id: string;
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  probability: number;
  explanation: string;
  contributing_factors?: ContributingFactor[];
  timestamp: string;
  created_at: string;
}

export interface ContributingFactor {
  vital: string;
  value: number;
  status: 'normal' | 'warning' | 'critical';
  message: string;
}

export interface RiskEvent {
  id: string;
  patient_id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  vital_id?: string;
  prediction_id?: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  timestamp: string;
}

export interface VitalRanges {
  heart_rate: { min: number; max: number; criticalMin: number; criticalMax: number };
  spo2: { min: number; criticalMin: number };
  resp_rate: { min: number; max: number; criticalMin: number; criticalMax: number };
  systolic_bp: { min: number; max: number; criticalMin: number; criticalMax: number };
  diastolic_bp: { min: number; max: number; criticalMin: number; criticalMax: number };
  temperature: { min: number; max: number; criticalMin: number; criticalMax: number };
}

export const VITAL_RANGES: VitalRanges = {
  heart_rate: { min: 60, max: 100, criticalMin: 40, criticalMax: 150 },
  spo2: { min: 95, criticalMin: 90 },
  resp_rate: { min: 12, max: 20, criticalMin: 8, criticalMax: 30 },
  systolic_bp: { min: 90, max: 140, criticalMin: 70, criticalMax: 180 },
  diastolic_bp: { min: 60, max: 90, criticalMin: 40, criticalMax: 120 },
  temperature: { min: 36.1, max: 37.2, criticalMin: 35, criticalMax: 39 },
};

export type VitalType = 'heart_rate' | 'spo2' | 'resp_rate' | 'systolic_bp' | 'diastolic_bp' | 'temperature';
