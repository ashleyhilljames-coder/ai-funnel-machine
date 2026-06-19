import { google } from 'googleapis';
import { LeadGuard } from '../outbound/leadGuard.js';

const leadGuard = new LeadGuard();

const SPREADSHEET_ID = '17hFmD4_4AXcXmZo8_EjaUftBd50PVta009GkgtPt0ME';

interface LeadData {
  name: string;
  phone: string;
  email: string;
  address: string;
  damageType: string;
}

export type LeadTab = 'Active Inbound' | 'Scraped Leads' | 'Imported Lists';

export async function appendLeadToSheet(clientId: string, lead: LeadData, tabName: LeadTab = 'Active Inbound') {
  try {
    const settings = leadGuard.getClientSettings(clientId);
    const spreadsheetId = (settings && settings.googleSheetId) ? settings.googleSheetId : SPREADSHEET_ID;

    const auth = new google.auth.GoogleAuth({
      keyFile: './google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Retrieve sheet metadata to check if the target tab exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });
    
    const existingSheets = spreadsheet.data.sheets || [];
    const tabExists = existingSheets.some(s => s.properties?.title === tabName);

    if (!tabExists) {
      console.log(`ℹ️ Tab "${tabName}" not found. Creating it dynamically...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                },
              },
            },
          ],
        },
      });
      console.log(`🆕 Created tab: "${tabName}"`);

      // Write headers to the new tab
      const headers = ["Timestamp", "Name", "Phone", "Email", "Address", "Damage Type"];
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${tabName}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
      console.log(`📝 Initialized header row in tab: "${tabName}"`);
    }

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
      spreadsheetId: spreadsheetId,
      range: `${tabName}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    console.log(`✅ Lead successfully saved to Google Sheet tab [${tabName}]!`, response.data);
    return true;
  } catch (error) {
    console.error(`❌ Failed to write to Google Sheet tab [${tabName}]:`, error);
    throw error;
  }
}