-- =====================================================
-- VITALGUARD AI - SEED DATA
-- Run this after complete_setup.sql to populate initial data
-- =====================================================

-- =====================================================
-- STAFF ACCOUNTS (same as localStorage defaults)
-- Passwords: admin123, doctor123, nurse123
-- =====================================================

INSERT INTO public.staff (id, name, email, password_hash, role, contact, department, specialization, on_duty) VALUES
  ('00000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@hospital.com', 'hash_g10hvh', 'admin', '+1-555-0001', 'Administration', NULL, true),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Sarah Johnson', 'doctor@hospital.com', 'hash_f60d6b', 'doctor', '+1-555-0101', 'Cardiology', 'Interventional Cardiology', true),
  ('00000000-0000-0000-0000-000000000003', 'Nurse Rachel Adams', 'nurse@hospital.com', 'hash_sklp1n', 'nurse', '+1-555-0201', 'ICU', NULL, true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SAMPLE PATIENTS
-- =====================================================

INSERT INTO public.patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, allergies, emergency_contact, insurance_id) VALUES
  ('00000000-0000-0000-0001-000000000001', 'John Smith', 65, 'male', 'A+', '101', 'A', 'monitoring', NOW(), 'Hypertension, Type 2 Diabetes', ARRAY['Penicillin'], '+1-555-1001', 'INS-001'),
  ('00000000-0000-0000-0001-000000000002', 'Mary Johnson', 72, 'female', 'O-', '102', 'A', 'critical', NOW(), 'Acute Myocardial Infarction', ARRAY[]::TEXT[], '+1-555-1002', 'INS-002'),
  ('00000000-0000-0000-0001-000000000003', 'Robert Davis', 58, 'male', 'B+', '103', 'A', 'stable', NOW(), 'Post-operative recovery - Knee replacement', ARRAY['Sulfa drugs'], '+1-555-1003', 'INS-003'),
  ('00000000-0000-0000-0001-000000000004', 'Emily Wilson', 45, 'female', 'AB+', '104', 'A', 'monitoring', NOW(), 'Pneumonia', ARRAY['Aspirin'], '+1-555-1004', 'INS-004')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MEDICINES CATALOG
-- =====================================================

