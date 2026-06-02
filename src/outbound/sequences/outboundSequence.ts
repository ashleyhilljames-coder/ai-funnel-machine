import { Prospect } from '../models/prospect';

export class OutboundSequenceManager {
  // Define the message templates for our multi-stage sequence
  private templates: Record<number, string> = {
    1: "Hi {contactName}, noticed your listings in the area. Have you considered using AI agents to qualify your incoming leads automatically?",
    2: "Hey {contactName}, just following up on my previous message. We built a system that qualifies leads in under 2 minutes. Worth a quick look?",
    3: "Hi {contactName}, final check-in—wanted to see if automating your real estate lead pipeline is a priority for your business this month?"
  };

  /**
   * Generates a personalized message based on the prospect's current sequence stage
   */
  public generateMessage(prospect: Prospect): string {
    const template = this.templates[prospect.outboundSequenceStage];
    if (!template) {
      throw new Error(`No template found for sequence stage ${prospect.outboundSequenceStage}`);
    }

    return template
      .replace('{contactName}', prospect.contactName)
      .replace('{businessName}', prospect.businessName);
  }

  /**
   * Progresses the prospect to the next stage of the outreach funnel
   */
  public advanceStage(prospect: Prospect): Prospect {
    const updatedProspect = { ...prospect };
    
    if (updatedProspect.outboundSequenceStage < 3) {
      updatedProspect.outboundSequenceStage += 1;
      updatedProspect.status = 'contacted';
      updatedProspect.lastContactedAt = new Date();
    } else {
      // If they haven't replied after stage 3, we move them to nurturing
      updatedProspect.status = 'nurturing';
    }

    return updatedProspect;
  }
}