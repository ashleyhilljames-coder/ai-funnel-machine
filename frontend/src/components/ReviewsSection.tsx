import React from 'react';
import { Star, ShieldCheck, Quote, CheckCircle2, UserCheck, Activity, Award, Check } from 'lucide-react';

export const ReviewsSection: React.FC = () => {
  const reviews = [
    {
      id: 1,
      name: 'Robert Miller',
      location: 'Dallas, TX',
      type: 'Burst Pipe Flood',
      rating: 5,
      timeAgo: '3 days ago',
      quote: 'A main water line burst under my kitchen sink at 2:00 AM. I filled out their form and got a text in under 10 seconds. The crew arrived in 26 minutes—well under their same-day guarantee!',
      metrics: 'Extracted 420 Gallons • Arrived in 26 Mins'
    },
    {
      id: 2,
      name: 'Sarah Jenkins',
      location: 'Houston, TX',
      type: 'Roof Leak & Mold Care',
      rating: 5,
      timeAgo: '1 week ago',
      quote: 'Severe rain tore off shingles and water started dripping through our ceiling. Rapid Home Relief tarped our roof within 40 minutes and billed State Farm directly. Zero out-of-pocket stress.',
      metrics: 'Roof Tarped in 40 Mins • State Farm Billed'
    },
    {
      id: 3,
      name: 'David & Ellen Sterling',
      location: 'Austin, TX',
      type: 'Kitchen Fire & Smoke Cleanup',
      rating: 5,
      timeAgo: '2 weeks ago',
      quote: 'Unbelievable emergency response. The air scrubbers and soot removal teams worked through the night. The crew was extremely professional and treated our home with immense care.',
      metrics: 'Air Quality Cleared • 100% Deodorized'
    }
  ];

  return (
    <section id="reviews" className="py-20 bg-dark-900 border-b border-slate-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Verified Homeowner Reviews
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Trusted When Seconds Count
          </h2>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-slate-300">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-white">4.9 / 5.0 Rating</span>
            <span className="text-slate-500">•</span>
            <span>Based on 1,480+ Emergency Dispatches</span>
          </div>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-amber-400">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">{r.timeAgo}</span>
                </div>

                <Quote className="w-8 h-8 text-emerald-500/20 mb-2" />

                <p className="text-sm text-slate-300 leading-relaxed italic mb-6">
                  "{r.quote}"
                </p>
              </div>

              <div>
                <div className="p-2.5 rounded-xl bg-dark-950 border border-slate-800/80 mb-4 text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{r.metrics}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {r.name} <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </h4>
                    <span className="text-xs text-slate-400">{r.location}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[11px] font-semibold">
                    {r.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 100% Vector Performance Proof Spotlight Card (Zero Photography) */}
        <div className="p-8 rounded-3xl glass-card border border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> 100% Vector Performance & Guarantee Proof
            </div>
            <h3 className="text-2xl font-black text-white">Full Living Room Water Recovery Metrics</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              When a main line burst soaked drywall and flooded hardwood floors, our emergency crew extracted over 600 gallons of standing water, deployed desiccant air movers, and completely restored the home back to pristine condition in under 48 hours.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 0% Structural Mold Spores Remaining
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 600+ Gallons Extracted
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-dark-950 border border-slate-800 text-center space-y-4 shadow-xl">
              <Award className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">ON-TIME PERFORMANCE</span>
                <span className="text-3xl font-mono font-black text-emerald-400">100% Arrival Rate</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                Average Arrival Time: <strong>28 Minutes</strong><br />
                Same-Day Guarantee: <strong>100% On-Time</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
