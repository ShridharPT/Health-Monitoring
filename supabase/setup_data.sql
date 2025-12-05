-- VitalGuard AI - Setup Data
-- Run each section separately if needed

-- SECTION 1: Check existing data
SELECT id, email, role FROM staff;
SELECT id, name FROM patients;
SELECT * FROM assignments WHERE status = 'active';

-- SECTION 2: Insert staff (skip if already exists)
INSERT INTO staff (id, name, email, password_hash, role, contact, department, on_duty)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@hospital.com', 'hash_g10hvh', 'admin', '+1-555-0001', 'Administration', true)
ON CONFLICT (email) DO UPDATE SET password_hash = 'hash_g10hvh';

INSERT INTO staff (id, name, email, password_hash, role, contact, department, specialization, on_duty)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Dr. Sarah Johnson', 'doctor@hospital.com', 'hash_f60d6b', 'doctor', '+1-555-0101', 'Cardiology', 'Interventional Cardiology', true)
ON CONFLICT (email) DO UPDATE SET password_hash = 'hash_f60d6b';

INSERT INTO staff (id, name, email, password_hash, role, contact, department, on_duty)
VALUES 
  ('00000000-0000-0000-0000-000000000003', 'Nurse Rachel Adams', 'nurse@hospital.com', 'hash_sklp1n', 'nurse', '+1-555-0201', 'ICU', true)
ON CONFLICT (email) DO UPDATE SET password_hash = 'hash_sklp1n';

-- SECTION 3: Insert patients
INSERT INTO patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, emergency_contact)
VALUES 
  ('00000000-0000-0000-0001-000000000001', 'John Smith', 65, 'male', 'A+', '101', 'A', 'monitoring', NOW(), 'Hypertension', '+1-555-1001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, emergency_contact)
VALUES 
  ('00000000-0000-0000-0001-000000000002', 'Mary Johnson', 72, 'female', 'O-', '102', 'A', 'critical', NOW(), 'Cardiac', '+1-555-1002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, emergency_contact)
VALUES 
  ('00000000-0000-0000-0001-000000000003', 'Robert Davis', 58, 'male', 'B+', '103', 'A', 'stable', NOW(), 'Post-op', '+1-555-1003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, emergency_contact)
VALUES 
  ('00000000-0000-0000-0001-000000000004', 'Emily Wilson', 45, 'female', 'AB+', '104', 'A', 'monitoring', NOW(), 'Pneumonia', '+1-555-1004')
ON CONFLICT (id) DO NOTHING;

-- SECTION 4: Insert assignments
INSERT INTO assignments (patient_id, doctor_id, nurse_id, status, notes)
SELECT '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Primary care'
WHERE NOT EXISTS (
  SELECT 1 FROM assignments WHERE patient_id = '00000000-0000-0000-0001-000000000001' AND status = 'active'
);

INSERT INTO assignments (patient_id, doctor_id, nurse_id, status, notes)
SELECT '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Critical care'
WHERE NOT EXISTS (
  SELECT 1 FROM assignments WHERE patient_id = '00000000-0000-0000-0001-000000000002' AND status = 'active'
);

INSERT INTO assignments (patient_id, doctor_id, nurse_id, status, notes)
SELECT '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Post-op care'
WHERE NOT EXISTS (
  SELECT 1 FROM assignments WHERE patient_id = '00000000-0000-0000-0001-000000000003' AND status = 'active'
);

INSERT INTO assignments (patient_id, doctor_id, nurse_id, status, notes)
SELECT '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Respiratory care'
WHERE NOT EXISTS (
  SELECT 1 FROM assignments WHERE patient_id = '00000000-0000-0000-0001-000000000004' AND status = 'active'
);

-- SECTION 5: Verify data
SELECT 'Staff:' as info, id, email, role FROM staff WHERE email IN ('admin@hospital.com', 'doctor@hospital.com', 'nurse@hospital.com');
SELECT 'Patients:' as info, id, name FROM patients;
SELECT 'Assignments:' as info, a.id, p.name as patient, s.name as doctor, n.name as nurse 
FROM assignments a 
JOIN patients p ON a.patient_id = p.id 
JOIN staff s ON a.doctor_id = s.id 
LEFT JOIN staff n ON a.nurse_id = n.id 
WHERE a.status = 'active';
