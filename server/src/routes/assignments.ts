import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { createNotification } from '../services/notifications.js';

export const assignmentsRouter = Router();

// GET /assignments - List all assignments
assignmentsRouter.get('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, nurse_id, status } = req.query;
    
    let query = supabase.from('assignments').select(`
      *,
      patient:patients(*),
      doctor:staff!assignments_doctor_id_fkey(*),
      nurse:staff!assignments_nurse_id_fkey(*)
    `);
    
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (nurse_id) query = query.eq('nurse_id', nurse_id);
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /assignments/my - Get current user's assignments
assignmentsRouter.get('/my/:staff_id', async (req, res) => {
  try {
    const { staff_id } = req.params;
    
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        patient:patients(*),
        doctor:staff!assignments_doctor_id_fkey(*),
        nurse:staff!assignments_nurse_id_fkey(*)
      `)
      .or(`doctor_id.eq.${staff_id},nurse_id.eq.${staff_id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching my assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /assignments - Create assignment
assignmentsRouter.post('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, nurse_id, notes } = req.body;
    
    // End any existing active assignments for this patient
    await supabase
      .from('assignments')
      .update({ status: 'transferred', end_time: new Date().toISOString() })
      .eq('patient_id', patient_id)
      .eq('status', 'active');
    
    // Create new assignment
    const { data, error } = await supabase
      .from('assignments')
      .insert({ patient_id, doctor_id, nurse_id, notes })
      .select(`
        *,
        patient:patients(*),
        doctor:staff!assignments_doctor_id_fkey(*),
        nurse:staff!assignments_nurse_id_fkey(*)
      `)
      .single();
    
    if (error) throw error;
    
    // Notify doctor and nurse
    await createNotification({
      patient_id,
      staff_id: doctor_id,
      type: 'assignment',
      priority: 'normal',
      title: 'New Patient Assignment',
      message: `You have been assigned to patient ${data.patient?.name}`,
      data: { assignment_id: data.id }
    });
    
    if (nurse_id) {
      await createNotification({
        patient_id,
        staff_id: nurse_id,
        type: 'assignment',
        priority: 'normal',
        title: 'New Patient Assignment',
        message: `You have been assigned to patient ${data.patient?.name}`,
        data: { assignment_id: data.id }
      });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// PUT /assignments/:id - Update assignment
assignmentsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.status === 'completed') {
      updates.end_time = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        patient:patients(*),
        doctor:staff!assignments_doctor_id_fkey(*),
        nurse:staff!assignments_nurse_id_fkey(*)
      `)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});
