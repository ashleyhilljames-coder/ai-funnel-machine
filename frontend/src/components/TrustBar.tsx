import React from 'react';
import { Droplet, Flame, Bug, Home, ShieldCheck, Award, Clock, FileCheck2 } from 'lucide-react';

export const TrustBar: React.FC = () => {
  return (
    <section className="relative z-20 border-y border-slate-800 bg-dark-900/90 backdrop-blur-md py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Highlight Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Water, Fire, Mold & Roofing Emergency Network</span>
          </div>
        </div>

        {/* 4 Core Emergency Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-850 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Water & Flood</h4>
              <p className="text-xs text-slate-400">Extraction & Dryout</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-850 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Fire & Smoke</h4>
              <p className="text-xs text-slate-400">Soot & Cleanup</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-850 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Mold & Air Quality</h4>
              <p className="text-xs text-slate-400">Safe Remediation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-850 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Storm & Roof</h4>
              <p className="text-xs text-slate-400">Emergency Tarping</p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-slate-800/50 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>IICRC Certified Master Technicians</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>Direct Insurance Billing (All Carriers)</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Guaranteed 90-Minute Rapid Arrival</span>
          </div>
        </div>
      </div>
    </section>
  );
};
