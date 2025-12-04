import { supabase } from '../lib/supabase.js';

interface PrescriptionMedicine {
  medicine_id?: string;
  medicine_name: string;
  dosage: string;
  unit: string;
}

interface InteractionWarning {
  type: 'drug_interaction' | 'allergy' | 'contraindication';
  severity: 'low' | 'moderate' | 'high';
  medicine1: string;
  medicine2?: string;
  message: string;
}

export async function checkDrugInteractions(
  patientId: string,
  newMedicines: PrescriptionMedicine[]
): Promise<InteractionWarning[]> {
  const warnings: InteractionWarning[] = [];
  
  // Get patient allergies
  const { data: patient } = await supabase
    .from('patients')
    .select('allergies')
    .eq('id', patientId)
    .single();
  
  const allergies = patient?.allergies || [];
  
  // Get medicine details for new prescriptions
  const medicineNames = newMedicines.map(m => m.medicine_name.toLowerCase());
  
  const { data: medicineDetails } = await supabase
    .from('medicines')
    .select('*')
    .or(medicineNames.map(n => `name.ilike.%${n}%`).join(','));
  
  const medicineMap = new Map(medicineDetails?.map(m => [m.name.toLowerCase(), m]) || []);
  
  // Check for allergies
  for (const medicine of newMedicines) {
    const lowerName = medicine.medicine_name.toLowerCase();
    
    for (const allergy of allergies) {
      if (lowerName.includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(lowerName)) {
        warnings.push({
          type: 'allergy',
          severity: 'high',
          medicine1: medicine.medicine_name,
          message: `Patient has documented allergy to ${allergy}. ${medicine.medicine_name} may cause allergic reaction.`
        });
      }
    }
    
    // Check contraindications
    const details = medicineMap.get(lowerName);
    if (details?.contraindications) {
      for (const contraindication of details.contraindications) {
        // In production, check against patient conditions
        warnings.push({
          type: 'contraindication',
          severity: 'moderate',
          medicine1: medicine.medicine_name,
          message: `${medicine.medicine_name} is contraindicated in patients with ${contraindication}.`
        });
      }
    }
  }
  
  // Check drug-drug interactions
  for (let i = 0; i < newMedicines.length; i++) {
    const med1 = newMedicines[i];
    const details1 = medicineMap.get(med1.medicine_name.toLowerCase());
    
    if (!details1?.interactions) continue;
    
    // Check against other new medicines
    for (let j = i + 1; j < newMedicines.length; j++) {
      const med2 = newMedicines[j];
      
      for (const interaction of details1.interactions as string[]) {
        if (med2.medicine_name.toLowerCase().includes(interaction.toLowerCase())) {
          warnings.push({
            type: 'drug_interaction',
            severity: 'moderate',
            medicine1: med1.medicine_name,
            medicine2: med2.medicine_name,
            message: `Potential interaction between ${med1.medicine_name} and ${med2.medicine_name}. Monitor closely.`
          });
        }
      }
    }
    
    // Check against existing prescriptions
    const { data: existingPrescriptions } = await supabase
      .from('prescriptions')
      .select('medicines')
      .eq('patient_id', patientId)
      .in('status', ['pending', 'acknowledged', 'administered'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    for (const prescription of existingPrescriptions || []) {
      for (const existingMed of prescription.medicines as PrescriptionMedicine[]) {
        for (const interaction of details1.interactions as string[]) {
          if (existingMed.medicine_name.toLowerCase().includes(interaction.toLowerCase())) {
            warnings.push({
              type: 'drug_interaction',
              severity: 'moderate',
              medicine1: med1.medicine_name,
              medicine2: existingMed.medicine_name,
              message: `Potential interaction between new ${med1.medicine_name} and existing ${existingMed.medicine_name}.`
            });
          }
        }
      }
    }
  }
  
  return warnings;
}
