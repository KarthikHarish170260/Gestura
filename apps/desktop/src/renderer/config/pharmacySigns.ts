/**
 * Locked 15-Sign Pharmacy Configuration
 * CSA1023 Software Engineering - SIMATS Capstone Demo
 *
 * Exactly these 15 signs are supported for the pharmacy counter demo.
 * Single source of truth for classifier, UI chips, summary, and replies.
 */

export interface PharmacySign {
  id: string;
  gloss: string;
  label: string;
  spokenText: string;
  clipPath: string;
  category: 'Politeness' | 'Confirmation' | 'Symptoms' | 'Request' | 'Dosage timing';
  hasTrainingData: boolean; // Tracking real training data vs fallback-supported
}

export const PHARMACY_SIGNS: PharmacySign[] = [
  // 1. Politeness
  {
    id: 'HELLO',
    gloss: 'HELLO',
    label: 'Hello',
    spokenText: 'Hello',
    clipPath: '/clips/hello.mp4',
    category: 'Politeness',
    hasTrainingData: true,
  },
  {
    id: 'THANK-YOU',
    gloss: 'THANK-YOU',
    label: 'Thank You',
    spokenText: 'Thank you',
    clipPath: '/clips/thank-you.mp4',
    category: 'Politeness',
    hasTrainingData: true,
  },

  // 2. Confirmation
  {
    id: 'YES',
    gloss: 'YES',
    label: 'Yes',
    spokenText: 'Yes',
    clipPath: '/clips/yes.mp4',
    category: 'Confirmation',
    hasTrainingData: true,
  },
  {
    id: 'NO',
    gloss: 'NO',
    label: 'No',
    spokenText: 'No',
    clipPath: '/clips/no.mp4',
    category: 'Confirmation',
    hasTrainingData: true,
  },
  {
    id: 'HELP',
    gloss: 'HELP',
    label: 'Help',
    spokenText: 'Help',
    clipPath: '/clips/help.mp4',
    category: 'Confirmation',
    hasTrainingData: true,
  },

  // 3. Symptoms
  {
    id: 'PAIN',
    gloss: 'PAIN',
    label: 'Pain',
    spokenText: 'Pain',
    clipPath: '/clips/pain.mp4',
    category: 'Symptoms',
    hasTrainingData: true,
  },
  {
    id: 'HEADACHE',
    gloss: 'HEADACHE',
    label: 'Headache',
    spokenText: 'Headache',
    clipPath: '/clips/headache.mp4',
    category: 'Symptoms',
    hasTrainingData: true,
  },
  {
    id: 'FEVER',
    gloss: 'FEVER',
    label: 'Fever',
    spokenText: 'Fever',
    clipPath: '/clips/fever.mp4',
    category: 'Symptoms',
    hasTrainingData: true,
  },
  {
    id: 'COUGH',
    gloss: 'COUGH',
    label: 'Cough',
    spokenText: 'Cough',
    clipPath: '/clips/cough.mp4',
    category: 'Symptoms',
    hasTrainingData: false, // Fallback-supported
  },
  {
    id: 'COLD',
    gloss: 'COLD',
    label: 'Cold',
    spokenText: 'Cold',
    clipPath: '/clips/cold.mp4',
    category: 'Symptoms',
    hasTrainingData: false, // Fallback-supported
  },
  {
    id: 'ALLERGY',
    gloss: 'ALLERGY',
    label: 'Allergy',
    spokenText: 'Allergy',
    clipPath: '/clips/allergy.mp4',
    category: 'Symptoms',
    hasTrainingData: true,
  },

  // 4. Request
  {
    id: 'MEDICINE',
    gloss: 'MEDICINE',
    label: 'Medicine',
    spokenText: 'Medicine',
    clipPath: '/clips/medicine.mp4',
    category: 'Request',
    hasTrainingData: true,
  },
  {
    id: 'WATER',
    gloss: 'WATER',
    label: 'Water',
    spokenText: 'Water',
    clipPath: '/clips/water.mp4',
    category: 'Request',
    hasTrainingData: true,
  },

  // 5. Dosage timing
  {
    id: 'MORNING',
    gloss: 'MORNING',
    label: 'Morning',
    spokenText: 'Morning',
    clipPath: '/clips/morning.mp4',
    category: 'Dosage timing',
    hasTrainingData: false, // Fallback-supported
  },
  {
    id: 'NIGHT',
    gloss: 'NIGHT',
    label: 'Night',
    spokenText: 'Night',
    clipPath: '/clips/night.mp4',
    category: 'Dosage timing',
    hasTrainingData: false, // Fallback-supported
  },
];

export const PHARMACY_SIGN_MAP: Record<string, PharmacySign> = Object.fromEntries(
  PHARMACY_SIGNS.map((s) => [s.gloss, s])
);

export const PHARMACY_QUICK_PHRASES = [
  { text: 'Take with water', glosses: ['MEDICINE', 'WATER'] },
  { text: 'Morning and night', glosses: ['MORNING', 'NIGHT'] },
  { text: 'After food', glosses: ['MEDICINE', 'YES'] },
  { text: 'See a doctor if fever continues', glosses: ['FEVER', 'HELP'] },
];
