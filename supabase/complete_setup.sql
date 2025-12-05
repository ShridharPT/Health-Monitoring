-- =====================================================
-- VITALGUARD AI - COMPLETE DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: BASE TABLES (patients, vitals, predictions, risk_events)
-- =====================================================

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other', 'Male', 'Female', 'Other')),
  blood_type TEXT,
  room_no TEXT NOT NULL,
  bed_no TEXT,
  admission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'stable' CHECK (status IN ('stable', 'monitoring', 'critical')),
  weight NUMERIC(5,2),
  allergies TEXT[],
  contact TEXT,
  emergency_contact TEXT,
  insurance_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vitals table
CREATE TABLE IF NOT EXISTS public.vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  heart_rate INTEGER NOT NULL,
  spo2 NUMERIC(5,2) NOT NULL,
  resp_rate INTEGER NOT NULL,
  systolic_bp INTEGER NOT NULL,
  diastolic_bp INTEGER NOT NULL,
  temperature NUMERIC(4,1) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_id UUID,
  ecg_waveform_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low Risk', 'Moderate Risk', 'High Risk')),
  probability NUMERIC(4,3) NOT NULL,
  explanation TEXT NOT NULL,
  contributing_factors JSONB,
  model_version TEXT DEFAULT 'v1.0',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risk_events table
CREATE TABLE IF NOT EXISTS public.risk_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  vital_id UUID REFERENCES public.vitals(id),
  prediction_id UUID REFERENCES public.predictions(id),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 2: STAFF & AUTHENTICATION
-- =====================================================

-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse')),
  contact TEXT,
  department TEXT,
  specialization TEXT,
  on_duty BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 3: ASSIGNMENTS
-- =====================================================

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 4: MEDICINES & PRESCRIPTIONS
-- =====================================================

-- Create medicines table
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  default_dosage TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT 'oral',
  interactions JSONB DEFAULT '[]'::jsonb,
  contraindications TEXT[],
  side_effects TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  from_voice BOOLEAN NOT NULL DEFAULT false,
  voice_transcript TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'administered', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  administered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- PART 5: IOT DEVICES
-- =====================================================

-- Create IoT devices table
CREATE TABLE IF NOT EXISTS public.iot_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('ecg', 'spo2', 'bp', 'temperature', 'wearable', 'multi')),
  manufacturer TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
  battery_level INTEGER,
  firmware_version TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add device_id reference to vitals
ALTER TABLE public.vitals 
ADD CONSTRAINT fk_vitals_device FOREIGN KEY (device_id) REFERENCES public.iot_devices(id) ON DELETE SET NULL;

-- =====================================================
-- PART 6: FORECASTS
-- =====================================================

-- Create forecasts table
CREATE TABLE IF NOT EXISTS public.forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  forecast_json JSONB NOT NULL,
  horizon_minutes INTEGER NOT NULL DEFAULT 30,
  model_version TEXT,
  confidence NUMERIC(4,3),
  risk_projection TEXT CHECK (risk_projection IN ('stable', 'improving', 'declining', 'critical')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 7: NOTIFICATIONS
-- =====================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('alert', 'prescription', 'chat', 'assignment', 'device', 'system', 'escalation')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read_status BOOLEAN NOT NULL DEFAULT false,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  escalated BOOLEAN NOT NULL DEFAULT false,
  escalated_to UUID REFERENCES public.staff(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 8: CHAT MESSAGES
-- =====================================================

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'vitals_snapshot', 'prescription_ref')),
  attachment_url TEXT,
  reference_id UUID,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 9: REPORTS & AUDIT LOGS
-- =====================================================

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'discharge', 'emergency', 'custom')),
  file_path TEXT,
  file_url TEXT,
  content JSONB,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 10: ROW LEVEL SECURITY
-- =====================================================

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for demo - use proper auth in production)
CREATE POLICY "Allow all on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vitals" ON public.vitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on predictions" ON public.predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on risk_events" ON public.risk_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on medicines" ON public.medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prescriptions" ON public.prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on iot_devices" ON public.iot_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on forecasts" ON public.forecasts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PART 11: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON public.vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_timestamp ON public.vitals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_patient_id ON public.predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON public.predictions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_patient_id ON public.risk_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_timestamp ON public.risk_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_on_duty ON public.staff(on_duty);
CREATE INDEX IF NOT EXISTS idx_assignments_patient ON public.assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assignments_doctor ON public.assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_nurse ON public.assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_iot_devices_patient ON public.iot_devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_iot_devices_status ON public.iot_devices(status);
CREATE INDEX IF NOT EXISTS idx_forecasts_patient ON public.forecasts(patient_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_timestamp ON public.forecasts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_staff ON public.notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_patient ON public.chat_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_patient ON public.reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff ON public.audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- =====================================================
-- PART 12: TRIGGERS
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_iot_devices_updated_at ON public.iot_devices;
CREATE TRIGGER update_iot_devices_updated_at
  BEFORE UPDATE ON public.iot_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 13: ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_devices;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
