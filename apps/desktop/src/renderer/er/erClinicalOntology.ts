/**
 * Gestura-ER: Emergency Room Clinical Ontology, Bounded 50-Concept Lexicon,
 * Multi-Gloss Sequence Parser, and Automated Emergency Severity Index (ESI) Triage Engine.
 */

export type EsiLevel = 1 | 2 | 3 | 4 | 5;

export interface EsiTriageAssessment {
  level: EsiLevel;
  title: string;
  badgeColor: string;
  acuityDescription: string;
  targetResponseTimeMinutes: number;
  expectedResources: string[];
}

export interface ClinicalTriageStatement {
  chiefComplaint: string;
  location: string;
  symptoms: string[];
  duration: string;
  painScaleEstimated: number; // 1-10
  alerts: string[];
  needs: string[];
  narrativeSpeech: string;
  esi: EsiTriageAssessment;
  confidence: number;
}

export interface ErGlossConcept {
  id: string;
  label: string;
  category: 'anatomy' | 'symptom' | 'temporal' | 'alert' | 'need';
  description: string;
  iconName: string;
  severityWeight: number; // 1-10
  synonyms: string[];
}

/**
 * The 50 Bounded Core Concepts for Emergency Intake
 */
export const ER_50_CONCEPTS: ErGlossConcept[] = [
  // 1. Anatomy / Location (10)
  { id: 'HEAD', label: 'Head / Cranial', category: 'anatomy', description: 'Head, skull, temple, forehead', iconName: 'Brain', severityWeight: 7, synonyms: ['head', 'temple', 'brain', 'skull'] },
  { id: 'CHEST', label: 'Chest / Sternum', category: 'anatomy', description: 'Chest, sternum, ribs, heart zone', iconName: 'Heart', severityWeight: 9, synonyms: ['chest', 'heart', 'ribs', 'sternum'] },
  { id: 'ABDOMEN', label: 'Abdomen / Stomach', category: 'anatomy', description: 'Belly, stomach, lower abdomen, gut', iconName: 'Activity', severityWeight: 7, synonyms: ['stomach', 'abdomen', 'belly', 'gut'] },
  { id: 'ARM', label: 'Arm / Hand', category: 'anatomy', description: 'Shoulder, elbow, wrist, hand, fingers', iconName: 'Hand', severityWeight: 4, synonyms: ['arm', 'hand', 'wrist', 'shoulder', 'elbow'] },
  { id: 'LEG', label: 'Leg / Foot', category: 'anatomy', description: 'Hip, knee, ankle, foot, toes', iconName: 'Footprints', severityWeight: 5, synonyms: ['leg', 'knee', 'foot', 'ankle', 'hip'] },
  { id: 'THROAT', label: 'Throat / Neck', category: 'anatomy', description: 'Throat, airway, neck, cervical spine', iconName: 'Wind', severityWeight: 8, synonyms: ['throat', 'neck', 'airway'] },
  { id: 'EYE', label: 'Eye / Vision', category: 'anatomy', description: 'Eye, vision, eyelid, cornea', iconName: 'Eye', severityWeight: 6, synonyms: ['eye', 'vision', 'sight'] },
  { id: 'BACK', label: 'Back / Spine', category: 'anatomy', description: 'Upper back, lumbar spine, lower back', iconName: 'ShieldAlert', severityWeight: 6, synonyms: ['back', 'spine', 'lumbar'] },
  { id: 'SKIN', label: 'Skin / Rash', category: 'anatomy', description: 'Skin surface, rash, laceration, burn', iconName: 'Sparkles', severityWeight: 4, synonyms: ['skin', 'rash', 'dermatology'] },
  { id: 'TOOTH', label: 'Tooth / Jaw', category: 'anatomy', description: 'Tooth, mouth, jaw, dental ache', iconName: 'Smile', severityWeight: 3, synonyms: ['tooth', 'dental', 'teeth', 'jaw'] },

  // 2. Symptoms / Feelings (10)
  { id: 'PAIN', label: 'Pain / Ache', category: 'symptom', description: 'General pain, ache, discomfort', iconName: 'AlertCircle', severityWeight: 6, synonyms: ['pain', 'ache', 'hurts', 'sore'] },
  { id: 'BURNING', label: 'Burning / Heat', category: 'symptom', description: 'Burning sensation, acid, heat', iconName: 'Flame', severityWeight: 5, synonyms: ['burning', 'burn', 'acid', 'fire'] },
  { id: 'SHARP', label: 'Sharp / Stabbing', category: 'symptom', description: 'Sharp, stabbing, throbbing, piercing pain', iconName: 'Zap', severityWeight: 8, synonyms: ['sharp', 'stabbing', 'piercing', 'throbbing'] },
  { id: 'BLEEDING', label: 'Bleeding / Blood', category: 'symptom', description: 'Active bleeding, hemorrhage, blood loss', iconName: 'Droplet', severityWeight: 8, synonyms: ['bleeding', 'blood', 'hemorrhage'] },
  { id: 'DIZZY', label: 'Dizziness / Vertigo', category: 'symptom', description: 'Dizziness, fainting, lightheaded, loss of balance', iconName: 'RotateCcw', severityWeight: 7, synonyms: ['dizzy', 'faint', 'lightheaded', 'spinning'] },
  { id: 'VOMIT', label: 'Vomiting / Nausea', category: 'symptom', description: 'Nausea, vomiting, emesis, upset stomach', iconName: 'AlertTriangle', severityWeight: 6, synonyms: ['vomit', 'nausea', 'throwing up', 'emesis'] },
  { id: 'BREATHE-DIFFICULT', label: 'Breathing Difficulty', category: 'symptom', description: 'Shortness of breath, suffocating, wheezing', iconName: 'Wind', severityWeight: 10, synonyms: ['shortness of breath', 'cannot breathe', 'suffocating', 'asthma'] },
  { id: 'FEVER', label: 'Fever / Chills', category: 'symptom', description: 'High temperature, chills, sweating, rigors', iconName: 'Thermometer', severityWeight: 6, synonyms: ['fever', 'high temp', 'chills', 'hot'] },
  { id: 'NUMB', label: 'Numbness / Weakness', category: 'symptom', description: 'Loss of sensation, tingling, limb weakness', iconName: 'Activity', severityWeight: 8, synonyms: ['numb', 'tingling', 'weakness', 'loss of feeling'] },
  { id: 'SWELLING', label: 'Swelling / Edema', category: 'symptom', description: 'Swollen tissue, edema, inflamed mass', iconName: 'Maximize2', severityWeight: 5, synonyms: ['swelling', 'swollen', 'edema', 'inflamed'] },

  // 3. Temporal / Duration (6)
  { id: 'SUDDEN', label: 'Sudden / Right Now', category: 'temporal', description: 'Acute onset, sudden, right now', iconName: 'Clock', severityWeight: 8, synonyms: ['sudden', 'just now', 'acute', 'now'] },
  { id: 'MORNING', label: 'Since Morning', category: 'temporal', description: 'Started this morning', iconName: 'Sun', severityWeight: 6, synonyms: ['morning', 'today', 'am'] },
  { id: 'YESTERDAY', label: 'Since Yesterday', category: 'temporal', description: 'Started yesterday / last 24h', iconName: 'Calendar', severityWeight: 5, synonyms: ['yesterday', 'past day', '24 hours'] },
  { id: 'DAYS', label: 'Several Days (1-7)', category: 'temporal', description: 'Ongoing for multiple days', iconName: 'CalendarDays', severityWeight: 4, synonyms: ['days', 'few days', '3 days', '5 days'] },
  { id: 'WEEK', label: 'Over a Week', category: 'temporal', description: 'Ongoing for a week or longer', iconName: 'CalendarRange', severityWeight: 3, synonyms: ['week', 'long time', 'weeks'] },
  { id: 'CHRONIC', label: 'Chronic / Recurring', category: 'temporal', description: 'Always present, chronic condition', iconName: 'History', severityWeight: 3, synonyms: ['chronic', 'always', 'recurring', 'past history'] },

  // 4. Clinical Alerts & Conditions (12)
  { id: 'ALLERGY-PENICILLIN', label: 'Allergy: Penicillin', category: 'alert', description: 'Penicillin or antibiotic allergy', iconName: 'ShieldAlert', severityWeight: 8, synonyms: ['allergy penicillin', 'penicillin', 'amoxicillin allergy'] },
  { id: 'ALLERGY-FOOD', label: 'Allergy: Food/Nuts', category: 'alert', description: 'Severe food or nut allergy', iconName: 'AlertCircle', severityWeight: 8, synonyms: ['allergy food', 'peanuts', 'shellfish allergy'] },
  { id: 'PREGNANCY', label: 'Pregnant', category: 'alert', description: 'Patient is pregnant', iconName: 'HeartHandshake', severityWeight: 7, synonyms: ['pregnant', 'pregnancy', 'expecting'] },
  { id: 'DIABETIC', label: 'Diabetic / Insulin', category: 'alert', description: 'Diabetes, insulin user, hypo/hyperglycemia risk', iconName: 'Syringe', severityWeight: 7, synonyms: ['diabetic', 'diabetes', 'insulin', 'blood sugar'] },
  { id: 'HEART-PROBLEM', label: 'Heart Disease History', category: 'alert', description: 'Prior cardiac history, stent, bypass', iconName: 'Heart', severityWeight: 9, synonyms: ['heart disease', 'cardiac', 'heart attack history'] },
  { id: 'HYPERTENSION', label: 'High Blood Pressure', category: 'alert', description: 'Hypertension, vascular risk', iconName: 'Activity', severityWeight: 6, synonyms: ['high blood pressure', 'hypertension', 'bp'] },
  { id: 'SEIZURE', label: 'Seizure Disorder', category: 'alert', description: 'Epilepsy, convulsions, post-ictal state', iconName: 'Zap', severityWeight: 9, synonyms: ['seizure', 'epilepsy', 'convulsion', 'fit'] },
  { id: 'INHALER-MISSING', label: 'Inhaler Unavailable', category: 'alert', description: 'Asthmatic without rescue inhaler', iconName: 'Wind', severityWeight: 9, synonyms: ['no inhaler', 'lost inhaler', 'asthma emergency'] },
  { id: 'POISON-BITE', label: 'Poison / Toxic Bite', category: 'alert', description: 'Poison ingestion or animal/snake/insect bite', iconName: 'Biohazard', severityWeight: 10, synonyms: ['poison', 'snake bite', 'spider bite', 'chemical ingestion'] },
  { id: 'FALL-INJURY', label: 'Fall / Impact Injury', category: 'alert', description: 'Mechanical fall from height or ground level', iconName: 'TrendingDown', severityWeight: 7, synonyms: ['fall', 'fell down', 'injury', 'accident'] },
  { id: 'INFECTION', label: 'Infection / Pus', category: 'alert', description: 'Purulent drainage, cellulitis, spreading erythema', iconName: 'Bug', severityWeight: 6, synonyms: ['infection', 'pus', 'septic', 'cellulitis'] },
  { id: 'FAINTING', label: 'Fainting / Syncope', category: 'alert', description: 'Passed out, syncopal episode, blackout', iconName: 'UserX', severityWeight: 8, synonyms: ['fainted', 'passed out', 'syncope', 'blackout'] },

  // 5. Conversational & Acute Needs (12)
  { id: 'NEED-THIS', label: 'Need Urgent Care Here', category: 'need', description: 'Patient urgently requesting attention for this condition', iconName: 'AlertTriangle', severityWeight: 7, synonyms: ['need this', 'help here', 'please treat'] },
  { id: 'HELP-FAST', label: 'Emergency Fast', category: 'need', description: 'Life-critical urgent plea', iconName: 'Bell', severityWeight: 9, synonyms: ['help fast', 'hurry', 'emergency now'] },
  { id: 'WATER', label: 'Need Water', category: 'need', description: 'Oral rehydration / thirsty request', iconName: 'GlassWater', severityWeight: 2, synonyms: ['water', 'drink', 'thirsty'] },
  { id: 'BATHROOM', label: 'Need Restroom', category: 'need', description: 'Restroom / urinating urgency', iconName: 'DoorClosed', severityWeight: 3, synonyms: ['bathroom', 'toilet', 'restroom'] },
  { id: 'WHEELCHAIR', label: 'Need Wheelchair', category: 'need', description: 'Patient cannot walk / needs chair transport', iconName: 'Accessibility', severityWeight: 6, synonyms: ['wheelchair', 'cannot walk', 'chair'] },
  { id: 'FAMILY-CALL', label: 'Call Family', category: 'need', description: 'Contact family member or emergency contact', iconName: 'Phone', severityWeight: 2, synonyms: ['call family', 'phone contact', 'relative'] },
  { id: 'MEDICINE-WANT', label: 'Need Pain Medicine', category: 'need', description: 'Requesting analgesia / pain medication', iconName: 'Pill', severityWeight: 5, synonyms: ['medicine', 'pain killer', 'pill'] },
  { id: 'NURSE-PLEASE', label: 'Call Nurse Please', category: 'need', description: 'Requesting bedside triage nurse assistance', iconName: 'UserCheck', severityWeight: 4, synonyms: ['nurse', 'nurse call', 'staff'] },
  { id: 'STOP-PLEASE', label: 'Please Stop', category: 'need', description: 'Requesting pause or stop current procedure', iconName: 'Octagon', severityWeight: 5, synonyms: ['stop', 'pause', 'wait'] },
  { id: 'SIT-DOWN', label: 'Need to Sit Down', category: 'need', description: 'Feeling faint / must sit down immediately', iconName: 'Armchair', severityWeight: 4, synonyms: ['sit down', 'sit', 'chair'] },
  { id: 'BLANKET-COLD', label: 'Cold / Need Blanket', category: 'need', description: 'Severe chills or shivering / warm blanket request', iconName: 'CloudSnow', severityWeight: 3, synonyms: ['cold', 'blanket', 'shivering'] },
  { id: 'TRANSLATOR', label: 'Sign Language Interpreter', category: 'need', description: 'Certified ASL/ISL medical interpreter request', iconName: 'Languages', severityWeight: 6, synonyms: ['interpreter', 'translator', 'certified asl'] },
];

