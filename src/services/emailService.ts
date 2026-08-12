import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  provider?: 'smtp' | 'resend' | 'sandbox';
  error?: any;
}

/**
 * Unified Email Dispatch Service supporting SMTP (Nodemailer) and API (Resend) credentials.
 * Routes dispatches directly to configured target email address.
 */
export async function dispatchEmail(options: EmailOptions): Promise<EmailDispatchResult> {
  const targetEmailOverride = process.env.TEST_TARGET_EMAIL || 'RBUTLER@qualityroofinglv.com';
  const recipient = options.to || targetEmailOverride;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Attempt SMTP dispatch via Nodemailer if credentials exist
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true';
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const from = options.from || process.env.SMTP_FROM || `Syncro Scale <${smtpUser}>`;
      const info = await transporter.sendMail({
        from,
        to: recipient,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]+>/g, ''),
      });

      console.log(`📧 [Email Dispatch Service - SMTP] Dispatched to ${recipient}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (error: any) {
      console.error(`❌ [Email Dispatch Service - SMTP Error]:`, error.message);
    }
  }

  // 2. Attempt Resend API dispatch if key exists
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const from = options.from || process.env.EMAIL_FROM || 'Syncro Scale <onboarding@resend.dev>';
      const response = await resend.emails.send({
        from,
        to: recipient,
        subject: options.subject,
        html: options.html,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log(`📧 [Email Dispatch Service - Resend] Dispatched to ${recipient}. MessageId: ${response.data?.id}`);
      return { success: true, messageId: response.data?.id, provider: 'resend' };
    } catch (error: any) {
      console.error(`❌ [Email Dispatch Service - Resend Error]:`, error.message);
      return { success: false, error: error.message, provider: 'resend' };
    }
  }

  // 3. Sandbox fallback for testing environment
  console.log(`📱 [SANDBOX EMAIL DISPATCH] To: ${recipient} | Subject: ${options.subject}`);
  return { success: true, messageId: 'sandbox-mock-id', provider: 'sandbox' };
}
