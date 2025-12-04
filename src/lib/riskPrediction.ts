import { Vitals, VITAL_RANGES, ContributingFactor } from '@/types/medical';

interface PredictionResult {
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  probability: number;
  explanation: string;
  contributing_factors: ContributingFactor[];
}

function getVitalStatus(vital: string, value: number): 'normal' | 'warning' | 'critical' {
  const ranges = VITAL_RANGES[vital as keyof typeof VITAL_RANGES];
  
  if (!ranges) return 'normal';

  if (vital === 'spo2') {
    if (value < ranges.criticalMin) return 'critical';
    if (value < ranges.min) return 'warning';
    return 'normal';
  }

  if ('criticalMin' in ranges && 'criticalMax' in ranges) {
    if (value < ranges.criticalMin || value > ranges.criticalMax) return 'critical';
  }
  
  if ('min' in ranges && 'max' in ranges) {
    if (value < ranges.min || value > ranges.max) return 'warning';
  }

  return 'normal';
}

function getVitalMessage(vital: string, value: number, status: 'normal' | 'warning' | 'critical'): string {
  const vitalNames: Record<string, string> = {
    heart_rate: 'Heart rate',
    spo2: 'SpO₂',
    resp_rate: 'Respiratory rate',
    systolic_bp: 'Systolic BP',
    diastolic_bp: 'Diastolic BP',
    temperature: 'Temperature',
  };

  const name = vitalNames[vital] || vital;
  const ranges = VITAL_RANGES[vital as keyof typeof VITAL_RANGES];

  if (status === 'critical') {
    if (vital === 'spo2') {
      return `${name} critically low at ${value}% (below ${ranges.criticalMin}%)`;
    }
    if ('criticalMin' in ranges && value < ranges.criticalMin) {
      return `${name} critically low at ${value}`;
    }
    if ('criticalMax' in ranges && value > ranges.criticalMax) {
      return `${name} critically elevated at ${value}`;
    }
  }

  if (status === 'warning') {
    if (vital === 'spo2') {
      return `${name} below normal at ${value}%`;
    }
    if ('min' in ranges && value < ranges.min) {
      return `${name} below normal range at ${value}`;
    }
    if ('max' in ranges && value > ranges.max) {
      return `${name} above normal range at ${value}`;
    }
  }

  return `${name} within normal limits at ${value}`;
}

export function predictRisk(vitals: Vitals): PredictionResult {
  const factors: ContributingFactor[] = [];
  let criticalCount = 0;
  let warningCount = 0;

  // Analyze each vital
  const vitalKeys: (keyof typeof VITAL_RANGES)[] = [
    'heart_rate', 'spo2', 'resp_rate', 'systolic_bp', 'diastolic_bp', 'temperature'
  ];

  for (const vital of vitalKeys) {
    const value = vitals[vital as keyof Vitals] as number;
    const status = getVitalStatus(vital, value);
    const message = getVitalMessage(vital, value, status);

    if (status === 'critical') {
      criticalCount++;
      factors.push({ vital, value, status, message });
    } else if (status === 'warning') {
      warningCount++;
      factors.push({ vital, value, status, message });
    }
  }

  // Calculate risk level and probability
  let risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  let probability: number;
  let explanation: string;

  if (criticalCount >= 2 || (criticalCount >= 1 && warningCount >= 2)) {
    risk_level = 'High Risk';
    probability = Math.min(0.95, 0.7 + criticalCount * 0.1 + warningCount * 0.03);
    explanation = `Multiple critical vital signs detected. ${factors.filter(f => f.status === 'critical').map(f => f.message).join('. ')}. Immediate attention required.`;
  } else if (criticalCount >= 1 || warningCount >= 3) {
    risk_level = 'High Risk';
    probability = Math.min(0.9, 0.6 + criticalCount * 0.15 + warningCount * 0.05);
    explanation = criticalCount > 0 
      ? `Critical vital sign: ${factors.find(f => f.status === 'critical')?.message}. Close monitoring required.`
      : `Multiple abnormal vitals detected. ${factors.slice(0, 2).map(f => f.message).join('. ')}.`;
  } else if (warningCount >= 2) {
    risk_level = 'Moderate Risk';
    probability = 0.4 + warningCount * 0.1;
    explanation = `Multiple vital signs outside normal range. ${factors.map(f => f.message).join('. ')}.`;
  } else if (warningCount === 1) {
    risk_level = 'Moderate Risk';
    probability = 0.25 + Math.random() * 0.1;
    explanation = `Single abnormal vital: ${factors[0]?.message}. Continue monitoring.`;
  } else {
    risk_level = 'Low Risk';
    probability = 0.05 + Math.random() * 0.1;
    explanation = 'All vital signs within normal limits. Patient condition stable.';
  }

  return {
    risk_level,
    probability: Math.round(probability * 1000) / 1000,
    explanation,
    contributing_factors: factors,
  };
}

export function generateSyntheticVitals(baseVitals?: Partial<Vitals>, risk: 'low' | 'moderate' | 'high' = 'low'): Omit<Vitals, 'id' | 'patient_id' | 'created_at'> {
  let heart_rate: number;
  let spo2: number;
  let resp_rate: number;
  let systolic_bp: number;
  let diastolic_bp: number;
  let temperature: number;

  if (risk === 'high') {
    // Generate abnormal vitals
    heart_rate = Math.random() > 0.5 ? 130 + Math.random() * 30 : 45 + Math.random() * 10;
    spo2 = 85 + Math.random() * 6;
    resp_rate = Math.random() > 0.5 ? 26 + Math.random() * 8 : 6 + Math.random() * 4;
    systolic_bp = Math.random() > 0.5 ? 160 + Math.random() * 30 : 75 + Math.random() * 15;
    diastolic_bp = Math.random() > 0.5 ? 100 + Math.random() * 25 : 45 + Math.random() * 15;
    temperature = Math.random() > 0.5 ? 38.5 + Math.random() * 1.5 : 34.5 + Math.random() * 1;
  } else if (risk === 'moderate') {
    // Generate borderline vitals
    heart_rate = Math.random() > 0.5 ? 105 + Math.random() * 15 : 50 + Math.random() * 10;
    spo2 = 92 + Math.random() * 4;
    resp_rate = Math.random() > 0.5 ? 22 + Math.random() * 5 : 10 + Math.random() * 3;
    systolic_bp = Math.random() > 0.5 ? 145 + Math.random() * 15 : 85 + Math.random() * 10;
    diastolic_bp = Math.random() > 0.5 ? 92 + Math.random() * 10 : 55 + Math.random() * 10;
    temperature = Math.random() > 0.5 ? 37.5 + Math.random() * 0.8 : 35.5 + Math.random() * 0.5;
  } else {
    // Generate normal vitals
    heart_rate = 65 + Math.random() * 30;
    spo2 = 96 + Math.random() * 3;
    resp_rate = 14 + Math.random() * 4;
    systolic_bp = 110 + Math.random() * 20;
    diastolic_bp = 70 + Math.random() * 15;
    temperature = 36.4 + Math.random() * 0.6;
  }

  return {
    heart_rate: Math.round(heart_rate),
    spo2: Math.round(spo2 * 10) / 10,
    resp_rate: Math.round(resp_rate),
    systolic_bp: Math.round(systolic_bp),
    diastolic_bp: Math.round(diastolic_bp),
    temperature: Math.round(temperature * 10) / 10,
    timestamp: new Date().toISOString(),
    ...baseVitals,
  };
}
