-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  room_no TEXT NOT NULL,
  admission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'stable' CHECK (status IN ('stable', 'monitoring', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vitals table
CREATE TABLE public.vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  heart_rate INTEGER NOT NULL,
  spo2 NUMERIC(5,2) NOT NULL,
  resp_rate INTEGER NOT NULL,
  systolic_bp INTEGER NOT NULL,
  diastolic_bp INTEGER NOT NULL,
  temperature NUMERIC(4,1) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low Risk', 'Moderate Risk', 'High Risk')),
  probability NUMERIC(4,3) NOT NULL,
  explanation TEXT NOT NULL,
  contributing_factors JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risk_events table for alert logging
CREATE TABLE public.risk_events (
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

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for demo purposes - no auth required)
CREATE POLICY "Allow public read access on patients" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert on patients" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on patients" ON public.patients FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on vitals" ON public.vitals FOR SELECT USING (true);
CREATE POLICY "Allow public insert on vitals" ON public.vitals FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on predictions" ON public.predictions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on risk_events" ON public.risk_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on risk_events" ON public.risk_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on risk_events" ON public.risk_events FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_vitals_patient_id ON public.vitals(patient_id);
CREATE INDEX idx_vitals_timestamp ON public.vitals(timestamp DESC);
CREATE INDEX idx_predictions_patient_id ON public.predictions(patient_id);
CREATE INDEX idx_predictions_timestamp ON public.predictions(timestamp DESC);
CREATE INDEX idx_risk_events_patient_id ON public.risk_events(patient_id);
CREATE INDEX idx_risk_events_timestamp ON public.risk_events(timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for patients table
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for vitals and predictions
ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_events;