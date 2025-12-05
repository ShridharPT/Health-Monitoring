-- Fix prescriptions to have correct nurse_id based on assignments

-- First, check current state
SELECT 'Current Prescriptions' as info;
SELECT pr.id, pr.status, pr.nurse_id, p.name as patient_name, d.name as doctor_name, n.name as nurse_name
FROM prescriptions pr
JOIN patients p ON pr.patient_id = p.id
JOIN staff d ON pr.doctor_id = d.id
LEFT JOIN staff n ON pr.nurse_id = n.id
ORDER BY pr.created_at DESC
LIMIT 10;

SELECT 'Current Assignments' as info;
SELECT a.id, a.status, p.name as patient_name, d.name as doctor_name, n.name as nurse_name, a.nurse_id
FROM assignments a
JOIN patients p ON a.patient_id = p.id
JOIN staff d ON a.doctor_id = d.id
LEFT JOIN staff n ON a.nurse_id = n.id
WHERE a.status = 'active';

-- Update prescriptions to set nurse_id from active assignments
UPDATE prescriptions pr
SET nurse_id = (
  SELECT a.nurse_id 
  FROM assignments a 
  WHERE a.patient_id = pr.patient_id 
  AND a.status = 'active' 
  LIMIT 1
)
WHERE pr.nurse_id IS NULL
AND EXISTS (
  SELECT 1 FROM assignments a 
  WHERE a.patient_id = pr.patient_id 
  AND a.status = 'active'
  AND a.nurse_id IS NOT NULL
);

-- Verify the fix
SELECT 'After Fix - Prescriptions' as info;
SELECT pr.id, pr.status, pr.nurse_id, p.name as patient_name, d.name as doctor_name, n.name as nurse_name
FROM prescriptions pr
JOIN patients p ON pr.patient_id = p.id
JOIN staff d ON pr.doctor_id = d.id
LEFT JOIN staff n ON pr.nurse_id = n.id
ORDER BY pr.created_at DESC
LIMIT 10;
