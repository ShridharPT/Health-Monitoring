import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { broadcastDeviceStatus } from '../websocket/index.js';

export const devicesRouter = Router();

// GET /devices - List all devices
devicesRouter.get('/', async (req, res) => {
  try {
    const { status, device_type, patient_id } = req.query;
    
    let query = supabase.from('iot_devices').select(`
      *,
      patient:patients(id, name, room_no)
    `);
    
    if (status) query = query.eq('status', status);
    if (device_type) query = query.eq('device_type', device_type);
    if (patient_id) query = query.eq('patient_id', patient_id);
    
    const { data, error } = await query.order('device_id');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /devices/:device_id - Get single device
devicesRouter.get('/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;
    
    const { data, error } = await supabase
      .from('iot_devices')
      .select(`
        *,
        patient:patients(*)
      `)
      .eq('device_id', device_id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// POST /devices/register - Register new device
devicesRouter.post('/register', async (req, res) => {
  try {
    const { device_id, device_type, manufacturer, model, firmware_version, config } = req.body;
    
    const { data, error } = await supabase
      .from('iot_devices')
      .upsert({
        device_id,
        device_type,
        manufacturer,
        model,
        firmware_version,
        config,
        status: 'online',
        last_seen: new Date().toISOString()
      }, { onConflict: 'device_id' })
      .select()
      .single();
    
    if (error) throw error;
    
    broadcastDeviceStatus(data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// POST /devices/:device_id/assign - Assign device to patient
devicesRouter.post('/:device_id/assign', async (req, res) => {
  try {
    const { device_id } = req.params;
    const { patient_id } = req.body;
    
    const { data, error } = await supabase
      .from('iot_devices')
      .update({ patient_id })
      .eq('device_id', device_id)
      .select(`
        *,
        patient:patients(*)
      `)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error assigning device:', error);
    res.status(500).json({ error: 'Failed to assign device' });
  }
});

// POST /devices/:device_id/heartbeat - Device heartbeat
devicesRouter.post('/:device_id/heartbeat', async (req, res) => {
  try {
    const { device_id } = req.params;
    const { battery_level, status } = req.body;
    
    const updates: Record<string, unknown> = {
      last_seen: new Date().toISOString()
    };
    if (battery_level !== undefined) updates.battery_level = battery_level;
    if (status) updates.status = status;
    
    const { data, error } = await supabase
      .from('iot_devices')
      .update(updates)
      .eq('device_id', device_id)
      .select()
      .single();
    
    if (error) throw error;
    
    broadcastDeviceStatus(data);
    res.json(data);
  } catch (error) {
    console.error('Error updating device heartbeat:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// PUT /devices/:device_id/status - Update device status
devicesRouter.put('/:device_id/status', async (req, res) => {
  try {
    const { device_id } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('iot_devices')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('device_id', device_id)
      .select()
      .single();
    
    if (error) throw error;
    
    broadcastDeviceStatus(data);
    res.json(data);
  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});
