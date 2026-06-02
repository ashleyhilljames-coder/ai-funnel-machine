export interface Prospect {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  status: 'cold' | 'contacted' | 'replied' | 'qualified' | 'nurturing' | 'bad_fit';
  outboundSequenceStage: number;
  lastContactedAt?: Date;
  notes?: string;
}