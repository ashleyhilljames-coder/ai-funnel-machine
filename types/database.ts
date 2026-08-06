export type PartnerTier = 'Founding' | 'Standard';
export type LeadStatus = 'DISPATCHED' | 'ON_SITE' | 'SIGNED' | 'UNQUALIFIED';

export interface Plumber {
  id: string;
  company_name: string;
  contact_name: string;
  phone_number: string;
  email: string | null;
  tier: PartnerTier;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  plumber_id: string;
  homeowner_name: string;
  homeowner_phone: string;
  notes: string | null;
  status: LeadStatus;
  payout_amount: number;
  payout_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  plumber?: Plumber; // Included when performing relational queries joining plumbers to leads
}