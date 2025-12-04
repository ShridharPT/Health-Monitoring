import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { generatePatientPDF } from '../services/pdfGenerator.js';

export const reportsRouter = Router();

// GET /reports - List reports
reportsRouter.get('/', async (req, res) => {
  try {
    const { patient_id, report_type } = req.query;
    
    let query = supabase.from('reports').select(`
      *,
      patient:patients(id, name, room_no),
      generator:staff!reports_generated_by_fkey(id, name, role)
    `);
    
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (report_type) query = query.eq('report_type', report_type);
    
    const { data, error } = await query.order('generated_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /reports/patient/:id/pdf - Generate patient PDF report
reportsRouter.get('/patient/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { report_type = 'daily', hours = 24 } = req.query;
    
    // Get patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (patientError) throw patientError;
    
    // Get vitals for the period
    const startTime = new Date(Date.now() - Number(hours) * 60 * 60 * 1000).toISOString();
    const { data: vitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', id)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: true });
    
    // Get predictions
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('patient_id', id)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: false });
    
    // Get forecasts
    const { data: forecasts } = await supabase
      .from('forecasts')
      .select('*')
      .eq('patient_id', id)
      .order('timestamp', { ascending: false })
      .limit(1);
    
    // Get prescriptions
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:staff!prescriptions_doctor_id_fkey(name),
        nurse:staff!prescriptions_nurse_id_fkey(name)
      `)
      .eq('patient_id', id)
      .gte('created_at', startTime);
    
    // Get risk events
    const { data: riskEvents } = await supabase
      .from('risk_events')
      .select('*')
      .eq('patient_id', id)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: false });
    
    // Get assignment
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        *,
        doctor:staff!assignments_doctor_id_fkey(name, specialization),
        nurse:staff!assignments_nurse_id_fkey(name)
      `)
      .eq('patient_id', id)
      .eq('status', 'active')
      .single();
    
    // Get devices
    const { data: devices } = await supabase
      .from('iot_devices')
      .select('*')
      .eq('patient_id', id);
    
    // Generate PDF
    const pdfBuffer = await generatePatientPDF({
      patient,
      vitals: vitals || [],
      predictions: predictions || [],
      forecasts: forecasts || [],
      prescriptions: prescriptions || [],
      riskEvents: riskEvents || [],
      assignment,
      devices: devices || [],
      reportType: report_type as string,
      hours: Number(hours)
    });
    
    // Save report record
    const { data: report } = await supabase
      .from('reports')
      .insert({
        patient_id: id,
        report_type,
        date_range_start: startTime,
        date_range_end: new Date().toISOString()
      })
      .select()
      .single();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="patient-report-${patient.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /reports/:id - Get single report
reportsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        patient:patients(*),
        generator:staff!reports_generated_by_fkey(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});
