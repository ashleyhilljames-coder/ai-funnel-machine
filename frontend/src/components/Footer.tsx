import React from 'react';
import { ShieldAlert, PhoneCall, Zap, Lock, MapPin } from 'lucide-react';
import {
  DISPATCH_PHONE_DISPLAY,
  DISPATCH_PHONE_TEL,
  GUARANTEE_TITLE,
} from '../config/site';

interface FooterProps {
  onOpenLegalModal?: (tab: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegalModal }) => {
  return (
    <footer className="bg-dark-950 text-slate-400 text-xs py-14 border-t border-slate-800 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-dark-950 rounded-[6px] flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <span className="text-lg font-black text-white tracking-tight">
                RAPID HOME <span className="text-emerald-400">RELIEF</span>
              </span>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Nationwide priority emergency response network for water extraction, flood restoration, fire soot cleanup, mold remediation, and emergency roof tarping.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 24/7/365 Automated Priority Dispatch
            </div>
          </div>

          {/* Col 2: Emergency Services */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Restoration Services</h4>
            <ul className="space-y-2.5">
              <li><a href="#dispatch-form" className="hover:text-emerald-400 transition-colors">Water & Flood Extraction</a></li>
              <li><a href="#dispatch-form" className="hover:text-emerald-400 transition-colors">Fire & Smoke Restoration</a></li>
              <li><a href="#dispatch-form" className="hover:text-emerald-400 transition-colors">Black Mold Remediation</a></li>
              <li><a href="#dispatch-form" className="hover:text-emerald-400 transition-colors">Emergency Roof Tarping</a></li>
              <li><a href="#dispatch-form" className="hover:text-emerald-400 transition-colors">Structural Thermal Drying</a></li>
            </ul>
          </div>

          {/* Col 3: Insurance & Guarantees */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Trust & Billing</h4>
            <ul className="space-y-2.5">
              <li><a href="#insurance" className="hover:text-emerald-400 transition-colors">Direct Insurance Billing</a></li>
              <li><a href="#insurance" className="hover:text-emerald-400 transition-colors">Approved Carrier Network</a></li>
              <li><a href="#dispatch-process" className="hover:text-emerald-400 transition-colors">{GUARANTEE_TITLE}</a></li>
              <li><a href="#insurance" className="hover:text-emerald-400 transition-colors">IICRC Master Certifications</a></li>
              <li><a href="#faq" className="hover:text-emerald-400 transition-colors">Emergency Intake FAQ</a></li>
            </ul>
          </div>

          {/* Col 4: Dispatch Contact Info */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Dispatch Center</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-white">24/7 Priority Hotline</span>
                  <a href={DISPATCH_PHONE_TEL} className="text-amber-400 font-bold hover:underline">{DISPATCH_PHONE_DISPLAY}</a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Serving Nevada, Utah & Arizona</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Bottom Line */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Rapid Home Relief Emergency Network. All rights reserved.</p>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" /> 256-Bit SSL Encrypted Intake
            </span>

            <button
              onClick={() => onOpenLegalModal?.('privacy')}
              className="text-slate-400 hover:text-emerald-400 underline transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>

            <button
              onClick={() => onOpenLegalModal?.('terms')}
              className="text-slate-400 hover:text-emerald-400 underline transition-colors cursor-pointer"
            >
              Terms of Emergency Service
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
