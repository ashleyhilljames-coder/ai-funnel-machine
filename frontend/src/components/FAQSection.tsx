import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ShieldAlert, PhoneCall } from 'lucide-react';
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL } from '../config/site';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Will my homeowners insurance cover emergency flood and restoration services?',
      a: 'In the vast majority of cases, yes! Homeowners insurance typically covers sudden and accidental water damage (such as burst pipes, appliance overflows, and storm roof leaks) as well as fire and smoke restoration. We provide full loss documentation and bill your carrier directly so you pay $0 upfront.'
    },
    {
      q: 'How fast will local crews arrive at my home?',
      a: 'Our priority dispatch network guarantees on-site arrival within 90 minutes or less, 24/7/365. As soon as you submit our 90-second form, you receive an automated text confirmation with your assigned technician details and live status.'
    },
    {
      q: 'What should I do immediately while waiting for the emergency restoration team?',
      a: '1) If safe, turn off your main water shutoff valve immediately.\n2) Avoid stepping in standing water near electrical outlets or appliances.\n3) Move valuable items and electronics to higher ground.\n4) Do NOT attempt to clean up sewage or soot with domestic household vacuums.'
    },
    {
      q: 'Are there any upfront out-of-pocket costs?',
      a: 'No. For covered insurance claims, we bill your insurance provider directly. We offer 100% free emergency consultations and moisture inspections on-site.'
    },
    {
      q: 'What if I suspect hidden mold behind drywall or under subfloors?',
      a: 'Our certified master technicians use non-invasive FLIR infrared thermal cameras and digital pin moisture meters to locate hidden pockets of water behind walls and beneath flooring before mold spores can colonize.'
    }
  ];

  return (
    <section id="faq" className="py-20 bg-dark-950 border-b border-slate-800 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle className="w-4 h-4" /> Emergency Guidance & FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Get immediate answers regarding insurance billing, crew arrival times, and emergency steps.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-dark-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                    : 'bg-dark-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-white cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      Q{idx + 1}
                    </span>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 whitespace-pre-line animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="mt-12 p-6 rounded-2xl glass-card border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Have an Active Unresolved Leak or Flood?</h4>
              <p className="text-xs text-slate-400">Speak directly with an emergency dispatch operator right now.</p>
            </div>
          </div>
          <a
            href={DISPATCH_PHONE_TEL}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{DISPATCH_PHONE_DISPLAY}</span>
          </a>
        </div>

      </div>
    </section>
  );
};
