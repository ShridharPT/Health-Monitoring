import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const patientsRouter = Router();

// GET /patients - List all patients
patientsRouter.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = supabase.from('patients').select('*');
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,room_no.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET /patients/:id - Get single patient
patientsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// POST /patients - Create patient
patientsRouter.post('/', async (req, res) => {
  try {
    const { name, age, gender, room_no, weight, allergies, contact, status } = req.body;
    
    const { data, error } = await supabase
      .from('patients')
      .insert({ name, age, gender, room_no, weight, allergies, contact, status })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// PUT /patients/:id - Update patient
patientsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// DELETE /patients/:id - Delete patient
patientsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});
