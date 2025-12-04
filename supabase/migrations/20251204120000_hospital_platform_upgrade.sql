-- Hospital Platform Upgrade Migration
-- Adds staff, assignments, prescriptions, medicines, IoT devices, chat, notifications, forecasts, reports

-- Add new columns to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS contact TEXT;

-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'patient')),
  contact TEXT,
  department TEXT,
  specialization TEXT,
  on_duty BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Add device_id and ecg_waveform_ref to vitals
ALTER TABLE public.vitals 
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES public.iot_devices(id),
ADD COLUMN IF NOT EXISTS ecg_waveform_ref TEXT;

-- Add model_version to predictions
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'v1.0';


-- Enable Row Level Security on new tables
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

-- Create public access policies (for demo - in production use proper auth)
CREATE POLICY "Allow public access on staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on medicines" ON public.medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on prescriptions" ON public.prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on iot_devices" ON public.iot_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on forecasts" ON public.forecasts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
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

-- Create triggers for updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_iot_devices_updated_at BEFORE UPDATE ON public.iot_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_devices;
