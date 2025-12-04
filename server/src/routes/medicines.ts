import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const medicinesRouter = Router();

// GET /medicines - List all medicines
medicinesRouter.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = supabase.from('medicines').select('*');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// GET /medicines/categories - Get medicine categories
medicinesRouter.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('category')
      .order('category');
    
    if (error) throw error;
    
    const categories = [...new Set(data?.map(m => m.category))];
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /medicines/:id - Get single medicine
medicinesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching medicine:', error);
    res.status(500).json({ error: 'Failed to fetch medicine' });
  }
});

// POST /medicines - Create medicine
medicinesRouter.post('/', async (req, res) => {
  try {
    const { name, generic_name, default_dosage, unit, category, route, interactions, contraindications, side_effects } = req.body;
    
    const { data, error } = await supabase
      .from('medicines')
      .insert({ name, generic_name, default_dosage, unit, category, route, interactions, contraindications, side_effects })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating medicine:', error);
    res.status(500).json({ error: 'Failed to create medicine' });
  }
});

// PUT /medicines/:id - Update medicine
medicinesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('medicines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ error: 'Failed to update medicine' });
  }
});
