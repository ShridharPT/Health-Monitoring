-- Seed data for hospital platform

-- Insert staff members
-- Default accounts: admin@hospital.com/admin123, doctor@hospital.com/doctor123, nurse@hospital.com/nurse123
INSERT INTO public.staff (id, name, email, password_hash, role, contact, department, specialization, on_duty) VALUES
  ('00000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@hospital.com', 'hash_g10hvh', 'admin', '+1-555-0001', 'Administration', NULL, true),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Sarah Johnson', 'doctor@hospital.com', 'hash_f60d6b', 'doctor', '+1-555-0101', 'Cardiology', 'Interventional Cardiology', true),
  ('00000000-0000-0000-0000-000000000003', 'Nurse Rachel Adams', 'nurse@hospital.com', 'hash_sklp1n', 'nurse', '+1-555-0201', 'ICU', NULL, true),
  ('11111111-1111-1111-1111-111111111111', 'Dr. Michael Chen', 'michael.chen@hospital.com', 'hash_f60d6b', 'doctor', '+1-555-0102', 'Internal Medicine', 'Critical Care', true),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Emily Williams', 'emily.williams@hospital.com', 'hash_f60d6b', 'doctor', '+1-555-0103', 'Pulmonology', 'Respiratory Care', false),
  ('33333333-3333-3333-3333-333333333333', 'Nurse James Wilson', 'james.wilson@hospital.com', 'hash_sklp1n', 'nurse', '+1-555-0202', 'ICU', NULL, true),
  ('44444444-4444-4444-4444-444444444444', 'Nurse Maria Garcia', 'maria.garcia@hospital.com', 'hash_sklp1n', 'nurse', '+1-555-0203', 'General Ward', NULL, false)
ON CONFLICT (email) DO NOTHING;

-- Insert medicines
INSERT INTO public.medicines (name, generic_name, default_dosage, unit, category, route, interactions, contraindications, side_effects) VALUES
  ('Aspirin', 'Acetylsalicylic acid', '325', 'mg', 'Analgesic', 'oral', '["warfarin", "ibuprofen"]', ARRAY['bleeding disorders', 'aspirin allergy'], ARRAY['stomach upset', 'bleeding']),
  ('Metoprolol', 'Metoprolol tartrate', '50', 'mg', 'Beta Blocker', 'oral', '["verapamil", "diltiazem"]', ARRAY['severe bradycardia', 'heart block'], ARRAY['fatigue', 'dizziness', 'bradycardia']),
  ('Lisinopril', 'Lisinopril', '10', 'mg', 'ACE Inhibitor', 'oral', '["potassium supplements", "spironolactone"]', ARRAY['angioedema history', 'pregnancy'], ARRAY['dry cough', 'dizziness', 'hyperkalemia']),
  ('Furosemide', 'Furosemide', '40', 'mg', 'Diuretic', 'oral', '["aminoglycosides", "lithium"]', ARRAY['anuria', 'severe electrolyte depletion'], ARRAY['dehydration', 'electrolyte imbalance']),
  ('Amiodarone', 'Amiodarone HCl', '200', 'mg', 'Antiarrhythmic', 'oral', '["warfarin", "digoxin", "simvastatin"]', ARRAY['thyroid dysfunction', 'pulmonary fibrosis'], ARRAY['thyroid issues', 'pulmonary toxicity', 'photosensitivity']),
  ('Heparin', 'Heparin sodium', '5000', 'units', 'Anticoagulant', 'iv', '["aspirin", "NSAIDs"]', ARRAY['active bleeding', 'HIT history'], ARRAY['bleeding', 'thrombocytopenia']),
  ('Morphine', 'Morphine sulfate', '2', 'mg', 'Opioid Analgesic', 'iv', '["benzodiazepines", "MAOIs"]', ARRAY['respiratory depression', 'paralytic ileus'], ARRAY['respiratory depression', 'sedation', 'nausea']),
  ('Norepinephrine', 'Norepinephrine bitartrate', '4', 'mcg/min', 'Vasopressor', 'iv', '["MAOIs", "tricyclic antidepressants"]', ARRAY['hypovolemia uncorrected'], ARRAY['hypertension', 'arrhythmias', 'tissue necrosis']),
  ('Insulin Regular', 'Insulin human', '10', 'units', 'Antidiabetic', 'sc', '["beta blockers", "ACE inhibitors"]', ARRAY['hypoglycemia'], ARRAY['hypoglycemia', 'injection site reactions']),
  ('Pantoprazole', 'Pantoprazole sodium', '40', 'mg', 'PPI', 'iv', '["clopidogrel", "methotrexate"]', ARRAY['hypersensitivity'], ARRAY['headache', 'diarrhea', 'nausea']),
  ('Ceftriaxone', 'Ceftriaxone sodium', '1', 'g', 'Antibiotic', 'iv', '["calcium-containing solutions"]', ARRAY['cephalosporin allergy'], ARRAY['diarrhea', 'rash', 'injection site pain']),
  ('Vancomycin', 'Vancomycin HCl', '1', 'g', 'Antibiotic', 'iv', '["aminoglycosides", "loop diuretics"]', ARRAY['vancomycin allergy'], ARRAY['red man syndrome', 'nephrotoxicity', 'ototoxicity'])
