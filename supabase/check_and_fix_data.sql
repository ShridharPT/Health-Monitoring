-- Check and fix data for VitalGuard AI
-- Run this in Supabase SQL Editor

-- 1. Check current staff
SELECT 'STAFF TABLE' as section;
SELECT id, name, email, role FROM staff ORDER BY role, name;

-- 2. Check current patients
SELECT 'PATIENTS TABLE' as section;
SELECT id, name, room_no, status FROM patients ORDER BY name;

-- 3. Check current assignments
SELECT 'ASSIGNMENTS TABLE' as section;
SELECT 
  a.id,
  a.status,
  p.name as patient_name,
  d.name as doctor_name,
  d.email as doctor_email,
  n.name as nurse_name,
  n.email as nurse_email
FROM assignments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN staff d ON a.doctor_id = d.id
LEFT JOIN staff n ON a.nurse_id = n.id;

-- 4. Check prescriptions
SELECT 'PRESCRIPTIONS TABLE' as section;
SELECT 
  pr.id,
  pr.status,
  pr.priority,
  p.name as patient_name,
  d.name as doctor_name,
  n.name as nurse_name,
  pr.created_at
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.id
LEFT JOIN staff d ON pr.doctor_id = d.id
LEFT JOIN staff n ON pr.nurse_id = n.id
ORDER BY pr.created_at DESC;

-- 5. Fix: Ensure default staff exist with correct IDs
INSERT INTO staff (id, name, email, password_hash, role, contact, department, on_duty)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@hospital.com', 'hash_g10hvh', 'admin', '+1-555-0001', 'Administration', true),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Sarah Johnson', 'doctor@hospital.com', 'hash_f60d6b', 'doctor', '+1-555-0101', 'Cardiology', true),
  ('00000000-0000-0000-0000-000000000003', 'Nurse Rachel Adams', 'nurse@hospital.com', 'hash_sklp1n', 'nurse', '+1-555-0201', 'ICU', true)
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  password_hash = EXCLUDED.password_hash;

-- 6. Fix: Ensure default patients exist
INSERT INTO patients (id, name, age, gender, blood_type, room_no, bed_no, status, admission_date, diagnosis, emergency_contact)
VALUES 
  ('00000000-0000-0000-0001-000000000001', 'John Smith', 65, 'male', 'A+', '101', 'A', 'monitoring', NOW(), 'Hypertension', '+1-555-1001'),
  ('00000000-0000-0000-0001-000000000002', 'Mary Johnson', 72, 'female', 'O-', '102', 'A', 'critical', NOW(), 'Cardiac', '+1-555-1002'),
  ('00000000-0000-0000-0001-000000000003', 'Robert Davis', 58, 'male', 'B+', '103', 'A', 'stable', NOW(), 'Post-op', '+1-555-1003'),
  ('00000000-0000-0000-0001-000000000004', 'Emily Wilson', 45, 'female', 'AB+', '104', 'A', 'monitoring', NOW(), 'Pneumonia', '+1-555-1004')
ON CONFLICT (id) DO NOTHING;

-- 7. Fix: Ensure assignments exist
INSERT INTO assignments (patient_id, doctor_id, nurse_id, status, notes)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Primary care'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Critical care'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Post-op care'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'active', 'Respiratory care')
ON CONFLICT DO NOTHING;

-- 8. Verify after fix
SELECT 'VERIFICATION AFTER FIX' as section;
SELECT 'Staff count:', COUNT(*) FROM staff;
SELECT 'Patients count:', COUNT(*) FROM patients;
SELECT 'Assignments count:', COUNT(*) FROM assignments;
SELECT 'Prescriptions count:', COUNT(*) FROM prescriptions;
