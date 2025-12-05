-- Fix password hashes to match the frontend hash function
-- Passwords: admin123, doctor123, nurse123

-- Update existing staff password hashes
UPDATE public.staff SET password_hash = 'hash_g10hvh' WHERE email = 'admin@hospital.com';
UPDATE public.staff SET password_hash = 'hash_f60d6b' WHERE email = 'doctor@hospital.com';
UPDATE public.staff SET password_hash = 'hash_sklp1n' WHERE email = 'nurse@hospital.com';

-- Also update any staff with the old demo hash to use doctor123 password
UPDATE public.staff SET password_hash = 'hash_f60d6b' WHERE password_hash = '$2b$10$demo' AND role = 'doctor';
UPDATE public.staff SET password_hash = 'hash_sklp1n' WHERE password_hash = '$2b$10$demo' AND role = 'nurse';
UPDATE public.staff SET password_hash = 'hash_g10hvh' WHERE password_hash = '$2b$10$demo' AND role = 'admin';
