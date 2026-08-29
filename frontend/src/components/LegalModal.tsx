import React from 'react';
import { X, ShieldCheck, Lock, FileText, CheckCircle2, PhoneCall, Mail } from 'lucide-react';
import { SITE_CONFIG, DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL, DISPATCH_EMAIL_DISPLAY, DISPATCH_EMAIL_MAILTO } from '../config/site';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = React.useState<'privacy' | 'terms'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-dark-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-slate-200">
        
        {/* Ambient background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {SITE_CONFIG.name} Legal & Compliance Center
              </h3>
              <p className="text-xs text-slate-400">
                Official Privacy Policies & Terms of Emergency Service
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close legal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Controls */}
        <div className="flex items-center gap-2 pt-4 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Emergency Service</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto pr-2 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed py-4 border-y border-slate-800/60 my-2">
          {activeTab === 'privacy' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> 1. Data Protection & Privacy Commitment
                </h4>
                <p>
                  At {SITE_CONFIG.name}, we take your privacy and property security seriously. This policy describes how we collect, use, and safeguard personal information provided during emergency restoration requests.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">2. Information We Collect</h5>
                <p className="text-slate-400">
                  When you request emergency priority dispatch, we collect your Full Name, Cell Phone Number, Email Address, Property Location Address, Emergency Damage Type, Source of Water/Fire, and Affected Room Count.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">3. How We Use Your Information</h5>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>To immediately dispatch vetted, certified local mitigation crews to your property address.</li>
                  <li>To send transactional SMS confirmations and live technician tracking updates to your mobile cell phone.</li>
                  <li>To coordinate direct insurance billing and structural damage documentation with your insurance carrier.</li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">4. Zero Data Selling Guarantee</h5>
                <p className="text-slate-400">
                  We do <strong>NOT</strong> sell, trade, or rent your personal contact information to third-party telemarketers or external lead brokers. Your information is shared exclusively with responding emergency restoration crews assigned to your active service request.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">5. SMS & Mobile Communications Opt-In</h5>
                <p className="text-slate-400">
                  By providing your mobile cell phone number during emergency intake, you expressly consent to receive automated transactional text messages (SMS) regarding crew dispatch status. Standard message & data rates may apply. Reply STOP at any time to opt out.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span>Questions regarding data privacy? Contact our Privacy Officer at </span>
                <a href={DISPATCH_EMAIL_MAILTO} className="text-emerald-400 hover:underline font-bold">
                  {DISPATCH_EMAIL_DISPLAY}
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" /> 1. Emergency Response Terms & Conditions
                </h4>
                <p>
                  By submitting an emergency service request through {SITE_CONFIG.name}, you agree to the following terms governing rapid dispatch, certified mitigation services, and insurance billing.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">2. Same-Day Arrival Guarantee Terms</h5>
                <p className="text-slate-400">
                  The <strong>${SITE_CONFIG.guarantee.payoutAmount} Same-Day Arrival Guarantee</strong> applies to verified emergency property damage requests submitted before {SITE_CONFIG.guarantee.cutoffTimeDisplay} ({SITE_CONFIG.timezone} local time). If our certified mitigation team fails to arrive at the designated property address on the same calendar day, {SITE_CONFIG.name} will remit ${SITE_CONFIG.guarantee.payoutAmount} via cash/check or apply a ${SITE_CONFIG.guarantee.payoutAmount} credit toward your deductible upon verification.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">3. Direct Insurance Billing & $0 Upfront</h5>
                <p className="text-slate-400">
                  Our network technicians perform industrial water extraction, thermal structural drying, and smoke remediation according to standard industry insurance pricing guidelines. We bill your insurance carrier directly. Homeowners remain responsible for policy deductibles unless deductible assistance is explicitly authorized.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-1">4. Property Access & Safety Protocol</h5>
                <p className="text-slate-400">
                  Property owners or authorized representatives must grant mitigation crews access to the affected structures. If safe to do so, property owners are advised to shut off main water supply valves prior to crew arrival to minimize secondary water damage.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span>For emergency service questions or dispatch inquiries, call our 24/7 Dispatch Center at </span>
                <a href={DISPATCH_PHONE_TEL} className="text-amber-400 font-bold hover:underline">
                  {DISPATCH_PHONE_DISPLAY}
                </a>.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official {SITE_CONFIG.name} Network Document</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
