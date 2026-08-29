import React, { useState } from 'react';
import { PhoneCall, ShieldAlert, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL, SITE_CONFIG } from '../config/site';

interface HeaderProps {
  onTrackDispatch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* Refined Top Announcement Bar */}
      <div className="bg-slate-900 border-b border-amber-500/20 text-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <span className="text-amber-400 font-bold">⚡ Same-Day Guarantee:</span>
            <span className="text-slate-200 font-medium">On-site same day or we pay you ${SITE_CONFIG.guarantee.payoutAmount}*</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Direct Insurance Billing
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> 24/7 Emergency Crew On Call
            </span>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <div className={`transition-all duration-300 ${
        scrolled 
          ? 'bg-dark-900/95 backdrop-blur-md py-3 border-b border-slate-800 shadow-2xl' 
          : 'bg-dark-950/90 backdrop-blur-sm py-4 border-b border-slate-800/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-amber-400 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white">RAPID HOME</span>
                <span className="text-xl font-extrabold tracking-tight text-emerald-400">RELIEF</span>
              </div>
              <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 inline" /> 24/7 Emergency Restoration Network
              </p>
            </div>
          </a>

          {/* Quick Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#dispatch-process" className="hover:text-emerald-400 transition-colors">How It Works</a>
            <a href="#insurance" className="hover:text-emerald-400 transition-colors">Insurance Billing</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          {/* Right Header Controls: Call Hotline */}
          <div className="flex items-center gap-3">
            <a
              href={DISPATCH_PHONE_TEL}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
              <span className="font-black tracking-wide hidden sm:inline">{DISPATCH_PHONE_DISPLAY}</span>
              <span className="font-black tracking-wide sm:hidden">CALL 24/7</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