/**
 * Predefined Clinical Sequence Templates (Multi-Sign Combinations)
 */
export interface ClinicalSequencePattern {
  id: string;
  glosses: string[];
  canonicalNarrative: string;
  esiLevel: EsiLevel;
  painScale: number;
  chiefComplaint: string;
  urgencyPrompt: string;
}

export const CLINICAL_SEQUENCE_PATTERNS: ClinicalSequencePattern[] = [
  // Red Alert / Triage 1 & 2 (Life Threat / Emergent)
  {
    id: 'CHEST-PAIN-SUDDEN',
    glosses: ['PAIN', 'CHEST', 'SUDDEN'],
    canonicalNarrative: 'Patient reports sudden onset of acute chest pain right now.',
    esiLevel: 2,
    painScale: 9,
    chiefComplaint: 'Acute Chest Pain (Rule out Acute Coronary Syndrome)',
    urgencyPrompt: 'STAT ECG & Cardiac Triage Protocol',
  },
  {
    id: 'CHEST-PAIN-MORNING',
    glosses: ['PAIN', 'CHEST', 'MORNING'],
    canonicalNarrative: 'Patient reports acute chest pain that started this morning.',
    esiLevel: 2,
    painScale: 8,
    chiefComplaint: 'Acute Chest Pain (Onset Morning)',
    urgencyPrompt: 'STAT ECG & Cardiac Triage Protocol',
  },
  {
    id: 'BREATHE-DIFFICULT-NO-INHALER',
    glosses: ['BREATHE-DIFFICULT', 'SHARP', 'INHALER-MISSING'],
    canonicalNarrative: 'Severe acute shortness of breath; patient reports rescue inhaler is missing/unavailable.',
    esiLevel: 2,
    painScale: 8,
    chiefComplaint: 'Severe Dyspnea / Asthma Flare without Rescue Inhaler',
    urgencyPrompt: 'Immediate Nebulizer & Airway Assessment',
  },
  {
    id: 'BREATHE-DIFFICULT-SUDDEN',
    glosses: ['BREATHE-DIFFICULT', 'SUDDEN'],
    canonicalNarrative: 'Sudden respiratory distress; patient cannot catch breath.',
    esiLevel: 1,
    painScale: 9,
    chiefComplaint: 'Acute Respiratory Distress',
    urgencyPrompt: 'Immediate Resuscitation Room / O2 Support',
  },
  {
    id: 'ALLERGY-PENICILLIN-ALERT',
    glosses: ['ALLERGY-PENICILLIN'],
    canonicalNarrative: 'CRITICAL ALERT: Patient communicates severe penicillin allergy. Do not administer beta-lactams.',
    esiLevel: 2,
    painScale: 2,
    chiefComplaint: 'Penicillin Allergy Safety Flag',
    urgencyPrompt: 'Red Allergy Band & EMR Restriction',
  },
  {
    id: 'HEAD-SHARP-DIZZY',
    glosses: ['HEAD', 'SHARP', 'DIZZY'],
    canonicalNarrative: 'Patient reports sudden sharp severe headache accompanied by acute dizziness.',
    esiLevel: 2,
    painScale: 8,
    chiefComplaint: 'Severe Headache with Vertigo (Rule out CVA / Intracranial pathology)',
    urgencyPrompt: 'Neuro Triage & CT Head Protocol',
  },
  {
    id: 'POISON-BITE-SUDDEN',
    glosses: ['POISON-BITE', 'SUDDEN'],
    canonicalNarrative: 'EMERGENCY: Patient reports sudden toxic ingestion or venomous animal/insect bite.',
    esiLevel: 1,
    painScale: 9,
    chiefComplaint: 'Toxic Ingestion / Envenomation',
    urgencyPrompt: 'Immediate Toxicology / Antivenom Protocol',
  },
  {
    id: 'BLEEDING-ARM-SUDDEN',
    glosses: ['BLEEDING', 'ARM', 'SUDDEN'],
    canonicalNarrative: 'Patient has active acute hemorrhage on the arm/hand requiring pressure.',
    esiLevel: 2,
    painScale: 7,
    chiefComplaint: 'Acute Upper Extremity Laceration / Hemorrhage',
    urgencyPrompt: 'Direct Pressure, Tourniquet Evaluation & Wound Care',
  },
  // Triage 3 (Urgent)
  {
    id: 'ABDOMEN-PAIN-VOMIT',
    glosses: ['ABDOMEN', 'PAIN', 'VOMIT'],
    canonicalNarrative: 'Patient reports severe abdominal pain associated with repeated vomiting.',
    esiLevel: 3,
    painScale: 7,
    chiefComplaint: 'Acute Abdominal Pain with Emesis (Evaluate Appendicitis/Bowel Obstruction)',
    urgencyPrompt: 'IV Access, NPO, Surgical Triage',
  },
  {
    id: 'LEG-SWELLING-PAIN',
    glosses: ['LEG', 'SWELLING', 'PAIN'],
    canonicalNarrative: 'Patient reports unilateral leg pain with marked swelling.',
    esiLevel: 3,
    painScale: 6,
    chiefComplaint: 'Lower Extremity Pain and Edema (Evaluate DVT / Fracture)',
    urgencyPrompt: 'Venous Ultrasound / X-Ray Evaluation',
  },
  {
    id: 'FEVER-THROAT-DAYS',
    glosses: ['FEVER', 'THROAT', 'DAYS'],
    canonicalNarrative: 'Patient reports high fever and severe throat pain persisting for several days.',
    esiLevel: 3,
    painScale: 6,
    chiefComplaint: 'Febrile Pharyngitis / Peritonsillar Evaluation',
    urgencyPrompt: 'Strep Swab, Airway Patency, Antipyretics',
  },
  // Triage 4 (Less Urgent)
  {
    id: 'SKIN-BURNING-DAYS',
    glosses: ['SKIN', 'BURNING', 'DAYS'],
    canonicalNarrative: 'Patient presents with a localized burning skin rash lasting several days.',
    esiLevel: 4,
    painScale: 4,
    chiefComplaint: 'Localized Dermatitis / Skin Rash',
    urgencyPrompt: 'Minor Treatment Room Evaluation',
  },
  {
    id: 'TOOTH-PAIN-DAYS',
    glosses: ['TOOTH', 'PAIN', 'DAYS'],
    canonicalNarrative: 'Patient reports throbbing dental tooth pain ongoing for multiple days.',
    esiLevel: 4,
    painScale: 5,
    chiefComplaint: 'Dental Odontalgia / Toothache',
    urgencyPrompt: 'Analgesia & Dental Referral',
  },
  // Triage 5 (Non-urgent / Routine)
  {
    id: 'CHRONIC-BACK-PAIN',
    glosses: ['BACK', 'PAIN', 'CHRONIC'],
    canonicalNarrative: 'Patient reports chronic, ongoing back pain without sudden worsening.',
    esiLevel: 5,
    painScale: 3,
    chiefComplaint: 'Chronic Lumbago / Musculoskeletal Back Pain',
    urgencyPrompt: 'Fast-Track / Outpatient Physical Therapy Referral',
  },
  // Urgent Requests
  {
    id: 'WHEELCHAIR-NEED',
    glosses: ['WHEELCHAIR', 'NEED-THIS'],
    canonicalNarrative: 'Patient is unable to bear weight and urgently requests wheelchair transport.',
    esiLevel: 3,
    painScale: 5,
    chiefComplaint: 'Mobility Impairment / Wheelchair Request',
    urgencyPrompt: 'Dispatch Triage Wheelchair Immediately',
  },
];

