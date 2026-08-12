import React, { useState, useEffect } from 'react';
import { CheckCircle2, PhoneCall, X, ShieldAlert, Radio, Clock, Smartphone, Copy, Check, Timer, DollarSign } from 'lucide-react';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadData: {
    leadId: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    emergencyType: string;
    waterSource: string;
    affectedRooms: string;
    description: string;
    createdAt?: number;
  } | null;
}

export const SMSModal: React.FC<SMSModalProps> = ({ isOpen, onClose, leadData }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(5400); // 90 minutes = 5400s
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !leadData) return;

    const startTimestamp = leadData.createdAt || Date.now();
    
    const updateTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = Math.max(0, 5400 - elapsedSeconds);
      setSecondsRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    // Live timeline animation sequence
    const t1 = setTimeout(() => setStepIndex(1), 1200);
    const t2 = setTimeout(() => setStepIndex(2), 2500);
    const t3 = setTimeout(() => setStepIndex(3), 3800);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, leadData]);

  if (!isOpen || !leadData) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleCopyLeadId = () => {
    navigator.clipboard.writeText(leadData.leadId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-dark-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/20 overflow-hidden my-auto">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Timer className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">Live Emergency Dispatch Tracker</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dispatched to <strong className="text-emerald-300">{leadData.address}</strong>
            </p>
          </div>
        </div>

        {/* Dispatch ID & Copy Box */}
        <div className="mb-5 p-3 rounded-xl bg-dark-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Dispatch ID:</span>
            <code className="text-base font-mono font-black text-amber-400">{leadData.leadId}</code>
          </div>
          <button
            onClick={handleCopyLeadId}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy ID'}</span>
          </button>
        </div>

        {/* LIVE TICKING 90:00 COUNTDOWN CLOCK */}
        <div className="mb-5 p-5 rounded-2xl bg-gradient-to-br from-dark-950 via-slate-900 to-dark-950 border-2 border-emerald-500/40 text-center relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 animate-spin-slow" /> Guaranteed On-Site Arrival Timer
          </div>
          
          <div className="text-5xl sm:text-6xl font-mono font-black text-white tracking-widest text-shadow-glow my-1">
            {formattedTime}
          </div>
          
          <p className="text-xs text-slate-400">Counting down live for emergency crew arrival</p>

          {/* THE $90 ON-TIME ARRIVAL GUARANTEE HIGHLIGHT CARD */}
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-amber-500 text-slate-950 shrink-0 font-black text-sm flex items-center gap-0.5">
              <DollarSign className="w-4 h-4" />90
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide">
                $90 On-Time Arrival Guarantee
              </h4>
              <p className="text-[11px] text-slate-300 leading-tight">
                If our certified restoration crew is not parked at your property before this timer hits <code>00:00</code>, we pay you $90 cash.
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Timeline */}
        <div className="mb-5 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/90 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>[00:01] Intake Logged & Verified for {leadData.fullName}</span>
          </div>

          <div className={`flex items-center gap-2 transition-opacity duration-300 ${stepIndex >= 1 ? 'opacity-100 text-slate-300' : 'opacity-30 text-slate-600'}`}>
            {stepIndex >= 1 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            )}
            <span>[00:03] Outbound SMS Sent via Twilio to {leadData.phone}</span>
          </div>

          <div className={`flex items-center gap-2 transition-opacity duration-300 ${stepIndex >= 2 ? 'opacity-100 text-slate-300' : 'opacity-30 text-slate-600'}`}>
            {stepIndex >= 2 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
            <span>[00:08] Crew Assigned: Lead Tech Mark Vance (Unit 402)</span>
          </div>

          <div className={`flex items-center gap-2 transition-opacity duration-300 ${stepIndex >= 3 ? 'opacity-100 text-emerald-300 font-bold' : 'opacity-30 text-slate-600'}`}>
            {stepIndex >= 3 ? (
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-slate-600" />
            )}
            <span>[00:12] En Route to Property with Extraction & Drying Units</span>
          </div>
        </div>

        {/* Real SMS Text Preview Box */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/60 text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-200">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Twilio SMS Confirmation Sent
            </span>
            <span className="text-[10px] text-slate-400">Just Now</span>
          </div>
          <p className="text-slate-300 leading-snug">
            📲 <strong>Rapid Home Relief Alert:</strong> Hi {leadData.fullName}, your priority request <strong>{leadData.leadId}</strong> is active under our 90/90 Guarantee. Lead Tech Mark Vance (Cell: <strong>800-727-4373</strong>) is en route to <em>{leadData.address}</em>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href="tel:18007274373"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>Call Assigned Lead Tech Now</span>
          </a>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700 transition-colors"
          >
            Close Tracker
          </button>
        </div>

      </div>
    </div>
  );
};
