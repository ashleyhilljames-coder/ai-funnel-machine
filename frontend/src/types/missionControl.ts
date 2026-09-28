export type MissionJobStage = 'NEW_INTAKE' | 'DISPATCHED' | 'ON_SITE' | 'DRYING' | 'SCOPING' | 'BILLED' | 'CLOSED';

export type LossPhotoCategory = 'INITIAL_DAMAGE' | 'EQUIPMENT_SETUP' | 'POST_DRYING';

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID';

export type ReferralType = 'PLUMBER' | 'AGENT' | 'PARTNER';

export interface MissionJob {
  id: string;
  homeowner_name: string;
  homeowner_phone: string;
  email: string;
  address: string;
  damage_type: string;
  water_source: string;
  affected_rooms: string;
  stage: MissionJobStage;
  assigned_tech_name: string;
  assigned_tech_phone: string;
  locked_by_tech: string | null;
  referral_source: string;
  referral_type?: ReferralType | string;
  referral_fee: number;
  payout_status: PayoutStatus | string;
  call_transcript: string;
  signature_data?: string | null;
  notes: string;
  created_at: string;
  updated_at?: string;
}

export interface MoistureReading {
  id: string;
  job_id: string;
  room_name: string;
  ambient_temp_f: number;
  relative_humidity_pct: number;
  wood_moisture_pct: number;
  drywall_moisture_pct: number;
  air_movers_count: number;
  dehumidifiers_count: number;
  tech_notes: string;
  timestamp: string;
}

export interface EquipmentLog {
  id: string;
  job_id: string;
  equipment_name: string;
  serial_no: string;
  room_name: string;
  status: 'ACTIVE' | 'REMOVED';
  placed_at: string;
  removed_at?: string | null;
}

export interface LossPhoto {
  id: string;
  job_id: string;
  photo_url: string;
  caption: string;
  category: LossPhotoCategory;
  synced_cloud_url?: string;
  timestamp: string;
}

export interface ReferralPayout {
  id: string;
  job_id: string;
  partner_name: string;
  partner_type: string;
  referral_fee: number;
  payout_status: PayoutStatus;
  paid_at?: string | null;
  transaction_ref?: string | null;
  created_at: string;
}

export interface JobDetailsResponse {
  success: boolean;
  job: MissionJob;
  moistureReadings: MoistureReading[];
  equipment: EquipmentLog[];
  photos: LossPhoto[];
  error?: string;
}
