-- Seed data for hospital platform

-- Insert staff members
INSERT INTO public.staff (id, name, email, password_hash, role, contact, department, specialization, on_duty) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Johnson', 'sarah.johnson@hospital.com', '$2b$10$demo', 'doctor', '+1-555-0101', 'Cardiology', 'Interventional Cardiology', true),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Michael Chen', 'michael.chen@hospital.com', '$2b$10$demo', 'doctor', '+1-555-0102', 'Internal Medicine', 'Critical Care', true),
  ('33333333-3333-3333-3333-333333333333', 'Dr. Emily Williams', 'emily.williams@hospital.com', '$2b$10$demo', 'doctor', '+1-555-0103', 'Pulmonology', 'Respiratory Care', false),
  ('44444444-4444-4444-4444-444444444444', 'Nurse Rachel Adams', 'rachel.adams@hospital.com', '$2b$10$demo', 'nurse', '+1-555-0201', 'ICU', NULL, true),
  ('55555555-5555-5555-5555-555555555555', 'Nurse James Wilson', 'james.wilson@hospital.com', '$2b$10$demo', 'nurse', '+1-555-0202', 'ICU', NULL, true),
  ('66666666-6666-6666-6666-666666666666', 'Nurse Maria Garcia', 'maria.garcia@hospital.com', '$2b$10$demo', 'nurse', '+1-555-0203', 'General Ward', NULL, false),
  ('77777777-7777-7777-7777-777777777777', 'Admin John Smith', 'admin@hospital.com', '$2b$10$demo', 'admin', '+1-555-0001', 'Administration', NULL, true)
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
