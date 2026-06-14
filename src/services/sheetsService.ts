import { google } from 'googleapis';

const SPREADSHEET_ID = '17hFmD4_4AXcXmZo8_EjaUftBd50PVta009GkgtPt0ME';

interface LeadData {
  name: string;
  phone: string;
  email: string;
  address: string;
  damageType: string;
}

export async function appendLeadToSheet(lead: LeadData) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toLocaleString();
    const rowValues = [
      timestamp, 
      lead.name, 
      lead.phone, 
      lead.email, 
      lead.address, 
      lead.damageType
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    console.log('✅ Lead successfully saved to Google Sheet!', response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to write to Google Sheet:', error);
    throw error;
  }
}