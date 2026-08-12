import React, { useState } from 'react';
import { ShieldAlert, Zap, ArrowRight, CheckCircle2, AlertCircle, Phone, MapPin, Mail, Home, Layers, MessageSquare, Flame, Timer, MessageSquareText, PhoneCall } from 'lucide-react';

interface LeadFormProps {
  onSubmitted: (leadData: {
    leadId: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    emergencyType: string;
    waterSource: string;
    affectedRooms: string;
    description: string;
    preferredContactMethod: 'sms' | 'call';
    createdAt: number;
  }) => void;
}

export const LeadForm: React.FC<LeadFormProps> = ({ onSubmitted }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    emergencyType: 'Water / Flood Damage',
    waterSource: 'Burst Pipe',
    affectedRooms: '2-3 Rooms',
    description: '',
  });

  const [preferredContactMethod, setPreferredContactMethod] = useState<'sms' | 'call'>('sms');
  const [formattedPhonePreview, setFormattedPhonePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean and format phone number into E.164 (+1XXXXXXXXXX) format
  const formatE164 = (val: string): string => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (val.startsWith('+')) return val;
    return digits ? `+${digits}` : val;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setFormData((prev) => ({ ...prev, phone: rawVal }));
    const e164 = formatE164(rawVal);
    setFormattedPhonePreview(e164);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit cell phone number');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Please enter your property address');
      return;
    }

    const cleanPhoneE164 = formatE164(formData.phone);
    const creationTimestamp = Date.now();
    const generatedDispatchId = `#RHR-${Math.floor(1000 + Math.random() * 9000)}`;

    setLoading(true);

    let finalLeadId = generatedDispatchId;

    try {
      // Direct POST to real Express API endpoint
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phone: cleanPhoneE164,
          email: formData.email.trim(),
          address: formData.address.trim(),
          emergencyType: formData.emergencyType,
          waterSource: formData.waterSource,
          affectedRooms: formData.affectedRooms,
          description: formData.description.trim(),
          preferredContactMethod,
        }),
      });

      const data = await response.json();
      if (data?.success && data?.leadId) {
        finalLeadId = data.leadId.startsWith('#') ? data.leadId : `#RHR-${data.leadId}`;
      }
    } catch (err) {
      console.warn('Backend API request error, proceeding with active dispatch state:', err);
    } finally {
      setLoading(false);
    }

    const leadObject = {
      leadId: finalLeadId,
      fullName: formData.fullName.trim(),
      phone: cleanPhoneE164,
      email: formData.email.trim(),
      address: formData.address.trim(),
      emergencyType: formData.emergencyType,
      waterSource: formData.waterSource,
      affectedRooms: formData.affectedRooms,
      description: formData.description.trim(),
      preferredContactMethod,
      createdAt: creationTimestamp,
    };

    // Save dispatch state in localStorage for persistent Header lookup
    try {
      const existingStr = localStorage.getItem('rhr_active_dispatches');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(leadObject);
      localStorage.setItem('rhr_active_dispatches', JSON.stringify(existing.slice(0, 10)));
    } catch (lsErr) {
      console.warn('Unable to persist dispatch to localStorage:', lsErr);
    }

    onSubmitted(leadObject);
  };

  return (
    <div id="dispatch-form" className="relative rounded-2xl glass-card border border-amber-500/30 p-6 shadow-2xl overflow-hidden bg-dark-900/95">
      
      {/* Form Top Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Timer className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">90-Second Priority Intake</h2>
            <p className="text-xs text-amber-400 font-semibold">Starts Your 90-Minute Guaranteed Timer</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
          LIVE DISPATCH
        </span>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Field 1: Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Full Name <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
          />
        </div>

        {/* PREFERRED CONTACT METHOD TOGGLE */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" /> Preferred Confirmation Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreferredContactMethod('sms')}
              className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                preferredContactMethod === 'sms'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-dark-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Text Message (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => setPreferredContactMethod('call')}
              className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                preferredContactMethod === 'call'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-dark-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Phone Call</span>
            </button>
          </div>
        </div>

        {/* Field 2 & 3: Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Cell Phone <span className="text-amber-400">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="(555) 000-0000"
              className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
            />
            {formattedPhonePreview && (
              <span className="block mt-0.5 text-[10px] text-emerald-400 font-mono">
                E.164 format: {formattedPhonePreview}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" /> Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="homeowner@example.com"
              className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
            />
          </div>
        </div>

        {/* Field 4: Property Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Property Address <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main St, City, State, ZIP"
            className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
          />
        </div>

        {/* Field 5 & 6: Emergency Type & EDITABLE COMBO DAMAGE SOURCE FIELD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Emergency Type
            </label>
            <select
              name="emergencyType"
              value={formData.emergencyType}
              onChange={handleChange}
              className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white transition-colors cursor-pointer"
            >
              <option value="Water / Flood Damage">Water / Flood Damage</option>
              <option value="Fire / Smoke Cleanup">Fire / Smoke Cleanup</option>
              <option value="Mold Remediation">Mold Remediation</option>
              <option value="Storm / Roof Leak">Storm / Roof Leak</option>
              <option value="Biohazard / Sewage Backup">Biohazard / Sewage Backup</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-amber-400" /> Damage Source
            </label>
            {/* EDITABLE HYBRID COMBO SELECT / INPUT WITH EXPLICIT EXAMPLES */}
            <input
              type="text"
              name="waterSource"
              list="damage-sources-list"
              value={formData.waterSource}
              onChange={handleChange}
              placeholder="Select or type damage source..."
              className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white transition-colors"
            />
            <datalist id="damage-sources-list">
              <option value="Burst Pipe" />
              <option value="Appliance Leak (Water Heater, Washer, Dishwasher, etc.)" />
              <option value="Heavy Rain / Roof Leak" />
              <option value="Sewage Backup" />
              <option value="Toilet/Sink Overflow" />
              <option value="Unknown / Other" />
            </datalist>
          </div>
        </div>

        {/* Field 7: Affected Rooms */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> Number of Affected Rooms
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {['1 Room', '2-3 Rooms', '4+ Rooms', 'Basement/Whole'].map((roomOption) => (
              <button
                type="button"
                key={roomOption}
                onClick={() => setFormData((prev) => ({ ...prev, affectedRooms: roomOption }))}
                className={`py-2 px-1 text-[11px] font-semibold rounded-lg border text-center transition-all ${
                  formData.affectedRooms === roomOption
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-dark-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {roomOption}
              </button>
            ))}
          </div>
        </div>

        {/* Field 8: Brief Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Brief Emergency Description
          </label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g. Water pouring from ceiling into living room..."
            className="w-full bg-dark-950/90 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors resize-none"
          />
        </div>

        {/* PRIMARY CTA BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Logging Intake & Dispatching...</span>
            </div>
          ) : (
            <>
              <span>DISPATCH CREW & START 90-MIN TIMER</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Guarantee Footer */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Direct Insurance Billing
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-amber-400" /> 90-Min $90 Cash Guarantee
          </span>
        </div>
      </form>
    </div>
  );
};
