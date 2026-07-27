import fs from 'fs';
import path from 'path';

export interface CallRecord {
  conversationId: string;
  callerPhone?: string;
  callDuration: number;
  summary: string;
  transcript: Array<{ role: string; message: string }>;
  status: 'pending' | 'dispatched' | 'completed';
  createdAt: string;
}

const CSV_FILE_PATH = path.join(process.cwd(), 'mitigation_leads.csv');

// Helper to escape CSV values safely
function formatCsvField(field: string): string {
  const sanitized = field.replace(/"/g, '""');
  return `"${sanitized}"`;
}

export async function saveCallRecord(record: CallRecord): Promise<void> {
  console.log(`[DB Service] Storing record for conversation: ${record.conversationId}`);

  // 1. Write to local CSV ledger (mitigation_leads.csv)
  try {
    const fileExists = fs.existsSync(CSV_FILE_PATH);
    const csvHeader = 'Timestamp,ConversationID,CallerPhone,Duration,Status,Summary\n';
    
    const row = [
      record.createdAt,
      record.conversationId,
      record.callerPhone || 'Unknown',
      `${record.callDuration}s`,
      record.status,
      record.summary.replace(/\r?\n|\r/g, ' ')
    ].map(formatCsvField).join(',') + '\n';

    if (!fileExists) {
      fs.writeFileSync(CSV_FILE_PATH, csvHeader + row, 'utf8');
    } else {
      fs.appendFileSync(CSV_FILE_PATH, row, 'utf8');
    }
    console.log('[CSV Ledger] Appended lead to mitigation_leads.csv');
  } catch (err) {
    console.error('[CSV Ledger Error] Failed to write CSV row:', err);
  }

  // 2. Placeholder hook for Supabase / Postgres client
  // When your Supabase credentials (SUPABASE_URL, SUPABASE_KEY) are in process.env, insert directly:
  /*
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    // await supabase.from('calls').insert([record]);
  }
  */
}