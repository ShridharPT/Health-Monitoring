import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const staffRouter = Router();

// GET /staff - List all staff
staffRouter.get('/', async (req, res) => {
  try {
    const { role, on_duty, department } = req.query;
    
    let query = supabase.from('staff').select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at');
    
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }
    if (on_duty !== undefined) {
      query = query.eq('on_duty', on_duty === 'true');
    }
    if (department) {
      query = query.eq('department', department);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// GET /staff/doctors - List doctors
staffRouter.get('/doctors', async (req, res) => {
  try {
    const { on_duty } = req.query;
    
    let query = supabase.from('staff').select('*').eq('role', 'doctor');
    
    if (on_duty !== undefined) {
      query = query.eq('on_duty', on_duty === 'true');
    }
    
    const { data, error } = await query.order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// GET /staff/nurses - List nurses
staffRouter.get('/nurses', async (req, res) => {
  try {
    const { on_duty } = req.query;
    
    let query = supabase.from('staff').select('*').eq('role', 'nurse');
    
    if (on_duty !== undefined) {
      query = query.eq('on_duty', on_duty === 'true');
    }
    
    const { data, error } = await query.order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching nurses:', error);
    res.status(500).json({ error: 'Failed to fetch nurses' });
  }
});

// GET /staff/:id - Get single staff member
staffRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

// POST /staff - Create staff member
staffRouter.post('/', async (req, res) => {
  try {
    const { name, email, password, role, contact, department, specialization, on_duty } = req.body;
    const bcrypt = await import('bcryptjs');
    const password_hash = await bcrypt.hash(password || 'password123', 10);
    
    const { data, error } = await supabase
      .from('staff')
      .insert({ name, email, password_hash, role, contact, department, specialization, on_duty })
      .select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at')
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// PUT /staff/:id - Update staff member
staffRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    
    if (password) {
      const bcrypt = await import('bcryptjs');
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at')
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});
