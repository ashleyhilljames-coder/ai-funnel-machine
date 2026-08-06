import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import twilio from 'twilio';
import { apiKeyAuth } from '../middleware/auth';

const router = Router();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// POST /api/leads/create
router.post('/create', apiKeyAuth, async (req, res) => {
  try {
    const rawName = req.body?.homeowner_name;
    const rawPhone = req.body?.homeowner_phone;
    const rawDamage = req.body?.damage_type;
    const rawPlumber = req.body?.plumber_id;
    const rawNotes = req.body?.notes;

    const homeowner_name = typeof rawName === 'string' ? rawName.trim() : rawName;
    const homeowner_phone = typeof rawPhone === 'string' ? rawPhone.trim() : rawPhone;
    const damage_type = typeof rawDamage === 'string' ? rawDamage.trim() : rawDamage;
    const plumber_id = typeof rawPlumber === 'string' ? rawPlumber.trim() : rawPlumber;
    const notes = typeof rawNotes === 'string' ? rawNotes.trim() : rawNotes;

    if (!homeowner_name || typeof homeowner_name !== 'string' || !homeowner_name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'homeowner_name is required',
      });
    }

    if (!homeowner_phone || typeof homeowner_phone !== 'string' || !homeowner_phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'homeowner_phone is required',
      });
    }

    let targetPlumberId = plumber_id;
    if (!targetPlumberId) {
      const { data: plumberData, error: plumberError } = await supabaseAdmin
        .from('plumbers')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (plumberError) {
        console.error('Error fetching default plumber:', plumberError);
      }

      if (plumberData?.id) {
        targetPlumberId = plumberData.id;
      }
    }

    if (!targetPlumberId) {
      return res.status(400).json({
        success: false,
        error: 'plumber_id is required',
      });
    }

    let combinedNotes: string | null = notes || null;
    if (damage_type) {
      combinedNotes = notes
        ? `[Damage Type: ${damage_type}] ${notes}`
        : `Damage Type: ${damage_type}`;
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          homeowner_name: homeowner_name.trim(),
          homeowner_phone: homeowner_phone.trim(),
          plumber_id: targetPlumberId,
          notes: combinedNotes,
          status: 'DISPATCHED',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Lead Creation Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      lead: data,
    });
  } catch (err: any) {
    console.error('Error creating lead:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
});

// POST /api/leads/update-status
router.post('/update-status', apiKeyAuth, async (req, res) => {
  try {
    const rawLeadId = req.body?.lead_id ?? req.body?.id ?? req.body?.leadId;
    const rawStatus = req.body?.status ?? req.body?.newStatus;

    if (rawLeadId === undefined || rawLeadId === null || rawLeadId === '') {
      return res.status(400).json({
        success: false,
        error: 'lead_id (or id) is required',
      });
    }

    if (!rawStatus || typeof rawStatus !== 'string' || !rawStatus.trim()) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
      });
    }

    const leadId = typeof rawLeadId === 'string' && !isNaN(Number(rawLeadId)) ? parseInt(rawLeadId, 10) : rawLeadId;
    const newStatus = rawStatus.trim().toUpperCase();

    const updatePayload: Record<string, any> = {
      status: newStatus,
    };

    if (newStatus === 'SIGNED') {
      updatePayload.payout_paid = true;
      updatePayload.paid_at = new Date().toISOString();
    }

    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select('*, plumbers(*)')
      .single();

    if (updateError) {
      console.error('Supabase Lead Update Error:', updateError);
      return res.status(400).json({
        success: false,
        error: updateError.message,
      });
    }

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    let smsStatus = 'skipped';
    let smsError: string | undefined = undefined;

    if (newStatus === 'SIGNED') {
      const plumber = updatedLead.plumbers || null;
      let partnerPhone = req.body?.partnerPhone || plumber?.phone_number;
      let partnerName = plumber?.contact_name || plumber?.company_name || 'Partner';
      const payoutAmount = updatedLead.payout_amount || req.body?.payoutAmount || 750;

      if (!partnerPhone && updatedLead.plumber_id) {
        const { data: plumberData } = await supabaseAdmin
          .from('plumbers')
          .select('*')
          .eq('id', updatedLead.plumber_id)
          .maybeSingle();

        if (plumberData) {
          partnerPhone = plumberData.phone_number;
          partnerName = plumberData.contact_name || plumberData.company_name || 'Partner';
        }
      }

      if (partnerPhone && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const message = `Syncro Scale Update: Hi ${partnerName}, your job referral has been successfully signed! Payout of $${payoutAmount} is being processed.`;

          const smsResult = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: partnerPhone,
          });

          console.log('Twilio SMS sent successfully! SID:', smsResult.sid);
          smsStatus = `sent (SID: ${smsResult.sid})`;
        } catch (twilioErr: any) {
          console.error('Twilio SMS Error:', twilioErr.message);
          smsStatus = 'failed';
          smsError = twilioErr.message;
        }
      }
    }

    const responsePayload: Record<string, any> = {
      success: true,
      lead: updatedLead,
      smsStatus,
    };

    if (smsError) {
      responsePayload.smsError = smsError;
    }

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error('Error updating lead status:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
});

export default router;