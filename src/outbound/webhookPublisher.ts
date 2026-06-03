export interface WebhookPayload {
  clientId: string;
  trackingId: string;
  timestamp: string;
  lead: {
    businessName: string;
    contactName: string;
    email: string;
    niche: string;
  };
  sequence: {
    day1Email: string;
    day3FollowUp: string;
    day5LinkedIn: string;
  };
}

export class WebhookPublisher {
  private webhookUrl: string | undefined;

  constructor() {
    // Grabs your live endpoint from your secure root .env file
    this.webhookUrl = process.env.MAKE_WEBHOOK_URL;
  }

  /**
   * Transmits a completely personalized lead sequence payload over the web to Make.com
   */
  async publishSequence(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
    if (!this.webhookUrl) {
      // If no webhook is configured, fail gracefully without crashing the system loop
      return { 
        success: false, 
        error: "Skipped: No MAKE_WEBHOOK_URL found in your environmental variables (.env)." 
      };
    }

    try {
      // Native modern Node fetch API call
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Server responded with an unstable status code: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: `Network interface connection failed: ${error.message}` 
      };
    }
  }
}