/**
 * Calculates Emergency Severity Index (ESI) based on clinical concepts and pain level.
 */
export function calculateEsiLevel(
  locations: string[],
  symptoms: string[],
  alerts: string[],
  painScale: number,
  isSudden: boolean,
  isChronic = false
): EsiTriageAssessment {
  // If chronic minor issue with low pain and no alerts, classify as ESI-5
  if (isChronic && painScale <= 4 && alerts.length === 0 && !symptoms.includes('BREATHE-DIFFICULT') && !symptoms.includes('BLEEDING')) {
    return {
      level: 5,
      title: 'ESI-5: Non-Urgent (Routine)',
      badgeColor: 'bg-blue-600 text-white border-blue-500',
      acuityDescription: 'No acute diagnostic resources expected; clinical evaluation and prescription refill only.',
      targetResponseTimeMinutes: 120,
      expectedResources: ['Clinical Exam Only'],
    };
  }
  // ESI Level 1: Immediate Resuscitation / Severe Life Threat
  if (
    symptoms.includes('BREATHE-DIFFICULT') && isSudden ||
    alerts.includes('POISON-BITE') ||
    (symptoms.includes('DIZZY') && alerts.includes('SEIZURE'))
  ) {
    return {
      level: 1,
      title: 'ESI-1: Resuscitation (Immediate)',
      badgeColor: 'bg-red-600 text-white border-red-500 animate-pulse',
      acuityDescription: 'Immediate life-saving intervention required. Physician at bedside STAT.',
      targetResponseTimeMinutes: 0,
      expectedResources: ['Intubation/Airway', 'IV/IO Access', 'Continuous Monitoring', 'STAT Labs/Toxicology'],
    };
  }

  // ESI Level 2: Emergent / High Risk / Severe Pain
  if (
    locations.includes('CHEST') && symptoms.includes('PAIN') ||
    symptoms.includes('BREATHE-DIFFICULT') ||
    alerts.includes('INHALER-MISSING') ||
    symptoms.includes('BLEEDING') ||
    (locations.includes('HEAD') && symptoms.includes('SHARP') && symptoms.includes('DIZZY')) ||
    alerts.includes('ALLERGY-PENICILLIN') ||
    alerts.includes('ALLERGY-FOOD') ||
    painScale >= 8
  ) {
    return {
      level: 2,
      title: 'ESI-2: Emergent (High Risk)',
      badgeColor: 'bg-rose-600 text-white border-rose-500 shadow-rose-900/50',
      acuityDescription: 'High risk situation, confused/lethargic/disoriented, or severe pain/distress.',
      targetResponseTimeMinutes: 10,
      expectedResources: ['STAT ECG', 'Cardiac Enzymes', 'IV Access', 'Supplemental Oxygen', 'Urgent CT Scan'],
    };
  }

  // ESI Level 3: Urgent (2 or more resources needed, stable vitals)
  if (
    locations.includes('ABDOMEN') ||
    locations.includes('THROAT') && symptoms.includes('FEVER') ||
    locations.includes('LEG') && symptoms.includes('SWELLING') ||
    symptoms.includes('VOMIT') ||
    painScale >= 5 ||
    alerts.includes('PREGNANCY') ||
    alerts.includes('DIABETIC')
  ) {
    return {
      level: 3,
      title: 'ESI-3: Urgent (Multiple Resources)',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold border-amber-400',
      acuityDescription: 'Stable vitals, but requires 2+ diagnostic resources (Labs + Imaging or IV meds).',
      targetResponseTimeMinutes: 30,
      expectedResources: ['Blood/Urine Labs', 'X-Ray or Ultrasound', 'IV Fluids/Meds'],
    };
  }

  // ESI Level 4: Less Urgent (1 resource needed)
  if (
    locations.includes('SKIN') ||
    locations.includes('TOOTH') ||
    locations.includes('ARM') ||
    symptoms.includes('BURNING') ||
    painScale >= 2
  ) {
    return {
      level: 4,
      title: 'ESI-4: Less Urgent (Single Resource)',
      badgeColor: 'bg-emerald-600 text-white border-emerald-500',
      acuityDescription: 'Stable patient requiring one simple resource (e.g. single X-ray, prescription, or suture).',
      targetResponseTimeMinutes: 60,
      expectedResources: ['Single X-Ray', 'Simple Wound Suture', 'Oral Meds'],
    };
  }

  // ESI Level 5: Non-Urgent (0 resources needed)
  return {
    level: 5,
    title: 'ESI-5: Non-Urgent (Routine)',
    badgeColor: 'bg-blue-600 text-white border-blue-500',
    acuityDescription: 'No diagnostic resources expected; clinical evaluation and prescription refill only.',
    targetResponseTimeMinutes: 120,
    expectedResources: ['Clinical Exam Only'],
  };
}

