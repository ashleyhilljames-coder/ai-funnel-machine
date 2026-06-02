import { Prospect } from '../models/prospect';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { parse } from 'csv-parse';

export class LeadScraper {
  /**
   * Sanitizes and parses raw input data into a clean Prospect model.
   */
  public parseRawLead(rawData: {
    businessName: string;
    contactName: string;
    email: string;
    phone?: string;
    website?: string;
    notes?: string;
  }): Prospect {
    if (!rawData.businessName || !rawData.contactName || !rawData.email) {
      throw new Error("Missing required lead information: businessName, contactName, and email are mandatory.");
    }

    return {
      id: uuidv4(),
      businessName: rawData.businessName.trim(),
      contactName: rawData.contactName.trim(),
      email: rawData.email.trim().toLowerCase(),
      phone: rawData.phone?.trim(),
      website: rawData.website?.trim(),
      status: 'cold',
      outboundSequenceStage: 1,
      notes: rawData.notes || 'Manually imported lead data.',
    };
  }

  /**
   * Reads a local CSV file path and parses it into an array of raw lead objects.
   */
  public async parseCSVFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`CSV file not found at path: ${filePath}`));
      }

      fs.createReadStream(filePath)
        .pipe(parse({ 
          columns: true, // Automatically uses the first row of the CSV as object keys!
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (row) => {
          // Map CSV headers cleanly to our expected object names
          records.push({
            businessName: row.businessName || row.Business || row.Company,
            contactName: row.contactName || row.Contact || row.Name,
            email: row.email || row.Email,
            phone: row.phone || row.Phone,
            website: row.website || row.Website,
            notes: row.notes || row.Notes
          });
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }
}