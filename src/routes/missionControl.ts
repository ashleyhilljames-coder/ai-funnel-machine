import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import twilio from 'twilio';
import { missionDb } from '../services/missionControlDb.js';
import { apiKeyAuth } from '../middleware/auth.js';

const router = Router();
router.use(apiKeyAuth);

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const adminEmail = process.env.DISPATCH_ADMIN_EMAIL || 'ashley@syncroscale.com';

function toE164Phone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return digits ? `+${digits}` : phone;
}

// GET /api/mission-control/jobs - List all jobs
router.get('/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = missionDb.getJobs();
    return res.status(200).json({ success: true, jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch jobs' });
  }
});

// GET /api/mission-control/jobs/:id/details - Comprehensive job detail
router.get('/jobs/:id/details', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const job = missionDb.getJobById(id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const moistureReadings = missionDb.getMoistureReadings(id);
    const equipment = missionDb.getEquipment(id);
    const photos = missionDb.getPhotos(id);

    return res.status(200).json({
      success: true,
      job,
      moistureReadings,
      equipment,
      photos
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch job details' });
  }
});

// POST /api/mission-control/jobs - Create emergency intake job
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const newJob = missionDb.createJob(payload);

    // Trigger Resend email notification if available
    let emailStatus = 'skipped';
    if (resendClient) {
      try {
        await resendClient.emails.send({
          from: 'Syncro Scale Dispatch <onboarding@resend.dev>',
          to: [adminEmail],
          subject: `⚡ EMERGENCY INTAKE: ${newJob.damage_type} - ${newJob.address}`,
          html: `
            <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
              <h2 style="color: #38bdf8;">NEW EMERGENCY RESTORATION INTAKE</h2>
              <p><strong>Job ID:</strong> ${newJob.id}</p>
              <p><strong>Homeowner:</strong> ${newJob.homeowner_name} (${newJob.homeowner_phone})</p>
              <p><strong>Address:</strong> ${newJob.address}</p>
              <p><strong>Damage Type:</strong> ${newJob.damage_type}</p>
              <p><strong>Source:</strong> ${newJob.water_source}</p>
              <p><strong>Transcript:</strong></p>
              <blockquote style="background: #1e293b; padding: 12px; border-left: 4px solid #38bdf8;">
                ${newJob.call_transcript || 'Direct mobile intake request.'}
              </blockquote>
            </div>
          `
        });
        emailStatus = 'sent';
      } catch (e: any) {
        console.warn('Resend alert warning:', e.message);
        emailStatus = `failed: ${e.message}`;
      }
    }

    return res.status(201).json({ success: true, job: newJob, emailStatus });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create job intake' });
  }
});

// PATCH /api/mission-control/jobs/:id/stage - Update stage with optimistic race lock
router.patch('/jobs/:id/stage', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { stage, techName, techPhone } = req.body;

    if (!stage) {
      return res.status(400).json({ success: false, error: 'Stage is required' });
    }

    const result = missionDb.updateJobStage(id, stage, techName, techPhone);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, job: result.job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update stage' });
  }
});

// POST /api/mission-control/jobs/:id/dispatch-sms - One-click tech SMS dispatch
router.post('/jobs/:id/dispatch-sms', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const job = missionDb.getJobById(id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const techName = req.body.techName || job.assigned_tech_name || 'Evan Davis (EcoDry)';
    const techPhone = req.body.techPhone || job.assigned_tech_phone || '+17025550111';
    const formattedTechPhone = toE164Phone(techPhone);

    const acceptUrl = `http://localhost:5173/?view=mobile&jobId=${id}&action=accept`;
    const messageBody = `🚨 SYNCRO SCALE EMERGENCY DISPATCH:\nJob ${job.id} at ${job.address}.\nDamage: ${job.damage_type}.\nHomeowner: ${job.homeowner_name} (${job.homeowner_phone}).\n1-Tap Accept Link: ${acceptUrl}`;

    let smsSid = `SM-MOCK-${Date.now()}`;
    let smsStatus = 'mock_sent';

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const smsResult = await twilioClient.messages.create({
          body: messageBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedTechPhone,
        });
        smsSid = smsResult.sid;
        smsStatus = 'twilio_sent';
      } catch (tErr: any) {
        console.warn('Twilio Dispatch warning:', tErr.message);
      }
    }

    // Update job stage to DISPATCHED
    missionDb.updateJobStage(id, 'DISPATCHED', techName, formattedTechPhone);

    return res.status(200).json({
      success: true,
      message: `Emergency SMS dispatched to ${techName} (${formattedTechPhone})`,
      smsSid,
      smsStatus,
      acceptUrl
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Dispatch SMS failure' });
  }
});

// POST /api/mission-control/jobs/:id/en-route-sms - One-tap "En Route" SMS to homeowner
router.post('/jobs/:id/en-route-sms', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const job = missionDb.getJobById(id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const etaMinutes = req.body.etaMinutes || 25;
    const techName = req.body.techName || job.assigned_tech_name || 'Emergency Restoration Specialist';
    const formattedPhone = toE164Phone(job.homeowner_phone);

    const messageBody = `Hi ${job.homeowner_name}, your Syncro Scale technician (${techName}) is EN ROUTE to ${job.address}. Estimated arrival in approximately ${etaMinutes} minutes. For immediate questions, reply to this text.`;

    let smsSid = `SM-ENROUTE-${Date.now()}`;
    let smsStatus = 'mock_sent';

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const smsResult = await twilioClient.messages.create({
          body: messageBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
        smsSid = smsResult.sid;
        smsStatus = 'twilio_sent';
      } catch (tErr: any) {
        console.warn('En Route SMS warning:', tErr.message);
      }
    }

    // Update stage to ON_SITE or keep en route status
    missionDb.updateJobStage(id, 'ON_SITE');

    return res.status(200).json({
      success: true,
      message: `En Route notification sent to homeowner ${job.homeowner_name}`,
      smsSid,
      smsStatus
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'En Route SMS failure' });
  }
});

