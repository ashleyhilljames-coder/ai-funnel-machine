import React, { useState, useEffect } from 'react';
import { Radio, Zap, Send, PhoneCall, AlertTriangle, CheckCircle2, MessageSquare, ExternalLink, ShieldCheck, Edit3 } from 'lucide-react';

export interface ScrapedLead {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  emergencyType: string;
  waterSource?: string;
  affectedRooms?: string;
  description: string;
  source: 'Nextdoor' | 'Facebook Group' | 'County Feed' | 'Community Forum';
  confidenceScore: number;
  scrapedAt: string;
  rawPostUrl?: string;
  hasPhone: boolean;
  smsDispatched?: boolean;
  lastSmsSid?: string;
  lastSmsAt?: string;
}

export const ScrapedLeadsQueue: React.FC = () => {
  const [leads, setLeads] = useState<ScrapedLead[]>([
    {
      id: 'SCRAPE-101',
      fullName: 'Sarah Jenkins',
      phone: '+17025550144',
      email: 'sarah.jenkins@social-lead.org',
      address: '4820 W Flamingo Rd, Las Vegas, NV',
      emergencyType: 'pipe burst, water leaking',
      waterSource: 'Bathroom Pipe Leak',
      affectedRooms: 'Ceiling / Living Room',
      description: 'Emergency! Major pipe burst in my upstairs bathroom! Water leaking through ceiling fast down into living room!',
      source: 'Nextdoor',
      confidenceScore: 98,
      scrapedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      rawPostUrl: 'https://nextdoor.com/p/emergency-pipe-burst-lv',
      hasPhone: true,
      smsDispatched: false
    },
    {
      id: 'SCRAPE-102',
      fullName: 'Robert Chen',
      phone: '(Enrichment Needed)',
      email: 'robert.chen@social-lead.org',
      address: '7310 S Rainbow Blvd, Spring Valley, NV',
      emergencyType: 'basement flooding',
      waterSource: 'Storm Line Break',
      affectedRooms: 'Basement / Storage',
      description: 'Our basement is completely flooded after heavy storm line break! Looking for immediate water extraction team.',
      source: 'Facebook Group',
      confidenceScore: 94,
      scrapedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      rawPostUrl: 'https://facebook.com/groups/springvalley/posts/991204',
      hasPhone: false,
      smsDispatched: false
    },
    {
      id: 'SCRAPE-103',
      fullName: 'Elena Rostova',
      phone: '+17025550188',
      email: 'elena.rostova@social-lead.org',
      address: '1205 E Tropicana Ave, Paradise, NV',
      emergencyType: 'roof leak, ceiling dripping',
      waterSource: 'Roof Leak',
      affectedRooms: 'Master Bedroom',
      description: 'Roof leak dripping heavily in master bedroom during rainfall, ceiling dripping in 2 rooms!',
      source: 'County Feed',
      confidenceScore: 92,
      scrapedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      rawPostUrl: 'https://clarkcounty.gov/incidents/roof-leak-tropicana',
      hasPhone: true,
      smsDispatched: false
    }
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);

  // Custom SMS messages dictionary mapping leadId -> edited message text
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});

  // Phone enrichment modal state
  const [enrichModalLead, setEnrichModalLead] = useState<ScrapedLead | null>(null);
  const [inputPhone, setInputPhone] = useState<string>('');
  const [modalSmsMessage, setModalSmsMessage] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchScrapedLeads();
  }, []);

  const fetchScrapedLeads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leads/scraped');
      if (res.ok) {
        const data = await res.json();
        if (data.leads && Array.isArray(data.leads) && data.leads.length > 0) {
          setLeads(data.leads);
        }
      }
    } catch (err) {
      console.warn('Unable to load live scraped leads, using local active queue state.', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerScraper = async () => {
    setIsScraping(true);
    try {
      const res = await fetch('/api/leads/trigger-scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => [data.lead, ...prev]);
        showNotification('success', `⚡ Emergency Scraper triggered! New lead captured from ${data.lead.source}.`);
      } else {
        showNotification('error', data.error || 'Scraper execution returned no new leads.');
      }
    } catch (err: any) {
      showNotification('error', `Scraper trigger error: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const toE164 = (phoneStr: string): string => {
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (phoneStr.startsWith('+')) return phoneStr;
    return digits ? `+${digits}` : phoneStr;
  };

  const getDefaultSmsMessage = (lead: ScrapedLead): string => {
    return `Hi ${lead.fullName}, this is Rapid Home Relief. We saw your post regarding ${lead.emergencyType}. Our local certified mitigation crew is available to dispatch immediately with our 90-Min Arrival Guarantee. Tap here to track dispatch: https://rapidhomerelief.com/dispatch`;
  };

  const getLeadSmsMessage = (lead: ScrapedLead): string => {
    return customMessages[lead.id] ?? getDefaultSmsMessage(lead);
  };

  const handleSmsMessageChange = (leadId: string, text: string) => {
    setCustomMessages((prev) => ({
      ...prev,
      [leadId]: text
    }));
  };

  const handleSmsActionClick = (lead: ScrapedLead) => {
    const currentMessage = getLeadSmsMessage(lead);
    if (!lead.hasPhone || !lead.phone || lead.phone.includes('Enrichment') || lead.phone.trim().length < 7) {
      // Prompt modal for phone enrichment fallback with message preview
      setEnrichModalLead(lead);
      setInputPhone('');
      setModalSmsMessage(currentMessage);
    } else {
      dispatchOutboundSms(lead, lead.phone, currentMessage);
    }
  };

  const handleEnrichSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrichModalLead) return;

    const cleanPhone = inputPhone.trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    const formattedE164 = toE164(cleanPhone);
    const targetLead = enrichModalLead;
    const finalMessage = modalSmsMessage.trim() || getDefaultSmsMessage(targetLead);

    setEnrichModalLead(null);
    dispatchOutboundSms(targetLead, formattedE164, finalMessage);
  };

  const dispatchOutboundSms = async (lead: ScrapedLead, phoneToUse: string, messagePayload: string) => {
    const formattedE164 = toE164(phoneToUse);
    setSendingSmsId(lead.id);

    try {
      const response = await fetch('/api/leads/outbound-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          phone: formattedE164,
          name: lead.fullName,
          message: messagePayload
        })
      });

      const resData = await response.json();

      if (resData.success) {
        setLeads((prev) =>
          prev.map((item) =>
            item.id === lead.id
              ? {
                  ...item,
                  phone: formattedE164,
                  hasPhone: true,
                  smsDispatched: true,
                  lastSmsSid: resData.sid,
                  lastSmsAt: new Date().toLocaleTimeString()
                }
              : item
          )
        );
        showNotification('success', `📱 Outbound SMS dispatched to ${formattedE164} (${lead.fullName}) via Twilio!`);
      } else {
        showNotification('error', resData.error || 'Failed to dispatch outbound SMS.');
      }
    } catch (err: any) {
      showNotification('error', `SMS Dispatch Failed: ${err.message}`);
    } finally {
      setSendingSmsId(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'Nextdoor':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Facebook Group':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'County Feed':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100 font-sans my-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-50 flex items-center gap-2">
                Emergency Scraped Leads Queue
              </h2>
              <p className="text-xs text-slate-400">
                Live monitoring of disaster feeds for water damage, pipe bursts & roof leaks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Status Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400">Scraper: ACTIVE</span>
          </div>

          {/* Trigger Scraper Action */}
          <button
            onClick={handleTriggerScraper}
            disabled={isScraping}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-cyan-950/50 cursor-pointer"
          >
            <Zap className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            {isScraping ? 'Scraping Feeds...' : 'Trigger Scraper Engine'}
          </button>
        </div>
      </div>

      {/* Toast Notification Alert */}
      {notification && (
        <div
          className={`my-4 p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>
      )}

      {/* Queue Cards List */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading active emergency leads queue...</div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No emergency incident leads in queue.</div>
        ) : (
          leads.map((lead) => {
            const currentMessage = getLeadSmsMessage(lead);
            const postUrl = lead.rawPostUrl || '#';

            return (
              <div
                key={lead.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition duration-200 shadow-md relative overflow-hidden"
              >
                {/* Card Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-base">{lead.fullName}</span>
                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold border rounded-md ${getSourceBadgeColor(lead.source)}`}>
                      {lead.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Original Post / Direct Reply Link */}
                    {postUrl && postUrl !== '#' && (
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 rounded-lg flex items-center gap-1.5 transition"
                        title="Open original post on social platform to reply directly"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Original Post / Direct Reply
                      </a>
                    )}

                    {/* Keyword Match Confidence Badge */}
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {lead.confidenceScore}% Intent Match
                    </span>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(lead.scrapedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Property Address & Incident Details */}
                <div className="text-xs text-slate-300 space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <span className="text-slate-500">📍 Property:</span>
                    <span className="text-slate-200">{lead.address}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">🚨 Disaster Keywords:</span>
                    <span className="px-2 py-0.5 bg-red-950/60 border border-red-800/40 text-red-300 font-mono font-medium rounded text-[11px]">
                      {lead.emergencyType}
                    </span>
                  </div>
                </div>

                {/* Raw Post Content Description */}
                <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300 italic mb-3">
                  "{lead.description}"
                </div>

                {/* Live Editable Outbound SMS Message Preview Box */}
                <div className="mb-4 bg-slate-900 border border-slate-800 rounded-lg p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" />
                      Live Outbound SMS Response Preview (Editable)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentMessage.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={currentMessage}
                    onChange={(e) => handleSmsMessageChange(lead.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/80 rounded-md p-2 text-xs text-slate-100 font-mono focus:outline-none transition resize-y"
                    placeholder="Enter custom SMS response..."
                  />
                </div>

                {/* Card Action & Phone Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900">
                  <div className="flex items-center gap-2 text-xs">
                    <PhoneCall className="w-4 h-4 text-slate-500" />
                    {lead.hasPhone && !lead.phone.includes('Enrichment') ? (
                      <span className="font-mono text-emerald-400 font-semibold">{lead.phone}</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold rounded text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Phone Enrichment Needed
                      </span>
                    )}
                  </div>

                  <div>
                    {lead.smsDispatched ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        Outbound SMS Dispatched {lead.lastSmsAt ? `(${lead.lastSmsAt})` : ''}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSmsActionClick(lead)}
                        disabled={sendingSmsId === lead.id}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-emerald-950/50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingSmsId === lead.id ? 'Sending SMS Response...' : 'Trigger Outbound SMS Response'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Phone Enrichment Fallback Modal */}
      {enrichModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                Enrich Contact Phone Number & Outbound SMS
              </h3>
              <button onClick={() => setEnrichModalLead(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrichSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-400">
                Lead <strong className="text-slate-200">{enrichModalLead.fullName}</strong> from {enrichModalLead.source} lacks a public phone number. Enter a phone number below to dispatch the Twilio outbound SMS response.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number (E.164 auto-formatted):
                </label>
                <input
                  type="text"
                  placeholder="e.g., (702) 555-0199"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Outbound SMS Text Preview (Editable):</span>
                  <span className="text-[10px] text-slate-500 font-mono">{modalSmsMessage.length} chars</span>
                </label>
                <textarea
                  rows={3}
                  value={modalSmsMessage}
                  onChange={(e) => setModalSmsMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrichModalLead(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save & Trigger SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapedLeadsQueue;
