import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { createNotification } from '../services/notifications.js';
import { checkDrugInteractions } from '../services/drugInteractions.js';

export const prescriptionsRouter = Router();

// GET /prescriptions - List prescriptions
prescriptionsRouter.get('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, nurse_id, status } = req.query;
    
    let query = supabase.from('prescriptions').select(`
      *,
      patient:patients(*),
      doctor:staff!prescriptions_doctor_id_fkey(*),
      nurse:staff!prescriptions_nurse_id_fkey(*)
    `);
    
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (nurse_id) query = query.eq('nurse_id', nurse_id);
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// GET /prescriptions/:patient_id - Get patient prescriptions
prescriptionsRouter.get('/patient/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:staff!prescriptions_doctor_id_fkey(*),
        nurse:staff!prescriptions_nurse_id_fkey(*)
      `)
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// GET /prescriptions/inbox/:nurse_id - Nurse prescription inbox
prescriptionsRouter.get('/inbox/:nurse_id', async (req, res) => {
  try {
    const { nurse_id } = req.params;
    
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(*),
        doctor:staff!prescriptions_doctor_id_fkey(*)
      `)
      .eq('nurse_id', nurse_id)
      .in('status', ['pending', 'acknowledged'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching prescription inbox:', error);
    res.status(500).json({ error: 'Failed to fetch prescription inbox' });
  }
});

// POST /prescriptions - Create prescription
prescriptionsRouter.post('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, medicines, from_voice, voice_transcript, priority, notes } = req.body;
    
    // Get patient's assigned nurse
    const { data: assignment } = await supabase
      .from('assignments')
      .select('nurse_id')
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single();
    
    const nurse_id = assignment?.nurse_id;
    
    // Check drug interactions
    const interactions = await checkDrugInteractions(patient_id, medicines);
    
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id,
        doctor_id,
        nurse_id,
        medicines,
        from_voice: from_voice || false,
        voice_transcript,
        priority: priority || 'normal',
        notes
      })
      .select(`
        *,
        patient:patients(*),
        doctor:staff!prescriptions_doctor_id_fkey(*),
        nurse:staff!prescriptions_nurse_id_fkey(*)
      `)
      .single();
    
    if (error) throw error;
    
    // Notify assigned nurse
    if (nurse_id) {
      await createNotification({
        patient_id,
        staff_id: nurse_id,
        sender_id: doctor_id,
        type: 'prescription',
        priority: priority || 'normal',
        title: 'New Prescription',
        message: `New prescription for ${data.patient?.name} from Dr. ${data.doctor?.name}`,
        data: { prescription_id: data.id, interactions }
      });
    }
    
    res.status(201).json({ prescription: data, interactions });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// PATCH /prescriptions/:id/status - Update prescription status
prescriptionsRouter.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const updates: Record<string, unknown> = { status };
    if (notes) updates.notes = notes;
    
    if (status === 'acknowledged') {
      updates.acknowledged_at = new Date().toISOString();
    } else if (status === 'administered') {
      updates.administered_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('prescriptions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        patient:patients(*),
        doctor:staff!prescriptions_doctor_id_fkey(*),
        nurse:staff!prescriptions_nurse_id_fkey(*)
      `)
      .single();
    
    if (error) throw error;
    
    // Notify doctor when nurse completes
    if (status === 'completed' && data.doctor_id) {
      await createNotification({
        patient_id: data.patient_id,
        staff_id: data.doctor_id,
        sender_id: data.nurse_id,
        type: 'prescription',
        priority: 'normal',
        title: 'Prescription Completed',
        message: `Prescription for ${data.patient?.name} has been administered`,
        data: { prescription_id: data.id }
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error updating prescription status:', error);
    res.status(500).json({ error: 'Failed to update prescription status' });
  }
});
