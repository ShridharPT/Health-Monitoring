import { supabase } from '../lib/supabase.js';

// Simulates IoT devices sending vitals data

interface SimulatedDevice {
  device_id: string;
  patient_id: string;
  device_type: string;
  interval: number; // ms
}

const activeSimulations = new Map<string, NodeJS.Timeout>();

function generateVitals(baseVitals?: any) {
  const base = baseVitals || {
    heart_rate: 75,
    spo2: 97,
    resp_rate: 16,
    systolic_bp: 120,
    diastolic_bp: 80,
    temperature: 36.8
  };
  
  // Add realistic variation
  return {
    heart_rate: Math.round(base.heart_rate + (Math.random() - 0.5) * 10),
    spo2: Math.round((base.spo2 + (Math.random() - 0.5) * 2) * 10) / 10,
    resp_rate: Math.round(base.resp_rate + (Math.random() - 0.5) * 4),
    systolic_bp: Math.round(base.systolic_bp + (Math.random() - 0.5) * 10),
    diastolic_bp: Math.round(base.diastolic_bp + (Math.random() - 0.5) * 8),
    temperature: Math.round((base.temperature + (Math.random() - 0.5) * 0.4) * 10) / 10
  };
}

async function sendVitals(device: SimulatedDevice) {
  try {
    // Get last vitals for continuity
    const { data: lastVitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', device.patient_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    const vitals = generateVitals(lastVitals);
    
    // Get device DB id
    const { data: deviceData } = await supabase
      .from('iot_devices')
      .select('id')
      .eq('device_id', device.device_id)
      .single();
    
    // Insert vitals
    const { error } = await supabase
      .from('vitals')
      .insert({
        patient_id: device.patient_id,
        device_id: deviceData?.id,
        ...vitals
      });
    
    if (error) {
      console.error(`Error sending vitals from ${device.device_id}:`, error);
    } else {
      console.log(`[${device.device_id}] Sent vitals for patient ${device.patient_id}`);
    }
    
    // Update device last_seen
    await supabase
      .from('iot_devices')
      .update({ last_seen: new Date().toISOString(), status: 'online' })
      .eq('device_id', device.device_id);
      
  } catch (error) {
    console.error(`Simulation error for ${device.device_id}:`, error);
  }
}

export function startDeviceSimulation(device: SimulatedDevice) {
  if (activeSimulations.has(device.device_id)) {
    console.log(`Simulation already running for ${device.device_id}`);
    return;
  }
  
  console.log(`Starting simulation for ${device.device_id} (interval: ${device.interval}ms)`);
  
  // Send initial vitals
  sendVitals(device);
  
  // Set up interval
  const intervalId = setInterval(() => sendVitals(device), device.interval);
  activeSimulations.set(device.device_id, intervalId);
}

export function stopDeviceSimulation(deviceId: string) {
  const intervalId = activeSimulations.get(deviceId);
  if (intervalId) {
    clearInterval(intervalId);
    activeSimulations.delete(deviceId);
    console.log(`Stopped simulation for ${deviceId}`);
  }
}

export function stopAllSimulations() {
  for (const [deviceId, intervalId] of activeSimulations) {
    clearInterval(intervalId);
    console.log(`Stopped simulation for ${deviceId}`);
  }
  activeSimulations.clear();
}

// CLI runner
async function main() {
  console.log('IoT Device Simulator');
  console.log('====================');
  
  // Get all devices with assigned patients
  const { data: devices, error } = await supabase
    .from('iot_devices')
    .select('device_id, patient_id, device_type')
    .not('patient_id', 'is', null);
  
  if (error) {
    console.error('Error fetching devices:', error);
    return;
  }
  
  if (!devices || devices.length === 0) {
    console.log('No devices with assigned patients found.');
    console.log('Assign devices to patients first.');
    return;
  }
  
  console.log(`Found ${devices.length} devices with patients`);
  
  // Start simulations
  for (const device of devices) {
    startDeviceSimulation({
      device_id: device.device_id,
      patient_id: device.patient_id!,
      device_type: device.device_type,
      interval: 30000 // 30 seconds
    });
  }
  
  console.log('\nSimulation running. Press Ctrl+C to stop.');
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nStopping simulations...');
    stopAllSimulations();
    process.exit(0);
  });
}

// Run if called directly
if (process.argv[1]?.includes('iotSimulator')) {
  main();
}
