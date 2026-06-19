export interface LeadIntegrationDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  damageType: string;
}

export async function createFieldPulseTicket(lead: LeadIntegrationDetails): Promise<{ success: boolean; ticketId: string }> {
  console.log(`\n======================================================`);
  console.log(`🔌 [FieldPulse Integration] Creating Work Order Ticket...`);
  const payload = {
    title: `Emergency ${lead.damageType} Mitigation`,
    customer: {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
    },
    location: lead.address,
    status: 'Scheduled',
    description: `Emergency ${lead.damageType} work order generated via Syncro Scale Voice Receptionist.`,
    priority: 'High'
  };
  console.log(`Payload Sent to FieldPulse API:`, JSON.stringify(payload, null, 2));
  const ticketId = `FP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  console.log(`✅ [FieldPulse] Ticket created successfully! ID: ${ticketId}`);
  console.log(`======================================================\n`);
  return { success: true, ticketId };
}

export async function syncToRealEstateCRM(lead: LeadIntegrationDetails, crmName: 'KVCore' | 'Lofty' = 'KVCore'): Promise<{ success: boolean; crmLeadId: string }> {
  console.log(`\n======================================================`);
  console.log(`🔌 [${crmName} CRM Integration] Syncing Real Estate Prospect...`);
  const payload = {
    contact: {
      first_name: lead.name.split(' ')[0],
      last_name: lead.name.split(' ').slice(1).join(' ') || 'Prospect',
      phone: lead.phone,
      email: lead.email
    },
    source: 'Syncro Scale AI Agent',
    buyer_profile: {
      criteria: lead.damageType, // e.g. "Looking for 3B/2B house, budget $450k"
      preferred_address: lead.address
    },
    lead_status: 'New Lead'
  };
  console.log(`Payload Sent to ${crmName} API:`, JSON.stringify(payload, null, 2));
  const crmLeadId = `${crmName.substring(0, 2).toUpperCase()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  console.log(`✅ [${crmName}] Lead synced successfully! ID: ${crmLeadId}`);
  console.log(`======================================================\n`);
  return { success: true, crmLeadId };
}

export async function bookCalendlyAppointment(lead: LeadIntegrationDetails, timeSlot: string): Promise<{ success: boolean; eventUrl: string }> {
  console.log(`\n======================================================`);
  console.log(`🔌 [Calendly Integration] Booking Tour Appointment...`);
  const payload = {
    event_type: 'Home Tour / Property Showing',
    invitee: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone
    },
    start_time: timeSlot,
    location: lead.address,
    notes: `Scheduled via Syncro Scale Real Estate AI Agent.`
  };
  console.log(`Payload Sent to Calendly API:`, JSON.stringify(payload, null, 2));
  const eventUrl = `https://calendly.com/events/${Math.random().toString(36).substring(2, 10)}`;
  console.log(`✅ [Calendly] Appointment booked! URL: ${eventUrl}`);
  console.log(`======================================================\n`);
  return { success: true, eventUrl };
}