/**
 * Maps a sequence of recognized gloss tokens to a structured clinical statement.
 */
export function parseGlossSequenceToClinicalStatement(
  sequence: string[],
  baseConfidence = 0.88
): ClinicalTriageStatement {
  const normSeq = sequence.map((s) => s.toUpperCase().trim()).filter(Boolean);

  // 1. First, check against predefined clinical sequence patterns
  for (const pat of CLINICAL_SEQUENCE_PATTERNS) {
    const allPresent = pat.glosses.every((g) => normSeq.includes(g));
    if (allPresent) {
      const esiAssessment = calculateEsiLevel(
        pat.glosses.filter((g) => ['HEAD', 'CHEST', 'ABDOMEN', 'ARM', 'LEG', 'THROAT', 'EYE', 'BACK', 'SKIN', 'TOOTH'].includes(g)),
        pat.glosses.filter((g) => ['PAIN', 'BURNING', 'SHARP', 'BLEEDING', 'DIZZY', 'VOMIT', 'BREATHE-DIFFICULT', 'FEVER', 'NUMB', 'SWELLING'].includes(g)),
        pat.glosses.filter((g) => g.startsWith('ALLERGY') || ['PREGNANCY', 'DIABETIC', 'HEART-PROBLEM', 'HYPERTENSION', 'SEIZURE', 'INHALER-MISSING', 'POISON-BITE', 'FALL-INJURY', 'INFECTION', 'FAINTING'].includes(g)),
        pat.painScale,
        pat.glosses.includes('SUDDEN'),
        pat.glosses.includes('CHRONIC') || pat.esiLevel === 5
      );

      return {
        chiefComplaint: pat.chiefComplaint,
        location: pat.glosses.find((g) => ['HEAD', 'CHEST', 'ABDOMEN', 'ARM', 'LEG', 'THROAT', 'EYE', 'BACK', 'SKIN', 'TOOTH'].includes(g)) ?? 'General',
        symptoms: pat.glosses.filter((g) => ['PAIN', 'BURNING', 'SHARP', 'BLEEDING', 'DIZZY', 'VOMIT', 'BREATHE-DIFFICULT', 'FEVER', 'NUMB', 'SWELLING'].includes(g)),
        duration: pat.glosses.find((g) => ['SUDDEN', 'MORNING', 'YESTERDAY', 'DAYS', 'WEEK', 'CHRONIC'].includes(g)) ?? 'Recent',
        painScaleEstimated: pat.painScale,
        alerts: pat.glosses.filter((g) => g.startsWith('ALLERGY') || ['PREGNANCY', 'DIABETIC', 'HEART-PROBLEM', 'HYPERTENSION', 'SEIZURE', 'INHALER-MISSING', 'POISON-BITE'].includes(g)),
        needs: pat.glosses.filter((g) => ['NEED-THIS', 'HELP-FAST', 'WATER', 'BATHROOM', 'WHEELCHAIR', 'FAMILY-CALL'].includes(g)),
        narrativeSpeech: pat.canonicalNarrative,
        esi: esiAssessment,
        confidence: baseConfidence,
      };
    }
  }

  // 2. Dynamic multi-token synthesis from identified concepts
  const locations: string[] = [];
  const symptoms: string[] = [];
  const durations: string[] = [];
  const alerts: string[] = [];
  const needs: string[] = [];

  for (const token of normSeq) {
    const concept = ER_50_CONCEPTS.find((c) => c.id === token);
    if (!concept) continue;

    if (concept.category === 'anatomy') locations.push(concept.id);
    else if (concept.category === 'symptom') symptoms.push(concept.id);
    else if (concept.category === 'temporal') durations.push(concept.id);
    else if (concept.category === 'alert') alerts.push(concept.id);
    else if (concept.category === 'need') needs.push(concept.id);
  }

  // Estimate pain scale
  let estimatedPain = 5;
  if (symptoms.includes('SHARP') || symptoms.includes('BREATHE-DIFFICULT')) estimatedPain = 8;
  else if (symptoms.includes('PAIN') && symptoms.includes('BLEEDING')) estimatedPain = 8;
  else if (symptoms.includes('PAIN')) estimatedPain = 6;
  else if (symptoms.includes('BURNING')) estimatedPain = 5;
  else if (symptoms.length === 0 && alerts.length > 0) estimatedPain = 1;

  const isSudden = durations.includes('SUDDEN');
  const primaryLoc = locations[0] ?? 'General / Non-localized';
  const primarySym = symptoms[0] ?? (alerts[0] ? 'Alert Condition' : 'Discomfort');

  // Build clinical narrative
  let narrative = `Patient communicates ${primarySym.toLowerCase()} in ${primaryLoc.toLowerCase()}.`;
  if (durations.length > 0) {
    const durLabel = durations[0].toLowerCase();
    narrative += ` Onset: ${durLabel}.`;
  }
  if (alerts.length > 0) {
    narrative += ` Alerts noted: ${alerts.join(', ')}.`;
  }
  if (needs.length > 0) {
    narrative += ` Patient requests: ${needs.join(', ')}.`;
  }

  const isChronic = durations.includes('CHRONIC');
  const esi = calculateEsiLevel(locations, symptoms, alerts, estimatedPain, isSudden, isChronic);

  return {
    chiefComplaint: `${primaryLoc} ${primarySym}`,
    location: primaryLoc,
    symptoms,
    duration: durations[0] ?? 'Unknown',
    painScaleEstimated: estimatedPain,
    alerts,
    needs,
    narrativeSpeech: narrative,
    esi,
    confidence: baseConfidence,
  };
}

