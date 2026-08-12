import React from 'react';
import { ShieldCheck, FileCheck, DollarSign, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

export const InsuranceSection: React.FC = () => {
  const insuranceCarriers = [
    'State Farm', 'Allstate', 'Farmers Insurance', 'Liberty Mutual',
    'USAA', 'Nationwide', 'Travelers', 'Chubb Insurance',
    'American Family', 'Progressive Home', 'Hartford', 'Safeco'
  ];

  return (
    <section id="insurance" className="py-20 bg-dark-950 border-b border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Direct Billing Value Prop */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-4 h-4" /> Zero Stress Insurance Claims
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              We Bill Your Insurance Carrier Directly
            </h2>

            <p className="text-slate-300 text-base leading-relaxed">
              When disaster strikes, you shouldn't have to worry about out-of-pocket restoration expenses. We handle 100% of the insurance loss documentation, adjuster negotiations, and direct carrier billing.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-900 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Full Loss & Thermal Moisture Reports</h4>
                  <p className="text-xs text-slate-400">Detailed loss estimating matching insurance adjuster standards.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-900 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Direct Deductible Assistance</h4>
                  <p className="text-xs text-slate-400">We bill your insurance directly so you pay $0 upfront for covered water and fire claims.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-900 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">All Major Carriers Approved</h4>
                  <p className="text-xs text-slate-400">We work seamlessly with every national and regional homeowner insurance provider.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="#dispatch-form"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20"
              >
                <span>Check Your Insurance Coverage Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>

          {/* Right Column: Carrier Network Badges Grid */}
          <div className="lg:col-span-6">
            <div className="p-8 rounded-3xl glass-card border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-2 text-center">Approved Insurance Network</h3>
              <p className="text-xs text-slate-400 text-center mb-6">Works seamlessly with 100% of major homeowners insurance carriers</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {insuranceCarriers.map((carrier, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-dark-950/80 border border-slate-800/80 text-center flex flex-col items-center justify-center gap-1 hover:border-emerald-500/40 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">{carrier}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center text-xs text-amber-300 font-semibold">
                Don't see your insurance provider? We accept all licensed home insurance policies nationwide.
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
