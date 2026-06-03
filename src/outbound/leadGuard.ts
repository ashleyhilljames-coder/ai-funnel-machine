import * as fs from 'fs';
import * as path from 'path';

export class LeadGuard {
  private registryFilePath: string;
  private exclusionSet: Set<string>;

  constructor() {
    this.registryFilePath = path.join(__dirname, '../../processed_leads.json');
    this.exclusionSet = new Set<string>();
    this.loadRegistry();
  }

  private loadRegistry() {
    if (fs.existsSync(this.registryFilePath)) {
      try {
        const rawData = fs.readFileSync(this.registryFilePath, 'utf8');
        const emailsArray: string[] = JSON.parse(rawData);
        this.exclusionSet = new Set(emailsArray.map(email => email.toLowerCase().trim()));
      } catch (error) {
        console.error("⚠️ [LeadGuard] Error parsing processed_leads.json, starting fresh.");
        this.exclusionSet = new Set<string>();
      }
    }
  }

  public isDuplicate(email: string): boolean {
    if (!email) return false;
    return this.exclusionSet.has(email.toLowerCase().trim());
  }

  public registerProcessedLead(email: string) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    
    if (!this.exclusionSet.has(cleanEmail)) {
      this.exclusionSet.add(cleanEmail);
      const emailsArray = Array.from(this.exclusionSet);
      fs.writeFileSync(this.registryFilePath, JSON.stringify(emailsArray, null, 2), 'utf8');
    }
  }
}