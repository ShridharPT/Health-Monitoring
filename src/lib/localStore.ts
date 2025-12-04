// Local storage-based data store for the hospital platform
// This replaces demo data with persistent local storage

import type { Patient, Vitals, RiskEvent } from '@/types/medical';
import type { Staff, Assignment, Medicine, Prescription, IoTDevice, Notification, ChatMessage } from '@/types/hospital';

const STORAGE_KEYS = {
  STAFF: 'hospital_staff',
  PATIENTS: 'hospital_patients',
  ASSIGNMENTS: 'hospital_assignments',
  MEDICINES: 'hospital_medicines',
  PRESCRIPTIONS: 'hospital_prescriptions',
  DEVICES: 'hospital_devices',
  VITALS: 'hospital_vitals',
  PREDICTIONS: 'hospital_predictions',
  RISK_EVENTS: 'hospital_risk_events',
  NOTIFICATIONS: 'hospital_notifications',
  CHAT_MESSAGES: 'hospital_chat_messages',
} as const;

// Generic storage helpers
function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Generate unique IDs
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ STAFF ============
export function getStaff(): Staff[] {
  return getFromStorage<Staff>(STORAGE_KEYS.STAFF);
}

export function getStaffById(id: string): Staff | undefined {
  return getStaff().find(s => s.id === id);
}

export function getDoctors(): Staff[] {
  return getStaff().filter(s => s.role === 'doctor');
}

export function getNurses(): Staff[] {
  return getStaff().filter(s => s.role === 'nurse');
}

