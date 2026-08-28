import React, { useState } from 'react';
import { PhoneCall, ShieldAlert, Zap, Clock, CheckCircle2, Search, X, Timer } from 'lucide-react';
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL, SITE_CONFIG } from '../config/site';

interface HeaderProps {
  onTrackDispatch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onTrackDispatch }) => {
  const [scrolled, setScrolled] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    if (!lookupQuery.trim()) {
      setLookupError('Please enter a Dispatch ID (#RHR-XXXX) or Phone Number');
      return;
    }
    onTrackDispatch(lookupQuery.trim());
    setShowLookupModal(false);
    setLookupQuery('');
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* Emergency Alert Top Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs sm:text-sm font-bold shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
            </span>
            <span>● PRIORITY DISPATCH ACTIVE</span>
            <span className="hidden md:inline text-slate-900">|</span>
            <span className="hidden md:inline font-medium">{SITE_CONFIG.guarantee.shortLabel}: <strong className="underline">On-site same day or we pay ${SITE_CONFIG.guarantee.payoutAmount}*</strong></span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Direct Insurance Billing
            </span>
            <span className="flex items-center gap-1 hidden lg:flex">
              <Clock className="w-3.5 h-3.5" /> 24/7 Emergency Crew On Call
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

          {/* Right Header Controls: Track Dispatch & Hotline Call */}
          <div className="flex items-center gap-3">
            
            {/* Track Dispatch Button */}
            <button
              onClick={() => setShowLookupModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <Timer className="w-4 h-4 animate-pulse text-amber-400" />
              <span className="hidden sm:inline">Track Dispatch</span>
              <Search className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Call Hotline Button */}
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

      {/* Track Dispatch Lookup Modal / Popover */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-dark-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowLookupModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Timer className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Track Your Active Dispatch</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Enter your <strong>Dispatch ID</strong> (e.g. <code>#RHR-8492</code>) or the <strong>Phone Number</strong> used during intake to re-open your live 90-minute countdown timer.
            </p>

            {lookupError && (
              <p className="text-xs text-red-400 mb-3 bg-red-500/10 border border-red-500/30 p-2 rounded-lg">
                {lookupError}
              </p>
            )}

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="e.g. #RHR-8492 or (555) 000-0000"
                  className="w-full bg-dark-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 font-mono"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                REOPEN 90-MIN COUNTDOWN TIMER
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