/**
 * Universal Visual Action Cards for Staff-to-Patient Communication
 */
export interface VisualActionCard {
  id: string;
  title: string;
  subtitle: string;
  category: 'immediate' | 'diagnostic' | 'location' | 'restriction';
  colorTheme: 'red' | 'amber' | 'emerald' | 'cyan' | 'indigo';
  iconName: string;
  symbolUrl?: string;
  avatarSignGloss?: string;
}

export const VISUAL_ACTION_CARDS: VisualActionCard[] = [
  {
    id: 'WHEELCHAIR_SEAT',
    title: 'Sit in Wheelchair',
    subtitle: 'Please sit in the transport wheelchair now',
    category: 'immediate',
    colorTheme: 'red',
    iconName: 'Accessibility',
    avatarSignGloss: 'WHEELCHAIR',
  },
  {
    id: 'WAIT_CHAIR',
    title: 'Take a Seat Here',
    subtitle: 'Please wait in the triage area chair',
    category: 'location',
    colorTheme: 'cyan',
    iconName: 'Armchair',
    avatarSignGloss: 'WAIT',
  },
  {
    id: 'BLOOD_SAMPLE',
    title: 'Blood Test Sample',
    subtitle: 'Nurse will collect a small blood tube from your arm',
    category: 'diagnostic',
    colorTheme: 'amber',
    iconName: 'Syringe',
    avatarSignGloss: 'MEDICINE',
  },
  {
    id: 'TRIAGE_ROOM_1',
    title: 'Go to Triage Room 1',
    subtitle: 'Follow green arrows to Triage Room 1',
    category: 'location',
    colorTheme: 'emerald',
    iconName: 'DoorOpen',
    avatarSignGloss: 'HOSPITAL',
  },
  {
    id: 'DOCTOR_ROOM_2',
    title: 'Doctor Examination Room 2',
    subtitle: 'Doctor is waiting in Room 2',
    category: 'location',
    colorTheme: 'indigo',
    iconName: 'UserCheck',
    avatarSignGloss: 'DOCTOR',
  },
  {
    id: 'ECG_MONITOR',
    title: 'Heart Monitor (ECG)',
    subtitle: 'Placing heart stickers on chest to check rhythm',
    category: 'diagnostic',
    colorTheme: 'red',
    iconName: 'HeartPulse',
    avatarSignGloss: 'HEART-PROBLEM',
  },
  {
    id: 'XRAY_SCAN',
    title: 'X-Ray Imaging',
    subtitle: 'Picture of your bone/joint in X-ray room',
    category: 'diagnostic',
    colorTheme: 'cyan',
    iconName: 'ScanLine',
    avatarSignGloss: 'SEE',
  },
  {
    id: 'NO_FOOD_WATER',
    title: 'Do Not Eat or Drink',
    subtitle: 'Keep stomach empty until doctor examination',
    category: 'restriction',
    colorTheme: 'amber',
    iconName: 'Ban',
    avatarSignGloss: 'FOOD',
  },
  {
    id: 'MEDICATION_GIVEN',
    title: 'Pain Relief Medication',
    subtitle: 'Nurse is preparing fast-acting medication for you',
    category: 'immediate',
    colorTheme: 'emerald',
    iconName: 'Pill',
    avatarSignGloss: 'MEDICINE',
  },
];

