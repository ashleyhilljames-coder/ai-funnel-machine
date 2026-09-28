import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Smartphone, FileText, DollarSign, Mic,
  Download, RefreshCw, Radio, ShieldCheck, CloudOff, CheckCircle2, ChevronRight
} from 'lucide-react';
import { DesktopDispatchBoard } from './DesktopDispatchBoard';
import { MissionJob } from '../../types/missionControl';
import { MobileTechView } from './MobileTechView';
import { InsuranceReportGenerator } from './InsuranceReportGenerator';
import { PayoutLedger } from './PayoutLedger';
import { VoiceRoutingConsole } from './VoiceRoutingConsole';
import { indexedDbSync } from '../../services/indexedDbSync';

export const MissionControlApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'report' | 'payouts' | 'voice'>('desktop');
  const [jobs, setJobs] = useState<MissionJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(true);

  useEffect(() => {
    fetchJobs();

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const checkPending = async () => {
      const count = await indexedDbSync.getPendingCount();
      setPendingSyncCount(count);
    };
    checkPending();
    const unsub = indexedDbSync.subscribe(checkPending);

    // Listen for PWA install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check URL parameters for view switching (e.g., ?view=mobile&jobId=JOB-101)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const jobId = params.get('jobId');
      if (view === 'mobile') setActiveTab('mobile');
      if (view === 'report') setActiveTab('report');
      if (jobId) setSelectedJobId(jobId);
    }

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      unsub();
    };
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mission-control/jobs');
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobs(data.jobs);
        if (!selectedJobId && data.jobs.length > 0) {
          setSelectedJobId(data.jobs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobStageChange = async (
    jobId: string,
    newStage: MissionJob['stage'],
    techName?: string,
    techPhone?: string
  ) => {
    try {
      const res = await fetch(`/api/mission-control/jobs/${jobId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, techName, techPhone })
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
      } else {
        alert(data.error || 'Failed to update job stage');
      }
    } catch (err: any) {
      alert('Stage update exception: ' + err.message);
    }
  };

  const handleInstallPwa = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted PWA installation');
        }
        setDeferredPrompt(null);
      });
    } else {
      alert('To install Syncro Scale Mission Control to your home screen:\n\n• On iOS Safari: Tap the Share icon -> "Add to Home Screen"\n• On Android Chrome: Tap Options (⋮) -> "Install App" or "Add to Home Screen"');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* Top Banner for PWA Install */}
      {showPwaBanner && (
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 fill-slate-950" />
            <span>Install <strong>Syncro Scale Mission Control PWA</strong> for direct home screen access and offline drying logging.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallPwa}
              className="bg-slate-950 hover:bg-slate-900 text-sky-300 font-extrabold px-3 py-1 rounded-lg text-[11px] shadow transition"
            >
              Install App
            </button>
            <button
              onClick={() => setShowPwaBanner(false)}
              className="text-slate-950 hover:text-slate-800 font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Mission Control Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-amber-500 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-sky-500/20">
                SC
              </div>
              <div>
                <h1 className="font-black text-base text-slate-100 tracking-tight flex items-center gap-1.5">
                  SYNCRO SCALE <span className="text-sky-400 font-mono text-xs font-normal">MISSION CONTROL</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">Emergency Restoration Dispatch & Operations CRM</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/"
                className="text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1"
              >
                ← Homeowner Site
              </a>

              {/* Mobile offline status badge */}
              <div className="md:hidden flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[10px] font-bold text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'desktop'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Desktop Board
            </button>

            <button
              onClick={() => setActiveTab('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'mobile'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile Tech View
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'report'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              IICRC Report
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'payouts'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              1099 Ledger
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'voice'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Voice Stream
            </button>
          </nav>

          {/* Desktop Status & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {pendingSyncCount > 0 && (
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold px-2.5 py-1 rounded-full text-[11px]">
                {pendingSyncCount} Offline Queue
              </span>
            )}
            <button
              onClick={fetchJobs}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'desktop' && (
          <DesktopDispatchBoard
            jobs={jobs}
            onJobStageChange={handleJobStageChange}
            onSelectJobForDetails={(id) => {
              setSelectedJobId(id);
              setActiveTab('report');
            }}
            onRefresh={fetchJobs}
          />
        )}

        {activeTab === 'mobile' && (
          <MobileTechView
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            onRefreshData={fetchJobs}
          />
        )}

        {activeTab === 'report' && (
          <InsuranceReportGenerator
            jobs={jobs}
            selectedJobId={selectedJobId}
          />
        )}

        {activeTab === 'payouts' && <PayoutLedger />}

        {activeTab === 'voice' && (
          <VoiceRoutingConsole
            onJobCreated={(newJob) => {
              fetchJobs();
              setSelectedJobId(newJob.id);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500 print:hidden">
        Syncro Scale Mission Control • 24/7 Emergency Restoration Response Operating System
      </footer>
    </div>
  );
};

export default MissionControlApp;
