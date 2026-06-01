import type { Lead } from './lead.js';
import { config } from './config.js';
import { QualifierAgent, type QualificationResult } from './agents/qualifier.js';
import { EvaluatorAgent, type EvaluationResult } from './agents/evaluator.js';
import { CalendarBooker, type BookingResult } from './agents/calendar-booker.js';

export type ProcessorResult = {
  lead: Lead;
  qualification: QualificationResult;
  evaluation?: EvaluationResult;
  booking?: BookingResult;
  outcome: 'booked' | 'disqualified' | 'poor-brand-fit' | 'booking-skipped';
};

export async function processLead(lead: Lead): Promise<ProcessorResult> {
  // Step 1: Qualify the lead
  const qualification = await QualifierAgent(lead);
  console.log(`[Processor] Qualification — score=${qualification.score} qualified=${qualification.qualified}`);

  if (!qualification.qualified) {
    return { lead, qualification, outcome: 'disqualified' };
  }

  // Step 2: Evaluate brand fit
  const evaluation = await EvaluatorAgent(lead, qualification);
  console.log(`[Processor] Evaluation — brandFit=${evaluation.brandFit} confidence=${evaluation.confidence}`);

  if (!evaluation.brandFit) {
    return { lead, qualification, evaluation, outcome: 'poor-brand-fit' };
  }

  // Step 3: Book a calendar slot
  if (config.SKIP_CALENDAR_BOOKING) {
    console.log('[Processor] Booking skipped (SKIP_CALENDAR_BOOKING=true)');
    return { lead, qualification, evaluation, outcome: 'booking-skipped' };
  }

  const booking = await CalendarBooker(lead);
  console.log(`[Processor] Booking — booked=${booking.booked} eventId=${booking.eventId}`);

  return { lead, qualification, evaluation, booking, outcome: 'booked' };
}
