import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { LeadGuard } from '../outbound/leadGuard.js';

const SPREADSHEET_ID = '1e3vWqRk0n3CifXb5lY0J-Uv5tQ7R5z3gK5-qL4M7J5k'; // Same as sheetsService
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'ashley.hilljames@gmail.com';
const SKIP_CALENDAR_BOOKING = process.env.SKIP_CALENDAR_BOOKING === 'true';

async function getCalendarClient() {
  const keyPath = path.join(process.cwd(), 'gcp-key.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error('gcp-key.json missing');
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  const authClient = await auth.getClient();
  return google.calendar({ version: 'v3', auth: authClient as any });
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generates slots for the next 3 business days.
 * Business hours: 9 AM to 5 PM (Hourly slots starting on the hour).
 */
export async function getAvailableSlots(clientId?: string): Promise<string[]> {
  const slots: string[] = [];
  const startHours = [9, 10, 11, 13, 14, 15, 16]; // 9am, 10am, 11am, 1pm, 2pm, 3pm, 4pm
  
  // Generate candidate dates for the next 3 business days starting tomorrow
  const candidates: Date[] = [];
  let current = new Date();
  
  while (candidates.length < 3) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Saturday & Sunday
      candidates.push(new Date(current));
    }
  }

  // Generate all candidate slots
  const slotObjects: { display: string; start: Date; end: Date }[] = [];
  for (const date of candidates) {
    for (const hour of startHours) {
      const start = new Date(date);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + 30); // 30-min appt duration

      const weekday = WEEKDAYS[start.getDay()];
      const month = MONTHS_SHORT[start.getMonth()];
      const day = start.getDate();
      const displayHour = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      
      const displayStr = `${weekday}, ${month} ${day} at ${displayHour}:00 ${ampm}`;
      slotObjects.push({ display: displayStr, start, end });
    }
  }

  // If calendar booking is skipped or credentials don't exist, return candidate list directly
  const keyPath = path.join(process.cwd(), 'gcp-key.json');
  if (SKIP_CALENDAR_BOOKING || !fs.existsSync(keyPath)) {
    console.log('ℹ️ [Calendar Service] Simulation fallback: Returning mock schedule slots.');
    return slotObjects.slice(0, 5).map(s => s.display); // Limit to top 5 available slots
  }

  let calendarId = CALENDAR_ID;
  if (clientId) {
    try {
      const leadGuard = new LeadGuard();
      const settings = leadGuard.getClientSettings(clientId);
      if (settings && settings.googleCalendarId) {
        calendarId = settings.googleCalendarId;
      }
    } catch (e) {
      console.error('⚠️ [Calendar Service] Failed to fetch client calendar settings:', e);
    }
  }

  try {
    const calendar = await getCalendarClient();
    const minTime = slotObjects[0].start.toISOString();
    const maxTime = slotObjects[slotObjects.length - 1].end.toISOString();

    // Query calendar for occupied slots
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: minTime,
      timeMax: maxTime,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Filter out candidate slots that overlap with events
    const freeSlots = slotObjects.filter(slot => {
      return !events.some(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
        // Check overlap: slot starts before event ends, and slot ends after event starts
        return slot.start < eventEnd && slot.end > eventStart;
      });
    });

    return freeSlots.slice(0, 5).map(s => s.display);
  } catch (err: any) {
    console.error('⚠️ [Calendar Service] Failed to list events, falling back to simulation:', err.message);
    return slotObjects.slice(0, 5).map(s => s.display);
  }
}

/**
 * Parses the custom slot string back into an ISO Start & End date.
 */
function parseSlotToDates(slotStr: string): { start: Date; end: Date } {
  const regex = /([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)/i;
  const match = slotStr.match(regex);

  if (!match) {
    throw new Error(`Invalid slot string format: "${slotStr}"`);
  }

  const [, , monthStr, dayStr, hourStr, minStr, ampm] = match;
  
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const month = monthMap[monthStr.toLowerCase().substring(0, 3)];
  const day = parseInt(dayStr, 10);
  
  let hour = parseInt(hourStr, 10);
  if (ampm.toUpperCase() === 'PM' && hour < 12) {
    hour += 12;
  } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }
  const minute = parseInt(minStr, 10);

  const start = new Date();
  start.setMonth(month, day);
  start.setHours(hour, minute, 0, 0);

  if (start.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    start.setFullYear(start.getFullYear() + 1);
  }

  const end = new Date(start);
  end.setMinutes(start.getMinutes() + 30);

  return { start, end };
}

/**
 * Books an emergency dispatch slot on Google Calendar.
 */
export async function bookDispatch(
  clientId: string,
  slotStr: string,
  leadDetails: { name: string; phone: string; email: string; address: string; damageType: string; clientName?: string }
): Promise<{ success: boolean; message: string; eventId?: string }> {
  let dates;
  try {
    dates = parseSlotToDates(slotStr);
  } catch (err: any) {
    console.error('❌ Failed to parse slot:', err.message);
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    dates = { start, end };
  }

  const clientName = leadDetails.clientName || 'Syncro Scale Restoration';
  const eventTitle = `🚨 ${clientName} Dispatch: ${leadDetails.name} - ${leadDetails.damageType}`;
  const eventDescription = `
🚒 EMERGENCY SERVICE MITIGATION DISPATCH
-------------------------------------------
👤 Customer Name: ${leadDetails.name}
📞 Contact Phone: ${leadDetails.phone}
✉️ Email Address: ${leadDetails.email}
📍 Property Address: ${leadDetails.address}
💥 Damage Type: ${leadDetails.damageType}

Ingested via ${clientName} Voice Intake Receptionist.
  `.trim();

  let calendarId = CALENDAR_ID;
  if (clientId) {
    try {
      const leadGuard = new LeadGuard();
      const settings = leadGuard.getClientSettings(clientId);
      if (settings && settings.googleCalendarId) {
        calendarId = settings.googleCalendarId;
      }
    } catch (e) {
      console.error('⚠️ [Calendar Service] Failed to fetch client calendar settings for booking:', e);
    }
  }

  const keyPath = path.join(process.cwd(), 'gcp-key.json');
  if (SKIP_CALENDAR_BOOKING || !fs.existsSync(keyPath)) {
    console.log(`\n📅 [Calendar Simulation Mode] Booked Event: "${eventTitle}"`);
    console.log(`⏰ Time: ${dates.start.toLocaleString()} - ${dates.end.toLocaleString()}`);
    return {
      success: true,
      message: `Emergency dispatch slot scheduled successfully for ${dates.start.toLocaleString()} (Simulation Mode).`,
      eventId: `mock_event_${Math.random().toString(36).substring(2, 10)}`
    };
  }

  try {
    const calendar = await getCalendarClient();
    const event = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: eventTitle,
        description: eventDescription,
        start: { dateTime: dates.start.toISOString() },
        end: { dateTime: dates.end.toISOString() },
      },
    });

    console.log(`✅ [Google Calendar] Successfully booked event! ID: ${event.data.id}`);
    return {
      success: true,
      message: `Emergency dispatch slot scheduled successfully for ${dates.start.toLocaleString()}.`,
      eventId: event.data.id || undefined
    };
  } catch (err: any) {
    console.error('❌ [Google Calendar] API insert failed:', err.message);
    return {
      success: false,
      message: `Failed to insert calendar event: ${err.message}`
    };
  }
}