ON CONFLICT DO NOTHING;

-- Insert patients
INSERT INTO public.patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, allergies, emergency_contact, insurance_id) VALUES
  ('00000000-0000-0000-0001-000000000001', 'John Smith', 65, 'male', 'A+', '101', 'A', 'monitoring', NOW(), 'Hypertension, Type 2 Diabetes', ARRAY['Penicillin'], '+1-555-1001', 'INS-001'),
  ('00000000-0000-0000-0001-000000000002', 'Mary Johnson', 72, 'female', 'O-', '102', 'A', 'critical', NOW(), 'Acute Myocardial Infarction', ARRAY[]::TEXT[], '+1-555-1002', 'INS-002'),
  ('00000000-0000-0000-0001-000000000003', 'Robert Davis', 58, 'male', 'B+', '103', 'A', 'stable', NOW(), 'Post-operative recovery - Knee replacement', ARRAY['Sulfa drugs'], '+1-555-1003', 'INS-003'),
  ('00000000-0000-0000-0001-000000000004', 'Emily Wilson', 45, 'female', 'AB+', '104', 'A', 'monitoring', NOW(), 'Pneumonia', ARRAY['Aspirin'], '+1-555-1004', 'INS-004')
ON CONFLICT (id) DO NOTHING;

-- Insert assignments (Doctor & Nurse to Patients)
INSERT INTO public.assignments (patient_id, doctor_id, nurse_id, status, notes) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Primary care assignment'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Critical patient - close monitoring'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Post-op care'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Respiratory monitoring')
ON CONFLICT DO NOTHING;

-- Insert IoT devices
INSERT INTO public.iot_devices (device_id, device_type, manufacturer, model, status, battery_level, firmware_version) VALUES
  ('ECG-001', 'ecg', 'Philips', 'IntelliVue MX800', 'online', 100, '2.1.0'),
  ('ECG-002', 'ecg', 'Philips', 'IntelliVue MX800', 'online', 95, '2.1.0'),
  ('SPO2-001', 'spo2', 'Masimo', 'Radical-7', 'online', 88, '1.5.2'),
  ('SPO2-002', 'spo2', 'Masimo', 'Radical-7', 'offline', 45, '1.5.2'),
  ('BP-001', 'bp', 'Omron', 'HEM-907XL', 'online', 72, '3.0.1'),
  ('TEMP-001', 'temperature', 'Welch Allyn', 'SureTemp Plus', 'online', 100, '1.2.0'),
  ('MULTI-001', 'multi', 'GE Healthcare', 'CARESCAPE B650', 'online', 100, '4.2.1'),
  ('MULTI-002', 'multi', 'GE Healthcare', 'CARESCAPE B650', 'maintenance', 100, '4.2.0'),
  ('WEAR-001', 'wearable', 'Apple', 'Watch Series 9', 'online', 65, '10.1'),
  ('WEAR-002', 'wearable', 'Fitbit', 'Sense 2', 'online', 82, '5.2.0')
ON CONFLICT (device_id) DO NOTHING;

-- Insert sample vitals
INSERT INTO public.vitals (patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, timestamp) VALUES
  ('00000000-0000-0000-0001-000000000001', 78, 97, 16, 135, 85, 36.8, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000001', 82, 96, 18, 140, 88, 36.9, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000001', 75, 98, 15, 132, 82, 36.7, NOW()),
  ('00000000-0000-0000-0001-000000000002', 110, 91, 24, 90, 60, 38.2, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000002', 105, 92, 22, 95, 62, 38.0, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0001-000000000002', 98, 93, 20, 100, 65, 37.8, NOW()),
  ('00000000-0000-0000-0001-000000000003', 72, 99, 14, 120, 78, 36.5, NOW()),
  ('00000000-0000-0000-0001-000000000004', 80, 96, 18, 120, 76, 37.1, NOW());
