export interface PatientProfile {
  uhid: string;
  name: string;
  age: number;
  gender: string;
  language: string;
  admissionTime: string;
  flags: string[];
  allergies: string[];
  diagnosis: string;
  attendingPhysician: string;
}

export type BedAcuity = 'stable' | 'assistance' | 'emergency' | 'vacant';

export interface VisualActionResponse {
  id: string;
  actionType: 'nurse_en_route' | 'doctor_notified' | 'remain_in_bed' | 'water_coming' | 'custom';
  title: string;
  subtitle: string;
  icon: string;
  timerSeconds: number;
  remainingSeconds: number;
  signGlossTag: string;
  dispatchedAt: string;
  staffName: string;
}

export interface TelemetryAlert {
  id: string;
  bedId: string;
  timestamp: string;
  intent: string;
  clinicalStatement: string;
  sequenceTokens: string[];
  confidence: number; // 0.0 - 1.0
  esiLevel: 1 | 2 | 3 | 4 | 5;
  status: 'active' | 'acknowledged' | 'dispatched' | 'resolved';
  dispatchAction?: VisualActionResponse;
  source: 'sign_camera' | 'aac_chip' | 'panic_button' | 'textpad';
}

export interface BedData {
  bedId: string;
  bedNumber: number;
  roomName: string;
  occupied: boolean;
  patient?: PatientProfile;
  acuity: BedAcuity;
  vitals: {
    hr: number;
    bp: string;
    spo2: number;
    resp: number;
    lastUpdated: string;
  };
  activeAlert?: TelemetryAlert;
}

export type TelemetryMessageType =
  | 'PATIENT_BIND'
  | 'PATIENT_UNBIND'
  | 'PATIENT_ALERT'
  | 'STAFF_DISPATCH'
  | 'CLEAR_ALERT'
  | 'SYNC_REQUEST'
  | 'SYNC_STATE';

export interface TelemetryMessage {
  type: TelemetryMessageType;
  bedId: string;
  payload?: any;
  timestamp: number;
}