// Simple password hashing (for demo purposes - use bcrypt in production)
export function hashPassword(password: string): string {
  // Simple hash for demo - in production use bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Authenticate staff by email and password
export function authenticateStaff(email: string, password: string): Staff | null {
  const staff = getStaff().find(s => s.email.toLowerCase() === email.toLowerCase());
  if (!staff) return null;
  
  // Check password
  if (staff.password_hash && !verifyPassword(password, staff.password_hash)) {
    return null;
  }
  
  return staff;
}

// Get staff by email
export function getStaffByEmail(email: string): Staff | undefined {
  return getStaff().find(s => s.email.toLowerCase() === email.toLowerCase());
}

export function createStaff(staff: Omit<Staff, 'id' | 'created_at' | 'updated_at'>): Staff {
  const allStaff = getStaff();
  const newStaff: Staff = {
    ...staff,
    id: generateId('staff-'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  allStaff.push(newStaff);
  saveToStorage(STORAGE_KEYS.STAFF, allStaff);
  return newStaff;
}

export function updateStaff(id: string, updates: Partial<Staff>): Staff | null {
  const allStaff = getStaff();
  const index = allStaff.findIndex(s => s.id === id);
  if (index === -1) return null;
  allStaff[index] = { ...allStaff[index], ...updates, updated_at: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.STAFF, allStaff);
  return allStaff[index];
}

export function deleteStaff(id: string): boolean {
  const allStaff = getStaff();
  const filtered = allStaff.filter(s => s.id !== id);
  if (filtered.length === allStaff.length) return false;
  saveToStorage(STORAGE_KEYS.STAFF, filtered);
  return true;
}

// ============ PATIENTS ============
export function getPatients(): Patient[] {
  return getFromStorage<Patient>(STORAGE_KEYS.PATIENTS);
}

export function getPatientById(id: string): Patient | undefined {
  return getPatients().find(p => p.id === id);
}

export function createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Patient {
  const allPatients = getPatients();
  const newPatient: Patient = {
    ...patient,
    id: generateId('patient-'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  allPatients.push(newPatient);
  saveToStorage(STORAGE_KEYS.PATIENTS, allPatients);
  return newPatient;
}

export function updatePatient(id: string, updates: Partial<Patient>): Patient | null {
  const allPatients = getPatients();
  const index = allPatients.findIndex(p => p.id === id);
  if (index === -1) return null;
  allPatients[index] = { ...allPatients[index], ...updates, updated_at: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.PATIENTS, allPatients);
  return allPatients[index];
}

export function deletePatient(id: string): boolean {
  const allPatients = getPatients();
  const filtered = allPatients.filter(p => p.id !== id);
  if (filtered.length === allPatients.length) return false;
  saveToStorage(STORAGE_KEYS.PATIENTS, filtered);
  return true;
}

// ============ ASSIGNMENTS ============
export function getAssignments(): Assignment[] {
  return getFromStorage<Assignment>(STORAGE_KEYS.ASSIGNMENTS);
}

export function getAssignmentsByFilter(filters: { patient_id?: string; doctor_id?: string; nurse_id?: string; status?: string }): Assignment[] {
  let assignments = getAssignments();
  if (filters.patient_id) assignments = assignments.filter(a => a.patient_id === filters.patient_id);
  if (filters.doctor_id) assignments = assignments.filter(a => a.doctor_id === filters.doctor_id);
  if (filters.nurse_id) assignments = assignments.filter(a => a.nurse_id === filters.nurse_id);
  if (filters.status) assignments = assignments.filter(a => a.status === filters.status);
  return assignments;
}

export function createAssignment(assignment: { patient_id: string; doctor_id: string; nurse_id?: string; notes?: string }): Assignment {
  const allAssignments = getAssignments();
  
  // Check if this exact assignment already exists (same patient, doctor, nurse)
  const existingAssignment = allAssignments.find(a => 
    a.patient_id === assignment.patient_id && 
    a.doctor_id === assignment.doctor_id && 
    a.nurse_id === assignment.nurse_id &&
    a.status === 'active'
  );
  
  if (existingAssignment) {
    // Return existing assignment instead of creating duplicate
    return existingAssignment;
  }
  
  const newAssignment: Assignment = {
    id: generateId('assign-'),
    patient_id: assignment.patient_id,
    doctor_id: assignment.doctor_id,
    nurse_id: assignment.nurse_id,
    notes: assignment.notes,
    start_time: new Date().toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
  };
  allAssignments.push(newAssignment);
  saveToStorage(STORAGE_KEYS.ASSIGNMENTS, allAssignments);
  return newAssignment;
}

export function updateAssignment(id: string, updates: Partial<Assignment>): Assignment | null {
  const allAssignments = getAssignments();
  const index = allAssignments.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  if (updates.status === 'completed') {
    updates.end_time = new Date().toISOString();
  }
  
  allAssignments[index] = { ...allAssignments[index], ...updates };
  saveToStorage(STORAGE_KEYS.ASSIGNMENTS, allAssignments);
  return allAssignments[index];
}


// ============ MEDICINES ============
export function getMedicines(): Medicine[] {
  return getFromStorage<Medicine>(STORAGE_KEYS.MEDICINES);
}

export function createMedicine(medicine: Omit<Medicine, 'id' | 'created_at'>): Medicine {
  const allMedicines = getMedicines();
  const newMedicine: Medicine = {
    ...medicine,
    id: generateId('med-'),
    created_at: new Date().toISOString(),
  };
  allMedicines.push(newMedicine);
  saveToStorage(STORAGE_KEYS.MEDICINES, allMedicines);
  return newMedicine;
}

// ============ PRESCRIPTIONS ============
export function getPrescriptions(): Prescription[] {
  return getFromStorage<Prescription>(STORAGE_KEYS.PRESCRIPTIONS);
}

export function createPrescription(prescription: Omit<Prescription, 'id' | 'created_at'>): Prescription {
  const allPrescriptions = getPrescriptions();
  const newPrescription: Prescription = {
    ...prescription,
    id: generateId('rx-'),
    created_at: new Date().toISOString(),
  };
  allPrescriptions.push(newPrescription);
  saveToStorage(STORAGE_KEYS.PRESCRIPTIONS, allPrescriptions);
  return newPrescription;
}

export function updatePrescription(id: string, updates: Partial<Prescription>): Prescription | null {
  const allPrescriptions = getPrescriptions();
  const index = allPrescriptions.findIndex(p => p.id === id);
  if (index === -1) return null;
  allPrescriptions[index] = { ...allPrescriptions[index], ...updates };
  saveToStorage(STORAGE_KEYS.PRESCRIPTIONS, allPrescriptions);
  return allPrescriptions[index];
}

export function deletePrescription(id: string): boolean {
  const allPrescriptions = getPrescriptions();
  const filtered = allPrescriptions.filter(p => p.id !== id);
  if (filtered.length === allPrescriptions.length) return false;
  saveToStorage(STORAGE_KEYS.PRESCRIPTIONS, filtered);
  return true;
}

// ============ DEVICES ============
export function getDevices(): IoTDevice[] {
  return getFromStorage<IoTDevice>(STORAGE_KEYS.DEVICES);
}

export function createDevice(device: Omit<IoTDevice, 'id' | 'created_at' | 'updated_at'>): IoTDevice {
  const allDevices = getDevices();
  const newDevice: IoTDevice = {
    ...device,
    id: generateId('dev-'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  allDevices.push(newDevice);
  saveToStorage(STORAGE_KEYS.DEVICES, allDevices);
  return newDevice;
}

export function updateDevice(id: string, updates: Partial<IoTDevice>): IoTDevice | null {
  const allDevices = getDevices();
  const index = allDevices.findIndex(d => d.id === id);
  if (index === -1) return null;
  allDevices[index] = { ...allDevices[index], ...updates, updated_at: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.DEVICES, allDevices);
  return allDevices[index];
}

export function deleteDevice(id: string): boolean {
  const allDevices = getDevices();
  const filtered = allDevices.filter(d => d.id !== id);
  if (filtered.length === allDevices.length) return false;
  saveToStorage(STORAGE_KEYS.DEVICES, filtered);
  return true;
}

// ============ VITALS ============
export function getVitals(patientId?: string): Vitals[] {
  const allVitals = getFromStorage<Vitals>(STORAGE_KEYS.VITALS);
  if (patientId) return allVitals.filter(v => v.patient_id === patientId);
  return allVitals;
}

export function addVitals(vitals: Omit<Vitals, 'id' | 'created_at'>): Vitals {
  const allVitals = getFromStorage<Vitals>(STORAGE_KEYS.VITALS);
  const newVitals: Vitals = {
    ...vitals,
    id: generateId('vitals-'),
    created_at: new Date().toISOString(),
  };
  allVitals.push(newVitals);
  saveToStorage(STORAGE_KEYS.VITALS, allVitals);
  return newVitals;
}

// ============ RISK EVENTS ============
export function getRiskEvents(): RiskEvent[] {
  return getFromStorage<RiskEvent>(STORAGE_KEYS.RISK_EVENTS);
}

export function createRiskEvent(event: Omit<RiskEvent, 'id'>): RiskEvent {
  const allEvents = getRiskEvents();
  const newEvent: RiskEvent = {
    ...event,
    id: generateId('event-'),
  };
  allEvents.push(newEvent);
  saveToStorage(STORAGE_KEYS.RISK_EVENTS, allEvents);
  return newEvent;
}

export function acknowledgeRiskEvent(id: string): RiskEvent | null {
  const allEvents = getRiskEvents();
  const index = allEvents.findIndex(e => e.id === id);
  if (index === -1) return null;
  allEvents[index] = { ...allEvents[index], acknowledged: true, acknowledged_at: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.RISK_EVENTS, allEvents);
  return allEvents[index];
}

// ============ NOTIFICATIONS ============
export function getNotifications(staffId?: string): Notification[] {
  const allNotifications = getFromStorage<Notification>(STORAGE_KEYS.NOTIFICATIONS);
  if (staffId) return allNotifications.filter(n => n.staff_id === staffId);
  return allNotifications;
}

export function createNotification(notification: Omit<Notification, 'id' | 'timestamp'>): Notification {
  const allNotifications = getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: generateId('notif-'),
    timestamp: new Date().toISOString(),
  };
  allNotifications.push(newNotification);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, allNotifications);
  return newNotification;
}

// ============ CHAT MESSAGES ============
export function getChatMessages(userId: string): ChatMessage[] {
  const allMessages = getFromStorage<ChatMessage>(STORAGE_KEYS.CHAT_MESSAGES);
  return allMessages.filter(m => m.sender_id === userId || m.receiver_id === userId);
}

export function createChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  const allMessages = getFromStorage<ChatMessage>(STORAGE_KEYS.CHAT_MESSAGES);
  const newMessage: ChatMessage = {
    ...message,
    id: generateId('chat-'),
    timestamp: new Date().toISOString(),
  };
  allMessages.push(newMessage);
  saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, allMessages);
  return newMessage;
}

export function markChatMessageRead(messageId: string): ChatMessage | null {
  const allMessages = getFromStorage<ChatMessage>(STORAGE_KEYS.CHAT_MESSAGES);
  const index = allMessages.findIndex(m => m.id === messageId);
  if (index === -1) return null;
  allMessages[index] = { ...allMessages[index], read_at: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, allMessages);
  return allMessages[index];
}

export function markAllChatMessagesRead(userId: string): ChatMessage[] {
  const allMessages = getFromStorage<ChatMessage>(STORAGE_KEYS.CHAT_MESSAGES);
  const updated: ChatMessage[] = [];
  allMessages.forEach((m, i) => {
    if (m.receiver_id === userId && !m.read_at) {
      allMessages[i] = { ...m, read_at: new Date().toISOString() };
      updated.push(allMessages[i]);
    }
  });
  saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, allMessages);
  return updated;
}

// ============ ENRICHMENT HELPERS ============
export function enrichAssignment(assignment: Assignment): Assignment {
  return {
    ...assignment,
    patient: getPatientById(assignment.patient_id),
    doctor: getStaffById(assignment.doctor_id),
    nurse: assignment.nurse_id ? getStaffById(assignment.nurse_id) : undefined,
  };
}

export function enrichPrescription(prescription: Prescription): Prescription {
  return {
    ...prescription,
    patient: getPatientById(prescription.patient_id),
    doctor: getStaffById(prescription.doctor_id),
    nurse: prescription.nurse_id ? getStaffById(prescription.nurse_id) : undefined,
  };
}

// ============ CLEAR ALL DATA ============
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============ INITIALIZE DEFAULT ACCOUNTS ============
export function initializeDefaultAccounts(): void {
  const staff = getStaff();
  
  // Create default admin if not exists (with password: admin123)
  if (!staff.find(s => s.email === 'admin@hospital.com')) {
    createStaff({
      name: 'System Administrator',
      email: 'admin@hospital.com',
      password_hash: hashPassword('admin123'),
      role: 'admin',
      contact: '+1-555-0001',
      department: 'Administration',
      on_duty: true,
    });
  }
  
  // Create default doctor if not exists (with password: doctor123)
  if (!staff.find(s => s.email === 'doctor@hospital.com')) {
    createStaff({
      name: 'Dr. Sarah Johnson',
      email: 'doctor@hospital.com',
      password_hash: hashPassword('doctor123'),
      role: 'doctor',
      contact: '+1-555-0101',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      on_duty: true,
    });
  }
  
  // Create default nurse if not exists (with password: nurse123)
  if (!staff.find(s => s.email === 'nurse@hospital.com')) {
    createStaff({
      name: 'Nurse Rachel Adams',
      email: 'nurse@hospital.com',
      password_hash: hashPassword('nurse123'),
      role: 'nurse',
      contact: '+1-555-0201',
      department: 'ICU',
      on_duty: true,
    });
  }
  
  // Initialize default medicines and sample patients
  initializeDefaultMedicines();
  initializeSamplePatients();
}

// ============ INITIALIZE SAMPLE PATIENTS ============
export function initializeSamplePatients(): void {
  const patients = getPatients();
  if (patients.length > 0) return; // Already has patients
  
  const samplePatients: Omit<Patient, 'id' | 'created_at' | 'updated_at'>[] = [
    {
      name: 'John Smith',
      age: 65,
      gender: 'male',
      blood_type: 'A+',
      room_no: '101',
      bed_no: 'A',
      status: 'monitoring',
      admission_date: new Date().toISOString(),
      diagnosis: 'Hypertension, Type 2 Diabetes',
      allergies: ['Penicillin'],
      emergency_contact: '+1-555-1001',
      insurance_id: 'INS-001',
    },
    {
      name: 'Mary Johnson',
      age: 72,
      gender: 'female',
      blood_type: 'O-',
      room_no: '102',
      bed_no: 'A',
      status: 'critical',
      admission_date: new Date().toISOString(),
      diagnosis: 'Acute Myocardial Infarction',
      allergies: [],
      emergency_contact: '+1-555-1002',
      insurance_id: 'INS-002',
    },
    {
      name: 'Robert Davis',
      age: 58,
      gender: 'male',
      blood_type: 'B+',
      room_no: '103',
      bed_no: 'A',
      status: 'stable',
      admission_date: new Date().toISOString(),
      diagnosis: 'Post-operative recovery - Knee replacement',
      allergies: ['Sulfa drugs'],
      emergency_contact: '+1-555-1003',
      insurance_id: 'INS-003',
    },
    {
      name: 'Emily Wilson',
      age: 45,
      gender: 'female',
      blood_type: 'AB+',
      room_no: '104',
      bed_no: 'A',
      status: 'monitoring',
      admission_date: new Date().toISOString(),
      diagnosis: 'Pneumonia',
      allergies: ['Aspirin'],
      emergency_contact: '+1-555-1004',
      insurance_id: 'INS-004',
    },
  ];
  
  samplePatients.forEach(patient => createPatient(patient));
}

// ============ INITIALIZE DEFAULT MEDICINES ============
export function initializeDefaultMedicines(): void {
  const medicines = getMedicines();
  if (medicines.length > 0) return; // Already initialized
  
  const defaultMedicines: Omit<Medicine, 'id' | 'created_at'>[] = [
    {
      name: 'Aspirin',
      generic_name: 'Acetylsalicylic acid',
      default_dosage: '325',
      unit: 'mg',
      category: 'Analgesic',
      route: 'oral',
      interactions: ['warfarin', 'ibuprofen'],
      contraindications: ['bleeding disorders', 'aspirin allergy'],
      side_effects: ['stomach upset', 'bleeding'],
    },
    {
      name: 'Metoprolol',
      generic_name: 'Metoprolol tartrate',
      default_dosage: '50',
      unit: 'mg',
      category: 'Beta Blocker',
      route: 'oral',
      interactions: ['verapamil', 'diltiazem'],
      contraindications: ['severe bradycardia', 'heart block'],
      side_effects: ['fatigue', 'dizziness', 'bradycardia'],
    },
    {
      name: 'Lisinopril',
      generic_name: 'Lisinopril',
      default_dosage: '10',
      unit: 'mg',
      category: 'ACE Inhibitor',
      route: 'oral',
      interactions: ['potassium supplements', 'spironolactone'],
      contraindications: ['angioedema history', 'pregnancy'],
      side_effects: ['dry cough', 'dizziness', 'hyperkalemia'],
    },
    {
      name: 'Furosemide',
      generic_name: 'Furosemide',
      default_dosage: '40',
      unit: 'mg',
      category: 'Diuretic',
      route: 'oral',
      interactions: ['aminoglycosides', 'lithium'],
      contraindications: ['anuria', 'severe electrolyte depletion'],
      side_effects: ['dehydration', 'electrolyte imbalance'],
    },
    {
      name: 'Morphine',
      generic_name: 'Morphine sulfate',
      default_dosage: '2',
      unit: 'mg',
      category: 'Opioid Analgesic',
      route: 'iv',
      interactions: ['benzodiazepines', 'MAOIs'],
      contraindications: ['respiratory depression', 'paralytic ileus'],
      side_effects: ['respiratory depression', 'sedation', 'nausea'],
    },
    {
      name: 'Norepinephrine',
      generic_name: 'Norepinephrine bitartrate',
      default_dosage: '4',
      unit: 'mcg/min',
      category: 'Vasopressor',
      route: 'iv',
      interactions: ['MAOIs', 'tricyclic antidepressants'],
      contraindications: ['hypovolemia uncorrected'],
      side_effects: ['hypertension', 'arrhythmias'],
    },
    {
      name: 'Ceftriaxone',
      generic_name: 'Ceftriaxone sodium',
      default_dosage: '1',
      unit: 'g',
      category: 'Antibiotic',
      route: 'iv',
      interactions: ['calcium-containing solutions'],
      contraindications: ['cephalosporin allergy'],
      side_effects: ['diarrhea', 'rash'],
    },
    {
      name: 'Omeprazole',
      generic_name: 'Omeprazole',
      default_dosage: '20',
      unit: 'mg',
      category: 'Proton Pump Inhibitor',
      route: 'oral',
      interactions: ['clopidogrel', 'methotrexate'],
      contraindications: ['hypersensitivity'],
      side_effects: ['headache', 'nausea', 'diarrhea'],
    },
  ];
  
  defaultMedicines.forEach(med => createMedicine(med));
}

// Alias for backward compatibility
export function initializeDefaultAdmin(): void {
  initializeDefaultAccounts();
}
