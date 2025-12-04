// Extended Hospital Platform Types

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient';

export interface Staff {
  id: string;
  name: string;
  email: string;
  password_hash?: string; // Stored password for authentication
  role: UserRole;
  contact?: string;
  department?: string;
  specialization?: string;
  on_duty: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  patient_id: string;
  doctor_id: string;
  nurse_id?: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'transferred';
  notes?: string;
  created_at: string;
  // Joined data
  patient?: import('./medical').Patient;
  doctor?: Staff;
  nurse?: Staff;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  default_dosage: string;
  unit: string;
  category: string;
  route: string;
  interactions: string[];
  contraindications: string[];
  side_effects: string[];
  created_at: string;
}

export interface PrescriptionMedicine {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  unit: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  nurse_id?: string;
  medicines: PrescriptionMedicine[];
  from_voice: boolean;
  voice_transcript?: string;
  status: 'pending' | 'acknowledged' | 'administered' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  created_at: string;
  acknowledged_at?: string;
  administered_at?: string;
  completed_at?: string;
  // Joined data
  patient?: import('./medical').Patient;
  doctor?: Staff;
  nurse?: Staff;
}


export type DeviceType = 'ecg' | 'spo2' | 'bp' | 'temperature' | 'wearable' | 'multi';
export type DeviceStatus = 'online' | 'offline' | 'error' | 'maintenance';

export interface IoTDevice {
  id: string;
  device_id: string;
  patient_id?: string;
  device_type: DeviceType;
  manufacturer?: string;
  model?: string;
  status: DeviceStatus;
  battery_level?: number;
  firmware_version?: string;
  last_seen?: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: import('./medical').Patient;
}

export interface VitalForecast {
  timestamp: string;
  heart_rate: number;
  spo2: number;
  resp_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  confidence: number;
}

export interface Forecast {
  id: string;
  patient_id: string;
  forecast_json: {
    forecasts: VitalForecast[];
    summary: string;
  };
  horizon_minutes: number;
  model_version?: string;
  confidence?: number;
  risk_projection: 'stable' | 'improving' | 'declining' | 'critical';
  timestamp: string;
  created_at: string;
}

export type NotificationType = 'alert' | 'prescription' | 'chat' | 'assignment' | 'device' | 'system' | 'escalation';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  patient_id?: string;
  staff_id?: string;
  sender_id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read_status: boolean;
  acknowledged: boolean;
  acknowledged_at?: string;
  escalated: boolean;
  escalated_to?: string;
  timestamp: string;
  // Joined data
  patient?: import('./medical').Patient;
  staff?: Staff;
  sender?: Staff;
}

export type MessageType = 'text' | 'image' | 'file' | 'vitals_snapshot' | 'prescription_ref';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  patient_id?: string;
  message: string;
  message_type: MessageType;
  attachment_url?: string;
  reference_id?: string;
  is_urgent: boolean;
  read_at?: string;
  delivered_at?: string;
  timestamp: string;
  // Joined data
  sender?: Staff;
  receiver?: Staff;
  patient?: import('./medical').Patient;
}

export type ReportType = 'daily' | 'weekly' | 'discharge' | 'emergency' | 'custom';

export interface Report {
  id: string;
  patient_id: string;
  generated_by?: string;
  report_type: ReportType;
  file_path?: string;
  file_url?: string;
  content?: Record<string, unknown>;
  date_range_start?: string;
  date_range_end?: string;
  generated_at: string;
  // Joined data
  patient?: import('./medical').Patient;
  generator?: Staff;
}

export interface AuditLog {
  id: string;
  staff_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

// Auth context
export interface AuthUser {
  id: string;
  staff: Staff;
  token: string;
}

// WebSocket message types
export interface WSMessage {
  type: 'vitals' | 'notification' | 'chat' | 'forecast' | 'device_status';
  payload: unknown;
  timestamp: string;
}

// AI Prediction with SHAP values
export interface PredictionWithExplanation {
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  probability: number;
  explanation: string;
  shap_values: {
    feature: string;
    value: number;
    contribution: number;
  }[];
  contributing_factors: {
    vital: string;
    value: number;
    status: 'normal' | 'warning' | 'critical';
    message: string;
  }[];
}
