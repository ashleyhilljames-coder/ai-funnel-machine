import { LeadGuard } from '../outbound/leadGuard';

export interface CallRecord {
  conversationId: string;
  callerPhone?: string;
  callDuration: number;
  summary: string;
  transcript: Array<{ role: string; message: string }>;
  status: 'pending' | 'dispatched' | 'completed';
  createdAt: string;
}

const guard = new LeadGuard();

export async function saveCallRecord(record: CallRecord): Promise<void> {
  console.log(`[DB Service] Storing record for conversation: ${record.conversationId}`);

  try {
    const clientId = 'default_client';
    guard.createCallLog(record.conversationId, 'telephony', clientId);
    
    const transcriptString = record.transcript.map(t => `[${t.role}]: ${t.message}`).join('\n');
    
    guard.updateCallLog(record.conversationId, {
      callerPhone: record.callerPhone || 'Unknown',
      durationSeconds: record.callDuration,
      transcript: transcriptString,
      agentActivity: record.summary,
      actionTaken: record.status,
    });
    console.log('[SQLite Ledger] Inserted lead into call_logs');
  } catch (err) {
    console.error('[SQLite Ledger Error] Failed to write call log:', err);
  }
}