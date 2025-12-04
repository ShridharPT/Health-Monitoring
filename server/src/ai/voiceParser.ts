import { supabase } from '../lib/supabase.js';

interface ParsedMedicine {
  medicine_id?: string;
  medicine_name: string;
  dosage: string;
  unit: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  confidence: number;
}

interface ParseResult {
  medicines: ParsedMedicine[];
  warnings: string[];
  raw_text: string;
}

// Common medicine name patterns
const MEDICINE_PATTERNS = [
  /(?:prescribe|give|administer)\s+(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)/gi,
  /(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)/gi,
];

// Frequency patterns
const FREQUENCY_PATTERNS: [RegExp, string][] = [
  [/once\s+(?:a\s+)?daily|once\s+per\s+day|od|qd/i, 'once daily'],
  [/twice\s+(?:a\s+)?daily|twice\s+per\s+day|bid|bd/i, 'twice daily'],
  [/three\s+times\s+(?:a\s+)?daily|tid/i, 'three times daily'],
  [/four\s+times\s+(?:a\s+)?daily|qid/i, 'four times daily'],
  [/every\s+(\d+)\s+hours?/i, 'every $1 hours'],
  [/as\s+needed|prn/i, 'as needed'],
  [/at\s+bedtime|hs/i, 'at bedtime'],
  [/with\s+meals/i, 'with meals'],
];

// Duration patterns
const DURATION_PATTERNS: [RegExp, string][] = [
  [/for\s+(\d+)\s+days?/i, '$1 days'],
  [/for\s+(\d+)\s+weeks?/i, '$1 weeks'],
  [/for\s+(\d+)\s+months?/i, '$1 months'],
  [/ongoing|continuous|indefinite/i, 'ongoing'],
  [/until\s+follow[\s-]?up/i, 'until follow-up'],
];

// Route patterns
const ROUTE_PATTERNS: [RegExp, string][] = [
  [/oral(?:ly)?|by\s+mouth|po/i, 'oral'],
  [/intravenous(?:ly)?|iv/i, 'iv'],
  [/intramuscular(?:ly)?|im/i, 'im'],
  [/subcutaneous(?:ly)?|sc|subq/i, 'sc'],
  [/topical(?:ly)?/i, 'topical'],
  [/inhale[d]?|inhalation/i, 'inhalation'],
];

function extractFrequency(text: string): string {
  for (const [pattern, replacement] of FREQUENCY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return text.replace(pattern, replacement).match(pattern)?.[0] || replacement;
    }
  }
  return 'as directed';
}

function extractDuration(text: string): string {
  for (const [pattern, replacement] of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[1]) {
        return replacement.replace('$1', match[1]);
      }
      return replacement;
    }
  }
  return '7 days';
}

function extractRoute(text: string): string {
  for (const [pattern, replacement] of ROUTE_PATTERNS) {
    if (pattern.test(text)) {
      return replacement;
    }
  }
  return 'oral';
}

async function findMedicineInDB(name: string): Promise<{ id: string; name: string; default_dosage: string; unit: string; route: string } | null> {
  const { data } = await supabase
    .from('medicines')
    .select('id, name, default_dosage, unit, route')
    .or(`name.ilike.%${name}%,generic_name.ilike.%${name}%`)
    .limit(1)
    .single();
  
  return data;
}

export async function parseVoicePrescription(text: string): Promise<ParseResult> {
  const medicines: ParsedMedicine[] = [];
  const warnings: string[] = [];
  
  // Split by common separators
  const segments = text.split(/(?:and|,|;|\.|then)/i).filter(s => s.trim());
  
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    
    // Try to extract medicine info
    for (const pattern of MEDICINE_PATTERNS) {
      const matches = [...trimmed.matchAll(pattern)];
      
      for (const match of matches) {
        const medicineName = match[1];
        const dosage = match[2];
        const unit = match[3].toLowerCase();
        
        // Look up in database
        const dbMedicine = await findMedicineInDB(medicineName);
        
        const frequency = extractFrequency(trimmed);
        const duration = extractDuration(trimmed);
        const route = dbMedicine?.route || extractRoute(trimmed);
        
        const parsed: ParsedMedicine = {
          medicine_name: dbMedicine?.name || medicineName,
          dosage,
          unit,
          frequency,
          duration,
          route,
          confidence: dbMedicine ? 0.9 : 0.6
        };
        
        if (dbMedicine) {
          parsed.medicine_id = dbMedicine.id;
          
          // Check if dosage differs significantly from default
          const defaultDosage = parseFloat(dbMedicine.default_dosage);
          const prescribedDosage = parseFloat(dosage);
          
          if (prescribedDosage > defaultDosage * 2) {
            warnings.push(`High dosage for ${medicineName}: ${dosage}${unit} (default: ${dbMedicine.default_dosage}${dbMedicine.unit})`);
          }
        } else {
          warnings.push(`Medicine "${medicineName}" not found in database. Please verify.`);
        }
        
        medicines.push(parsed);
      }
    }
  }
  
  // If no medicines found, try simpler extraction
  if (medicines.length === 0) {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const dbMedicine = await findMedicineInDB(word);
      
      if (dbMedicine) {
        // Look for dosage nearby
        let dosage = dbMedicine.default_dosage;
        let unit = dbMedicine.unit;
        
        for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
          const dosageMatch = words[j].match(/^(\d+(?:\.\d+)?)(mg|mcg|g|ml|units?)?$/i);
          if (dosageMatch) {
            dosage = dosageMatch[1];
            if (dosageMatch[2]) unit = dosageMatch[2].toLowerCase();
            break;
          }
        }
        
        medicines.push({
          medicine_id: dbMedicine.id,
          medicine_name: dbMedicine.name,
          dosage,
          unit,
          frequency: extractFrequency(text),
          duration: extractDuration(text),
          route: dbMedicine.route,
          confidence: 0.7
        });
      }
    }
  }
  
  return {
    medicines,
    warnings,
    raw_text: text
  };
}
