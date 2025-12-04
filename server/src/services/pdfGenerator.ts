// @ts-ignore
import PDFDocument from 'pdfkit';

interface ReportData {
  patient: any;
  vitals: any[];
  predictions: any[];
  forecasts: any[];
  prescriptions: any[];
  riskEvents: any[];
  assignment: any;
  devices: any[];
  reportType: string;
  hours: number;
}

export async function generatePatientPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('VitalGuard AI', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Patient Summary Report', { align: 'center' });
      doc.moveDown();
      
      // Report info
      doc.fontSize(10).text(`Report Type: ${data.reportType.toUpperCase()}`, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.text(`Period: Last ${data.hours} hours`, { align: 'right' });
      doc.moveDown();
      
      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      
      // Patient Demographics
      doc.fontSize(14).font('Helvetica-Bold').text('Patient Information');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${data.patient.name}`);
      doc.text(`Age: ${data.patient.age} years | Gender: ${data.patient.gender}`);
      doc.text(`Room: ${data.patient.room_no}`);
      doc.text(`Status: ${data.patient.status.toUpperCase()}`);
      doc.text(`Admission Date: ${new Date(data.patient.admission_date).toLocaleDateString()}`);
      if (data.patient.allergies?.length) {
        doc.text(`Allergies: ${data.patient.allergies.join(', ')}`);
      }
      doc.moveDown();
      
      // Care Team
      if (data.assignment) {
        doc.fontSize(14).font('Helvetica-Bold').text('Care Team');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        if (data.assignment.doctor) {
          doc.text(`Attending Physician: Dr. ${data.assignment.doctor.name} (${data.assignment.doctor.specialization || 'General'})`);
        }
        if (data.assignment.nurse) {
          doc.text(`Assigned Nurse: ${data.assignment.nurse.name}`);
        }
        doc.moveDown();
      }
      
      // Latest Vitals
      if (data.vitals.length > 0) {
        const latest = data.vitals[data.vitals.length - 1];
        doc.fontSize(14).font('Helvetica-Bold').text('Current Vital Signs');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Heart Rate: ${latest.heart_rate} bpm`);
        doc.text(`SpO₂: ${latest.spo2}%`);
        doc.text(`Respiratory Rate: ${latest.resp_rate} /min`);
        doc.text(`Blood Pressure: ${latest.systolic_bp}/${latest.diastolic_bp} mmHg`);
        doc.text(`Temperature: ${latest.temperature}°C`);
        doc.text(`Recorded: ${new Date(latest.timestamp).toLocaleString()}`);
        doc.moveDown();
      }
      
      // Vitals Summary
      if (data.vitals.length > 1) {
        doc.fontSize(14).font('Helvetica-Bold').text('Vital Signs Summary');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        const hrValues = data.vitals.map(v => v.heart_rate);
        const spo2Values = data.vitals.map(v => v.spo2);
        
        doc.text(`Heart Rate: Min ${Math.min(...hrValues)} | Max ${Math.max(...hrValues)} | Avg ${Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)}`);
        doc.text(`SpO₂: Min ${Math.min(...spo2Values)}% | Max ${Math.max(...spo2Values)}% | Avg ${(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length).toFixed(1)}%`);
        doc.text(`Total Readings: ${data.vitals.length}`);
        doc.moveDown();
      }
      
      // AI Predictions
      if (data.predictions.length > 0) {
        const latest = data.predictions[0];
        doc.fontSize(14).font('Helvetica-Bold').text('AI Risk Assessment');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Current Risk Level: ${latest.risk_level}`);
        doc.text(`Risk Probability: ${(latest.probability * 100).toFixed(1)}%`);
        doc.text(`Assessment: ${latest.explanation}`);
        doc.moveDown();
      }
      
      // Forecast
      if (data.forecasts.length > 0) {
        const forecast = data.forecasts[0];
        doc.fontSize(14).font('Helvetica-Bold').text('Vital Signs Forecast');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Projection: ${forecast.risk_projection?.toUpperCase() || 'STABLE'}`);
        doc.text(`Confidence: ${((forecast.confidence || 0) * 100).toFixed(0)}%`);
        if (forecast.forecast_json?.summary) {
          doc.text(`Summary: ${forecast.forecast_json.summary}`);
        }
        doc.moveDown();
      }
      
      // Prescriptions
      if (data.prescriptions.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Prescriptions');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        for (const rx of data.prescriptions) {
          doc.text(`• ${new Date(rx.created_at).toLocaleDateString()} - Status: ${rx.status}`);
          for (const med of rx.medicines || []) {
            doc.text(`  - ${med.medicine_name} ${med.dosage}${med.unit} ${med.frequency} for ${med.duration}`);
          }
        }
        doc.moveDown();
      }
      
      // Risk Events/Alerts
      if (data.riskEvents.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Alerts & Events');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        for (const event of data.riskEvents.slice(0, 10)) {
          doc.text(`• [${event.severity.toUpperCase()}] ${new Date(event.timestamp).toLocaleString()}`);
          doc.text(`  ${event.message}`);
        }
        doc.moveDown();
      }
      
      // IoT Devices
      if (data.devices.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Connected Devices');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        for (const device of data.devices) {
          doc.text(`• ${device.device_id} (${device.device_type}) - ${device.status.toUpperCase()}`);
          if (device.battery_level) {
            doc.text(`  Battery: ${device.battery_level}%`);
          }
        }
        doc.moveDown();
      }
      
      // Footer
      doc.fontSize(8).text('This report is generated automatically by VitalGuard AI. For clinical decisions, please consult with healthcare professionals.', 50, doc.page.height - 50, { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
