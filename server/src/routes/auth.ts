import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'vitalguard-secret-key-change-in-production';

// POST /auth/login - Login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // For demo, accept any password or check hash
    const isValid = staff.password_hash === '$2b$10$demo' || await bcrypt.compare(password, staff.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password_hash from response
    const { password_hash, ...staffData } = staff;
    
    res.json({ token, staff: staffData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/register - Register new staff (admin only in production)
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, contact, department, specialization } = req.body;
    
    const password_hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('staff')
      .insert({ name, email, password_hash, role, contact, department, specialization })
      .select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at')
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }
    
    const token = jwt.sign(
      { id: data.id, email: data.email, role: data.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({ token, staff: data });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /auth/me - Get current user
authRouter.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, email, role, contact, department, specialization, on_duty, avatar_url, created_at, updated_at')
      .eq('id', decoded.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/logout - Logout (client-side token removal)
authRouter.post('/logout', (req, res) => {
  res.json({ success: true });
});

// PUT /auth/password - Change password
authRouter.put('/password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const { currentPassword, newPassword } = req.body;
    
    const { data: staff } = await supabase
      .from('staff')
      .select('password_hash')
      .eq('id', decoded.id)
      .single();
    
    if (!staff) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = staff.password_hash === '$2b$10$demo' || await bcrypt.compare(currentPassword, staff.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    const password_hash = await bcrypt.hash(newPassword, 10);
    
    await supabase
      .from('staff')
      .update({ password_hash })
      .eq('id', decoded.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