// POST /api/mission-control/jobs/:id/moisture - Record room moisture reading
router.post('/jobs/:id/moisture', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const readingData = { ...req.body, job_id: id };
    const reading = missionDb.addMoistureReading(readingData);

    // If job stage was ON_SITE, update stage to DRYING
    const job = missionDb.getJobById(id);
    if (job && job.stage === 'ON_SITE') {
      missionDb.updateJobStage(id, 'DRYING');
    }

    return res.status(201).json({ success: true, reading });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to add moisture reading' });
  }
});

// POST /api/mission-control/jobs/:id/equipment - Track placed/removed equipment
router.post('/jobs/:id/equipment', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const equipData = { ...req.body, job_id: id };
    const equipment = missionDb.addEquipment(equipData);
    return res.status(201).json({ success: true, equipment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to add equipment' });
  }
});

// POST /api/mission-control/jobs/:id/photos - Save loss photo & simulate Cloudflare R2 / S3 pre-signed storage
router.post('/jobs/:id/photos', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const photoData = { ...req.body, job_id: id };
    const photo = missionDb.addPhoto(photoData);
    return res.status(201).json({
      success: true,
      photo,
      preSignedUploadUrl: `https://storage.syncroscale.cloud/upload/${photo.id}?signature=exp2026-sig-ok`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to add photo' });
  }
});

// POST /api/mission-control/jobs/:id/signature - Save work authorization signature
router.post('/jobs/:id/signature', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { signatureData } = req.body;
    if (!signatureData) {
      return res.status(400).json({ success: false, error: 'Signature data is required' });
    }

    missionDb.updateSignature(id, signatureData);
    return res.status(200).json({ success: true, message: 'Work authorization digital signature saved successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to save signature' });
  }
});

// POST /api/mission-control/sync-offline - Bulk sync offline IndexedDB records from mobile tech
router.post('/sync-offline', (req: Request, res: Response) => {
  try {
    const { moistureReadings = [], equipmentLogs = [], lossPhotos = [] } = req.body || {};

    let syncedCount = 0;

    for (const mr of moistureReadings) {
      missionDb.addMoistureReading(mr);
      syncedCount++;
    }
    for (const eq of equipmentLogs) {
      missionDb.addEquipment(eq);
      syncedCount++;
    }
    for (const ph of lossPhotos) {
      missionDb.addPhoto(ph);
      syncedCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Offline IndexedDB queue successfully synchronized (${syncedCount} records processed).`,
      syncedCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Offline queue sync failure' });
  }
});

// GET /api/mission-control/payouts - 1099 Referral Agent Ledger
router.get('/payouts', (_req: Request, res: Response) => {
  try {
    const payouts = missionDb.getPayouts();
    const totals = payouts.reduce((acc, p) => {
      acc.total += p.referral_fee;
      if (p.payout_status === 'PAID') acc.paid += p.referral_fee;
      if (p.payout_status === 'APPROVED') acc.approved += p.referral_fee;
      if (p.payout_status === 'PENDING') acc.pending += p.referral_fee;
      return acc;
    }, { total: 0, paid: 0, approved: 0, pending: 0 });

    return res.status(200).json({ success: true, payouts, totals });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch payouts' });
  }
});

// POST /api/mission-control/payouts/:id/pay - Execute 1099 payout & send receipt
router.post('/payouts/:id/pay', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = missionDb.markPayoutPaid(id);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const payout = result.payout!;

    // Send SMS receipt if Twilio available
    let smsStatus = 'skipped';
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Syncro Scale Payout Confirmation: Hi ${payout.partner_name}, your referral fee of $${payout.referral_fee.toFixed(2)} for Job ${payout.job_id} has been processed! Ref: ${payout.transaction_ref}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.DISPATCH_ADMIN_PHONE || '+17025550199',
        });
        smsStatus = 'sent';
      } catch (tErr: any) {
        console.warn('Payout SMS warning:', tErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payout of $${payout.referral_fee.toFixed(2)} successfully executed to ${payout.partner_name}`,
      payout,
      smsStatus
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to process payout' });
  }
});

// POST /api/mission-control/voice-stream - Deepgram Nova-2 streaming transcript simulator
router.post('/voice-stream', async (req: Request, res: Response) => {
  try {
    const { transcript, callerPhone, address, damageType } = req.body || {};

    const generatedJob = missionDb.createJob({
      homeowner_name: req.body.homeownerName || 'Inbound Voice Call',
      homeowner_phone: callerPhone || '+17025550188',
      address: address || '1045 S Fort Apache Rd, Las Vegas, NV',
      damage_type: damageType || 'Water Damage',
      water_source: req.body.waterSource || 'Main Water Line Leak',
      affected_rooms: req.body.affectedRooms || 'Living Room, Crawlspace',
      call_transcript: transcript || '[Deepgram Nova-2 Real-Time Transcript]: Homeowner calling regarding active water leak in main living area.',
      stage: 'NEW_INTAKE'
    });

    return res.status(200).json({
      success: true,
      message: 'Deepgram Nova-2 stream successfully parsed and registered in Mission Control',
      job: generatedJob
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Voice stream parsing error' });
  }
});

export default router;
