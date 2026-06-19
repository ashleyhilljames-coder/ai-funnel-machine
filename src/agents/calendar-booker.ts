import { google } from 'googleapis';
import { z } from 'zod';
import { config } from '../config.js';
import type { Lead } from '../lead.js';

export const BookingResultSchema = z.object({
  booked: z.boolean(),
  eventId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  message: z.string(),
});

export type BookingResult = z.infer<typeof BookingResultSchema>;

const DISCOVERY_CALL_DURATION_MINUTES = 45;

async function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  const authClient = await auth.getClient();
  return google.calendar({ version: 'v3', auth: authClient as Parameters<typeof google.calendar>[0]['auth'] });
}

export async function CalendarBooker(lead: Lead): Promise<BookingResult> {
  const calendar = await getCalendarClient();

  const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + DISCOVERY_CALL_DURATION_MINUTES * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: config.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: `📞 Discovery Call — ${lead.firstName} ${lead.lastName} [${lead.company ?? 'Individual'}]`,
      description: `Lead source: ${lead.source}\nFunnel step: ${lead.funnelStep}\nCompany: ${lead.company ?? 'N/A'}\nLead email: ${lead.email}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    },
  });

  const eventId = event.data.id ?? undefined;
  const scheduledAt = event.data.start?.dateTime ?? undefined;

  return {
    booked: true,
    eventId,
    scheduledAt,
    message: `Discovery call scheduled for ${lead.firstName} ${lead.lastName} at ${scheduledAt}`,
  };
}
