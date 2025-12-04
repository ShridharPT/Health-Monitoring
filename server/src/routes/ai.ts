import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { runPrediction } from '../ai/prediction.js';
import { runForecast } from '../ai/forecast.js';
import { parseVoicePrescription } from '../ai/voiceParser.js';

export const aiRouter = Router();

// POST /ai/predict - Run prediction for patient
aiRouter.post('/predict', async (req, res) => {
  try {
    const { patient_id } = req.body;
    
    // Get latest vitals
    const { data: vitals, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patient_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !vitals) {
      return res.status(400).json({ error: 'No vitals found for patient' });
    }
    
    const prediction = await runPrediction(patient_id, vitals);
    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// GET /ai/risk/:patient_id - Get risk assessment
aiRouter.get('/risk/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('patient_id', patient_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (error) {
    console.error('Error fetching risk:', error);
    res.status(500).json({ error: 'Failed to fetch risk assessment' });
  }
});

// GET /ai/forecast/:patient_id - Get forecast
aiRouter.get('/forecast/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    const { data, error } = await supabase
      .from('forecasts')
      .select('*')
      .eq('patient_id', patient_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// POST /ai/forecast/:patient_id - Generate new forecast
aiRouter.post('/forecast/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { horizon_minutes = 30 } = req.body;
    
    const forecast = await runForecast(patient_id, horizon_minutes);
    res.json(forecast);
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Forecast generation failed' });
  }
});

// POST /ai/voice-to-text - Convert voice to text (stub - integrate with speech API)
aiRouter.post('/voice-to-text', async (req, res) => {
  try {
    // In production, integrate with Google Speech-to-Text, AWS Transcribe, or Azure Speech
    // For now, return mock response or use Web Speech API on frontend
    const { audio_base64 } = req.body;
    
    // Mock response for demo
    const transcript = "Prescribe Aspirin 325mg twice daily for 7 days and Metoprolol 50mg once daily";
    
    res.json({ transcript, confidence: 0.95 });
  } catch (error) {
    console.error('Voice-to-text error:', error);
    res.status(500).json({ error: 'Voice transcription failed' });
  }
});

// POST /ai/parse-medicine - Parse medicine from text
aiRouter.post('/parse-medicine', async (req, res) => {
  try {
    const { text } = req.body;
    
    const parsed = await parseVoicePrescription(text);
    res.json(parsed);
  } catch (error) {
    console.error('Parse medicine error:', error);
    res.status(500).json({ error: 'Failed to parse medicine' });
  }
});
