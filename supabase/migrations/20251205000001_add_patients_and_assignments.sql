-- Add patients and assignments if they don't exist

-- Insert patients
INSERT INTO public.patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, allergies, emergency_contact, insurance_id) VALUES
  ('00000000-0000-0000-0001-000000000001', 'John Smith', 65, 'male', 'A+', '101', 'A', 'monitoring', NOW(), 'Hypertension, Type 2 Diabetes', ARRAY['Penicillin'], '+1-555-1001', 'INS-001'),
  ('00000000-0000-0000-0001-000000000002', 'Mary Johnson', 72, 'female', 'O-', '102', 'A', 'critical', NOW(), 'Acute Myocardial Infarction', ARRAY[]::TEXT[], '+1-555-1002', 'INS-002'),
  ('00000000-0000-0000-0001-000000000003', 'Robert Davis', 58, 'male', 'B+', '103', 'A', 'stable', NOW(), 'Post-operative recovery - Knee replacement', ARRAY['Sulfa drugs'], '+1-555-1003', 'INS-003'),
  ('00000000-0000-0000-0001-000000000004', 'Emily Wilson', 45, 'female', 'AB+', '104', 'A', 'monitoring', NOW(), 'Pneumonia', ARRAY['Aspirin'], '+1-555-1004', 'INS-004')
ON CONFLICT (id) DO NOTHING;

-- Insert assignments linking doctor@hospital.com and nurse@hospital.com to patients
INSERT INTO public.assignments (patient_id, doctor_id, nurse_id, status, notes) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Primary care assignment'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Critical patient - close monitoring'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Post-op care'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Respiratory monitoring')
ON CONFLICT DO NOTHING;

-- Insert sample vitals
INSERT INTO public.vitals (patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000001', 75, 98, 15, 132, 82, 36.7, NOW()),
  ('00000000-0000-0000-0001-000000000002', 98, 93, 20, 100, 65, 37.8, NOW()),
  ('00000000-0000-0000-0001-000000000003', 72, 99, 14, 120, 78, 36.5, NOW()),
  ('00000000-0000-0000-0001-000000000004', 80, 96, 18, 120, 76, 37.1, NOW());
