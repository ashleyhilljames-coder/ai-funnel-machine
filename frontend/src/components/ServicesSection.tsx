import React, { useState } from 'react';
import { Droplet, Flame, Bug, Home, CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Activity, Gauge, Zap, Waves } from 'lucide-react';

export const ServicesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'water' | 'fire' | 'mold' | 'roof'>('water');

  const services = [
    {
      id: 'water',
      title: 'Water & Flood Damage Restoration',
      icon: Droplet,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Immediate industrial water extraction, structural thermal drying, moisture mapping, and hardwood/carpet restoration.',
      highlights: [
        '90-Min Guaranteed Response',
        'Sub-Floor Drying & Moisture Detection',
        'Anti-Microbial Disinfection Treatment',
        'Direct Insurance Claim Handling'
      ],
      vectorGauge: {
        metric: '99.4%',
        label: 'Moisture Extracted In <24 hrs',
        status: 'Optimal Thermal Drying'
      }
    },
    {
      id: 'fire',
      title: 'Fire & Smoke Damage Cleanup',
      icon: Flame,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      description: 'Complete soot removal, structural deodorization with ozone/thermal fogging, and full emergency property board-up.',
      highlights: [
        'Corrosive Soot & Smoke Scrubbing',
        'HEPA Air Filtration & Odor Elimination',
        'Personal Property Salvage & Inventory',
        'Structural Integrity Assessment'
      ],
      vectorGauge: {
        metric: '0.00 PPM',
        label: 'Toxic Smoke Particulates',
        status: 'HEPA Scrubbed & Cleared'
      }
    },
    {
      id: 'mold',
      title: 'Mold Inspection & Remediation',
      icon: Bug,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      description: 'Certified mold containment, spore air scrubbing, black mold eradication, and permanent moisture barrier installation.',
      highlights: [
        'Air Quality Spore Testing & Clearance',
        'Negative Air Pressure Containment',
        'Non-Toxic Bio-Washing Treatments',
        'Preventative Humidity Management'
      ],
      vectorGauge: {
        metric: '<35%',
        label: 'Target Relative Humidity',
        status: 'Zero Black Mold Risk'
      }
    },
    {
      id: 'roof',
      title: 'Emergency Roof Tarping & Storm Care',
      icon: Home,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      description: '24/7 heavy-duty roof tarping, storm leak containment, tree removal, and structural emergency stabilization.',
      highlights: [
        'Heavy-Duty Weather-Proof Shrink Wrap',
        'Fast Water Ingress Stoppage',
        'Window & Door Emergency Board-Up',
        'Insurance Approved Loss Documentation'
      ],
      vectorGauge: {
        metric: '100%',
        label: 'Water Ingress Sealed',
        status: 'Weather Seal Enforced'
      }
    }
  ];

  const currentService = services.find(s => s.id === activeTab) || services[0];

  return (
    <section id="services" className="py-20 bg-dark-900 border-b border-slate-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4" /> Full-Spectrum Emergency Services
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comprehensive Restoration Capabilities
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Our certified master technicians handle every stage of emergency home recovery from immediate extraction to final clearance.
          </p>
        </div>

        {/* Service Category Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {services.map((s) => {
            const Icon = s.icon;
            const isActive = activeTab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id as any)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? `${s.bgColor} ${s.borderColor} text-white shadow-lg font-bold scale-[1.02]`
                    : 'bg-dark-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${s.bgColor} ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-bold leading-tight">{s.title.split(' ')[0]} Care</span>
                  <span className="text-[11px] text-slate-400 font-normal">24/7 Crew Ready</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Service Detail Panel (100% Vector Graphic Elements) */}
        <div className="p-6 sm:p-10 rounded-3xl glass-card border border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${currentService.bgColor} ${currentService.color} border ${currentService.borderColor}`}>
                <currentService.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-white">{currentService.title}</h3>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> IICRC Certified Master Crews
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-base leading-relaxed">
              {currentService.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentService.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-950 border border-slate-800 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <a
                href="#dispatch-form"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Dispatch Crew For {currentService.title.split(' ')[0]} Emergency</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 100% Vector Technical Metric Box (Zero Photography) */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-dark-950 via-slate-900 to-dark-950 border border-slate-800 shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Activity className="w-4 h-4 animate-pulse" /> Live Telemetry Standard
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                  PASS
                </span>
              </div>

              <div className="text-center py-2">
                <Gauge className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <div className="text-4xl font-mono font-black text-white">{currentService.vectorGauge.metric}</div>
                <div className="text-xs text-slate-400 font-semibold mt-1">{currentService.vectorGauge.label}</div>
              </div>

              <div className="p-3 rounded-xl bg-dark-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> {currentService.vectorGauge.status}
                </span>
              </div>

              <div className="pt-1 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                <Waves className="w-3.5 h-3.5 text-blue-400" />
                <span>Verified by FLIR Thermal & Moisture Sensors</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
