import * as fs from 'fs';
import * as path from 'path';

export interface TenantLeadRecord {
  assignedClients: string[];
  globalBlock: boolean;
  timestamp: string;
}

export interface MultiTenantRegistry {
  [email: string]: TenantLeadRecord;
}

export class LeadGuard {
  private registryFilePath: string;
  private registry: MultiTenantRegistry;

  constructor() {
    this.registryFilePath = path.join(__dirname, '../../processed_leads.json');
    this.registry = {};
    this.loadRegistry();
  }

  private loadRegistry() {
    if (fs.existsSync(this.registryFilePath)) {
      try {
        const rawData = fs.readFileSync(this.registryFilePath, 'utf8');
        this.registry = JSON.parse(rawData);
      } catch (error) {
        console.error("⚠️ [LeadGuard] Error parsing multi-tenant registry, starting fresh.");
        this.registry = {};
      }
    }
  }

  /**
   * Checks if an email is already assigned to a specific client profile
   */
  public isDuplicateForClient(email: string, clientId: string): boolean {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    const record = this.registry[cleanEmail];

    if (!record) return false;
    if (record.globalBlock) return true;

    return record.assignedClients.includes(clientId.toLowerCase().trim());
  }

  /**
   * Reserves the lead specifically for this client workspace
   */
  public registerClientLead(email: string, clientId: string, enforceGlobalBlock: boolean = false) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const cleanClient = clientId.toLowerCase().trim();
    const timestamp = new Date().toISOString();

    if (!this.registry[cleanEmail]) {
      this.registry[cleanEmail] = {
        assignedClients: [cleanClient],
        globalBlock: enforceGlobalBlock,
        timestamp
      };
    } else {
      if (!this.registry[cleanEmail].assignedClients.includes(cleanClient)) {
        this.registry[cleanEmail].assignedClients.push(cleanClient);
      }
      if (enforceGlobalBlock) {
        this.registry[cleanEmail].globalBlock = true;
      }
    }

    fs.writeFileSync(this.registryFilePath, JSON.stringify(this.registry, null, 2), 'utf8');
  }
}