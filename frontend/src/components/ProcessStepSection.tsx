import React from 'react';
import { Send, PhoneCall, Truck, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ProcessStepSection: React.FC = () => {
  return (
    <section id="dispatch-process" className="py-20 bg-dark-950 border-b border-slate-800/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4" /> Priority Response Protocol
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How Our Instant Emergency Dispatch Works
          </h2>
          <p className="mt-3 text-base text-slate-400">
            From the second you hit submit, our automated dispatch engine pairs you with vetted, IICRC-certified local emergency crews in under 60 seconds.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
          
          {/* Connecting Line background on desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 -translate-y-12 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 p-8 rounded-2xl glass-card border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 group hover:-translate-y-1 flex flex-col justify-between h-full">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 mb-6 group-hover:scale-110 transition-transform">
                01
              </div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Send className="w-4 h-4" /> Step 1: Instant Intake
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Submit 90-Sec Request</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Fill out our simple emergency intake form with your property address and damage type. No lengthy phone queues or waiting on hold.
              </p>
            </div>
            <ul className="mt-6 space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 100% Free Emergency Intake
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Instant GPS Geo-Matching
              </li>
            </ul>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 p-8 rounded-2xl glass-card border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg shadow-emerald-500/5 flex flex-col justify-between h-full">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/25 mb-6 group-hover:scale-110 transition-transform">
                02
              </div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <PhoneCall className="w-4 h-4" /> Step 2: Flexible Contact
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Text or Phone Response</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Receive a text confirmation or phone call based on your preferred contact method containing your assigned local master technician and estimated arrival time.
              </p>
            </div>
            <ul className="mt-6 space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Direct Cell Link with Technician
              </li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 p-8 rounded-2xl glass-card border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 group hover:-translate-y-1 flex flex-col justify-between h-full">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 mb-6 group-hover:scale-110 transition-transform">
                03
              </div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Truck className="w-4 h-4" /> Step 3: Rapid Arrival
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Vetted Crew Dispatched</h3>
            </div>

            <ul className="mt-2 space-y-6 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
              <li className="flex items-start gap-2 leading-snug">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Specialist Will Help You Understand The Damage To Your Home</span>
              </li>
              <li className="flex items-start gap-2 leading-snug">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct Insurance Claim Filing For Proper Coverage</span>
              </li>
              <li className="flex items-start gap-2 leading-snug">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Possible Deductible Assistance</span>
              </li>
            </ul>
          </div>

        </div>

        {/* CTA Banner inside Process section */}
        <div className="mt-12 text-center">
          <a
            href="#dispatch-form"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-sm transition-all"
          >
            <span>Ready for Immediate Dispatch? Fill Out Form Above</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
};