INSERT INTO public.medicines (name, generic_name, default_dosage, unit, category, route, interactions, contraindications, side_effects) VALUES
  ('Aspirin', 'Acetylsalicylic acid', '325', 'mg', 'Analgesic', 'oral', '["warfarin", "ibuprofen"]'::jsonb, ARRAY['bleeding disorders', 'aspirin allergy'], ARRAY['stomach upset', 'bleeding']),
  ('Metoprolol', 'Metoprolol tartrate', '50', 'mg', 'Beta Blocker', 'oral', '["verapamil", "diltiazem"]'::jsonb, ARRAY['severe bradycardia', 'heart block'], ARRAY['fatigue', 'dizziness', 'bradycardia']),
  ('Lisinopril', 'Lisinopril', '10', 'mg', 'ACE Inhibitor', 'oral', '["potassium supplements", "spironolactone"]'::jsonb, ARRAY['angioedema history', 'pregnancy'], ARRAY['dry cough', 'dizziness', 'hyperkalemia']),
  ('Furosemide', 'Furosemide', '40', 'mg', 'Diuretic', 'oral', '["aminoglycosides", "lithium"]'::jsonb, ARRAY['anuria', 'severe electrolyte depletion'], ARRAY['dehydration', 'electrolyte imbalance']),
  ('Morphine', 'Morphine sulfate', '2', 'mg', 'Opioid Analgesic', 'iv', '["benzodiazepines", "MAOIs"]'::jsonb, ARRAY['respiratory depression', 'paralytic ileus'], ARRAY['respiratory depression', 'sedation', 'nausea']),
  ('Norepinephrine', 'Norepinephrine bitartrate', '4', 'mcg/min', 'Vasopressor', 'iv', '["MAOIs", "tricyclic antidepressants"]'::jsonb, ARRAY['hypovolemia uncorrected'], ARRAY['hypertension', 'arrhythmias']),
  ('Ceftriaxone', 'Ceftriaxone sodium', '1', 'g', 'Antibiotic', 'iv', '["calcium-containing solutions"]'::jsonb, ARRAY['cephalosporin allergy'], ARRAY['diarrhea', 'rash']),
  ('Omeprazole', 'Omeprazole', '20', 'mg', 'Proton Pump Inhibitor', 'oral', '["clopidogrel", "methotrexate"]'::jsonb, ARRAY['hypersensitivity'], ARRAY['headache', 'nausea', 'diarrhea'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE ASSIGNMENTS (Doctor & Nurse to Patients)
-- =====================================================

INSERT INTO public.assignments (patient_id, doctor_id, nurse_id, status, notes) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Primary care assignment'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Critical patient - close monitoring'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Post-op care'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Respiratory monitoring')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE IOT DEVICES
-- =====================================================

INSERT INTO public.iot_devices (device_id, patient_id, device_type, manufacturer, model, status, battery_level, firmware_version) VALUES
  ('DEV-ECG-001', '00000000-0000-0000-0001-000000000001', 'ecg', 'Philips', 'IntelliVue MX800', 'online', 95, 'v2.1.0'),
  ('DEV-SPO2-001', '00000000-0000-0000-0001-000000000001', 'spo2', 'Masimo', 'Radical-7', 'online', 88, 'v1.5.2'),
  ('DEV-BP-001', '00000000-0000-0000-0001-000000000002', 'bp', 'Omron', 'HEM-7600T', 'online', 72, 'v3.0.1'),
  ('DEV-MULTI-001', '00000000-0000-0000-0001-000000000002', 'multi', 'GE Healthcare', 'CARESCAPE B650', 'online', 100, 'v4.2.0'),
  ('DEV-TEMP-001', '00000000-0000-0000-0001-000000000003', 'temperature', 'Braun', 'ThermoScan 7', 'online', 65, 'v1.2.0'),
  ('DEV-WEAR-001', '00000000-0000-0000-0001-000000000004', 'wearable', 'Apple', 'Watch Series 9', 'online', 45, 'v10.1')
ON CONFLICT (device_id) DO NOTHING;

-- =====================================================
-- SAMPLE VITALS DATA
-- =====================================================

-- Patient 1 - John Smith (monitoring)
INSERT INTO public.vitals (patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000001', 78, 97, 16, 135, 85, 36.8, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000001', 82, 96, 18, 140, 88, 36.9, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000001', 75, 98, 15, 132, 82, 36.7, NOW());

-- Patient 2 - Mary Johnson (critical)
INSERT INTO public.vitals (patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000002', 110, 91, 24, 90, 60, 38.2, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000002', 105, 92, 22, 95, 62, 38.0, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000002', 98, 93, 20, 100, 65, 37.8, NOW());

-- Patient 3 - Robert Davis (stable)
INSERT INTO public.vitals (patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000003', 72, 99, 14, 120, 78, 36.5, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000003', 70, 99, 14, 118, 76, 36.6, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000003', 68, 99, 13, 115, 75, 36.5, NOW());

-- Patient 4 - Emily Wilson (monitoring)
INSERT INTO public.vitals (patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000004', 88, 94, 20, 125, 80, 37.5, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000004', 85, 95, 19, 122, 78, 37.3, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000004', 80, 96, 18, 120, 76, 37.1, NOW());

-- =====================================================
-- SAMPLE PREDICTIONS
-- =====================================================

INSERT INTO public.predictions (patient_id, risk_level, probability, explanation, contributing_factors, model_version) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Moderate Risk', 0.35, 'Elevated blood pressure detected. Close monitoring advised.', '[{"vital": "systolic_bp", "value": 135, "status": "warning", "message": "Systolic BP is elevated at 135"}]'::jsonb, 'v1.0-rule-based'),
  ('00000000-0000-0000-0001-000000000002', 'High Risk', 0.75, 'Critical concerns: SpO₂ is critically low at 93; Heart Rate is elevated at 98. Immediate medical attention recommended.', '[{"vital": "spo2", "value": 93, "status": "warning", "message": "SpO₂ is low at 93"}, {"vital": "heart_rate", "value": 98, "status": "warning", "message": "Heart Rate is elevated at 98"}]'::jsonb, 'v1.0-rule-based'),
  ('00000000-0000-0000-0001-000000000003', 'Low Risk', 0.10, 'All vital signs are within normal ranges. Patient condition appears stable.', '[]'::jsonb, 'v1.0-rule-based'),
  ('00000000-0000-0000-0001-000000000004', 'Moderate Risk', 0.40, 'Monitoring needed: Temperature is slightly elevated. Close monitoring advised.', '[{"vital": "temperature", "value": 37.1, "status": "warning", "message": "Temperature is slightly elevated at 37.1"}]'::jsonb, 'v1.0-rule-based');

-- =====================================================
-- SAMPLE RISK EVENTS / ALERTS
-- =====================================================

INSERT INTO public.risk_events (patient_id, event_type, severity, message, acknowledged, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000002', 'risk_prediction', 'critical', 'High Risk Alert: SpO₂ dropped to 91%. Immediate attention required.', false, NOW() - INTERVAL '30 minutes'),
  ('00000000-0000-0000-0001-000000000002', 'vital_threshold', 'warning', 'Heart rate elevated to 110 bpm', true, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000001', 'vital_threshold', 'warning', 'Blood pressure elevated: 140/88 mmHg', false, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000004', 'vital_threshold', 'info', 'Temperature trending down from 37.5°C to 37.1°C', true, NOW() - INTERVAL '45 minutes');

-- =====================================================
-- SEED DATA COMPLETE!
-- =====================================================
