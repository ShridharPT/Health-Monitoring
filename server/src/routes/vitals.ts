import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { runPrediction } from '../ai/prediction.js';
import { runForecast } from '../ai/forecast.js';
import { broadcastToPatientSubscribers } from '../websocket/index.js';

export const vitalsRouter = Router();

// POST /vitals - Record new vitals
vitalsRouter.post('/', async (req, res) => {
  try {
    const { patient_id, heart_rate, spo2, resp_rate, systolic_bp, diastolic_bp, temperature, device_id, ecg_waveform_ref } = req.body;

    // Insert vitals
    const { data: vitals, error } = await supabase
      .from('vitals')
      .insert({
        patient_id,
        heart_rate,
        spo2,
        resp_rate,
        systolic_bp,
        diastolic_bp,
        temperature,
        device_id,
        ecg_waveform_ref
      })
      .select()
      .single();

    if (error) throw error;

    // Run AI prediction
    const prediction = await runPrediction(patient_id, vitals);
    
    // Run forecast
    const forecast = await runForecast(patient_id);

    // Broadcast to WebSocket subscribers
    broadcastToPatientSubscribers(patient_id, {
      type: 'vitals',
      payload: { vitals, prediction, forecast },
      timestamp: new Date().toISOString()
    });

    res.json({ vitals, prediction, forecast });
  } catch (error) {
    console.error('Error recording vitals:', error);
    res.status(500).json({ error: 'Failed to record vitals' });
  }
});

// GET /vitals/:patient_id - Get patient vitals
vitalsRouter.get('/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patient_id)
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
});

// GET /vitals/:patient_id/latest - Get latest vitals
vitalsRouter.get('/:patient_id/latest', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patient_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (error) {
    console.error('Error fetching latest vitals:', error);
    res.status(500).json({ error: 'Failed to fetch latest vitals' });
  }
});