/**
 * Parses spoken or typed nurse instructions into universal visual action cards.
 */
export function parseStaffSpeechToVisualCards(speechText: string): VisualActionCard[] {
  const text = speechText.toLowerCase();
  const matchedCards: VisualActionCard[] = [];

  const addCard = (id: string) => {
    const card = VISUAL_ACTION_CARDS.find((c) => c.id === id);
    if (card && !matchedCards.some((m) => m.id === id)) {
      matchedCards.push(card);
    }
  };

  // Keyword pattern matching for staff instructions
  if (text.includes('wheelchair') || text.includes('chair') || text.includes('sit')) {
    if (text.includes('wheelchair')) addCard('WHEELCHAIR_SEAT');
    else addCard('WAIT_CHAIR');
  }

  if (text.includes('blood') || text.includes('sample') || text.includes('lab') || text.includes('syringe') || text.includes('iv')) {
    addCard('BLOOD_SAMPLE');
  }

  if (text.includes('room 1') || text.includes('triage room')) {
    addCard('TRIAGE_ROOM_1');
  }

  if (text.includes('room 2') || text.includes('doctor room') || text.includes('physician') || text.includes('doctor')) {
    addCard('DOCTOR_ROOM_2');
  }

  if (text.includes('ecg') || text.includes('ekg') || text.includes('heart monitor') || text.includes('stickers on chest')) {
    addCard('ECG_MONITOR');
  }

  if (text.includes('x-ray') || text.includes('xray') || text.includes('scan') || text.includes('imaging') || text.includes('ct')) {
    addCard('XRAY_SCAN');
  }

  if (text.includes('do not eat') || text.includes('no food') || text.includes('empty stomach') || text.includes('npo') || text.includes('do not drink')) {
    addCard('NO_FOOD_WATER');
  }

  if (text.includes('pain medicine') || text.includes('medication') || text.includes('pill') || text.includes('injection') || text.includes('relief')) {
    addCard('MEDICATION_GIVEN');
  }

  // Fallback default: If nothing matched, provide general wait card
  if (matchedCards.length === 0) {
    addCard('WAIT_CHAIR');
  }

  return matchedCards;
}
