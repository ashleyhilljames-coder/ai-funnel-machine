import React from 'react';
import { ShieldCheck, PhoneCall, CheckCircle2, Clock, Zap, DollarSign, Timer, ArrowRight } from 'lucide-react';
import { LeadForm } from './LeadForm';
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL, GUARANTEE_TITLE, GUARANTEE_TEXT, GUARANTEE_DISCLAIMER } from '../config/site';

interface HeroProps {
  onFormSubmitted: (leadData: any) => void;
}

export const Hero: React.FC<HeroProps> = ({ onFormSubmitted }) => {
  return (
    <section className="relative overflow-hidden pt-6 pb-14 lg:pt-10 lg:pb-20 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      
      {/* 100% Vector Ambient Background Elements (Zero Stock Photos) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Hero Left Column: Copy & Same-Day Guarantee Callout (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 pt-1">
            
            {/* Live Dispatch Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold tracking-wide w-max shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>PRIORITY DISPATCH ACTIVE</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
              Fast Home Flood & Emergency Restoration Services
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              24/7 Priority Dispatch. Fill out our 90-second form to get an immediate text response and have vetted local crews dispatched to your door.
            </p>

            {/* HIGH-IMPACT PROMINENT CALLOUT CARD: SAME-DAY ARRIVAL GUARANTEE */}
            <div className="p-5 rounded-2xl glass-card border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-dark-900 to-emerald-500/10 shadow-xl relative overflow-hidden group">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shrink-0 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <Timer className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                      {GUARANTEE_TITLE}
                    </span>
                    <span className="text-xs text-amber-400 font-bold">100% Guaranteed Arrival</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {GUARANTEE_TEXT}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">
                    When water or fire strikes, speed is critical. If our restoration specialist isn't at your property the same day, we pay you $100.
                  </p>
                  <p className="text-[11px] text-slate-400 italic mt-2">
                    {GUARANTEE_DISCLAIMER}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Value Props Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-dark-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">$0 Out-Of-Pocket</h4>
                  <p className="text-xs text-slate-400">Direct insurance billing to all major carriers</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-dark-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">IICRC Master Certified</h4>
                  <p className="text-xs text-slate-400">Industrial water extraction & thermal drying</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-dark-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Instant SMS Confirmation</h4>
                  <p className="text-xs text-slate-400">Real-time crew tracking updates to cell</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-dark-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">24/7/365 On-Call</h4>
                  <p className="text-xs text-slate-400">Holiday & night emergency dispatch</p>
                </div>
              </div>
            </div>

            {/* Direct Call Hotline Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs text-slate-400 font-medium">Prefer to speak right now?</span>
                  <span className="text-lg font-black text-white">Call 24/7 Dispatch Operator</span>
                </div>
              </div>
              <a
                href={DISPATCH_PHONE_TEL}
                className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-sm border border-emerald-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <span>{DISPATCH_PHONE_DISPLAY}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>

          {/* Hero Right Column: High-Contrast Lead Form Container (5 Cols) */}
          <div className="lg:col-span-5 w-full">
            <LeadForm onSubmitted={onFormSubmitted} />
          </div>

        </div>
      </div>
    </section>
  );
};
