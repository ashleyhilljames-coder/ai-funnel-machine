import React, { useState } from 'react';
import {
  Send, Phone, MapPin, AlertTriangle, UserCheck, ShieldCheck,
  Search, Lock, CheckCircle2, ChevronRight, FileText
} from 'lucide-react';

import type { MissionJob, MissionJobStage } from '../../types/missionControl';
export type { MissionJob };

interface DesktopDispatchBoardProps {
  jobs: MissionJob[];
  onJobStageChange: (jobId: string, newStage: MissionJobStage, techName?: string, techPhone?: string) => Promise<void>;
  onSelectJobForDetails: (jobId: string) => void;
  onRefresh: () => void;
}

const STAGES: { id: MissionJobStage; label: string; color: string; border: string }[] = [
  { id: 'NEW_INTAKE', label: 'New Intake', color: 'bg-rose-500/10 text-rose-400', border: 'border-rose-500/30' },
  { id: 'DISPATCHED', label: 'Dispatched', color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/30' },
  { id: 'ON_SITE', label: 'On-Site', color: 'bg-sky-500/10 text-sky-400', border: 'border-sky-500/30' },
  { id: 'DRYING', label: 'Drying Active', color: 'bg-cyan-500/10 text-cyan-400', border: 'border-cyan-500/30' },
  { id: 'SCOPING', label: 'Scoping / Scope', color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/30' },
  { id: 'BILLED', label: 'Billed', color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'CLOSED', label: 'Closed', color: 'bg-slate-500/10 text-slate-400', border: 'border-slate-500/30' },
];

export const DesktopDispatchBoard: React.FC<DesktopDispatchBoardProps> = ({
  jobs,
  onJobStageChange,
  onSelectJobForDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatchModalJob, setDispatchModalJob] = useState<MissionJob | null>(null);
  const [selectedTech, setSelectedTech] = useState({
    name: 'Evan Davis (EcoDry Response)',
    phone: '+17025550111'
  });
  const [dispatching, setDispatching] = useState(false);

  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    return (
      j.id.toLowerCase().includes(q) ||
      j.homeowner_name.toLowerCase().includes(q) ||
      j.address.toLowerCase().includes(q) ||
      j.damage_type.toLowerCase().includes(q) ||
      j.homeowner_phone.includes(q)
    );
  });

  const handleExecuteDispatch = async () => {
    if (!dispatchModalJob) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/mission-control/jobs/${dispatchModalJob.id}/dispatch-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techName: selectedTech.name,
          techPhone: selectedTech.phone
        })
      });

      const data = await res.json();
      if (data.success) {
        await onJobStageChange(dispatchModalJob.id, 'DISPATCHED', selectedTech.name, selectedTech.phone);
        setDispatchModalJob(null);
      } else {
        alert(data.error || 'Dispatch SMS failed');
      }
    } catch (err: any) {
      alert('Dispatch exception: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            🎛️ Real-Time Dispatch Board
          </h2>
          <p className="text-xs text-slate-400">
            Emergency mitigation workflow across 7 stages with instant Twilio tech dispatch and race locking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search homeowner, phone, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64 transition"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-6 min-h-[600px]">
        {STAGES.map((stage) => {
          const stageJobs = filteredJobs.filter((j) => j.stage === stage.id);

          return (
            <div
              key={stage.id}
              className={`bg-slate-900/60 border ${stage.border} rounded-xl p-3 flex flex-col min-w-[260px]`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {stageJobs.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-grow overflow-y-auto max-h-[700px] pr-1">
                {stageJobs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-600 italic">
                    No jobs in {stage.label}
                  </div>
                ) : (
                  stageJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-slate-950/90 border border-slate-800 hover:border-sky-500/50 rounded-xl p-3.5 space-y-3 shadow-md hover:shadow-sky-500/5 transition group"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wide block">
                            {job.id}
                          </span>
                          <h4 className="font-bold text-sm text-slate-100 line-clamp-1 group-hover:text-sky-300 transition">
                            {job.homeowner_name}
                          </h4>
                        </div>
                        {job.locked_by_tech && (
                          <div title={`Locked by ${job.locked_by_tech}`} className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            Locked
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{job.damage_type}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                          <span className="line-clamp-2 text-[11px] leading-tight">{job.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <a href={`tel:${job.homeowner_phone}`} className="hover:text-sky-400 transition">
                            {job.homeowner_phone}
                          </a>
                        </div>
                      </div>

                      {/* Deepgram Transcript Preview */}
                      {job.call_transcript && (
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-400 italic line-clamp-2">
                          "{job.call_transcript.replace(/\[.*?\]/g, '').trim()}"
                        </div>
                      )}

                      {/* Assigned Tech Tag */}
                      {job.assigned_tech_name && (
                        <div className="flex items-center gap-1 text-[11px] text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md border border-sky-500/20">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="truncate">{job.assigned_tech_name}</span>
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onSelectJobForDetails(job.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Details
                        </button>

                        {job.stage === 'NEW_INTAKE' && (
                          <button
                            onClick={() => setDispatchModalJob(job)}
                            className="flex items-center gap-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg shadow-md transition"
                          >
                            <Send className="w-3 h-3" />
                            Dispatch SMS
                          </button>
                        )}

                        {job.stage !== 'NEW_INTAKE' && (
                          <select
                            value={job.stage}
                            onChange={(e) => onJobStageChange(job.id, e.target.value as MissionJobStage)}
                            className="text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* One-Click Twilio SMS Dispatch Modal */}
      {dispatchModalJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg text-slate-100">Dispatch Technician via SMS</h3>
              </div>
              <button
                onClick={() => setDispatchModalJob(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p><span className="text-slate-400">Job:</span> <strong className="text-sky-400">{dispatchModalJob.id}</strong> - {dispatchModalJob.damage_type}</p>
              <p><span className="text-slate-400">Homeowner:</span> {dispatchModalJob.homeowner_name} ({dispatchModalJob.homeowner_phone})</p>
              <p><span className="text-slate-400">Address:</span> {dispatchModalJob.address}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Assign On-Call Field Technician:</label>
              <select
                value={selectedTech.name}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('Evan')) {
                    setSelectedTech({ name: 'Evan Davis (EcoDry Response)', phone: '+17025550111' });
                  } else {
                    setSelectedTech({ name: 'Alex Rivera (ProRestor LV)', phone: '+17025550222' });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Evan Davis (EcoDry Response)">Evan Davis (EcoDry Response) - +1 (702) 555-0111</option>
                <option value="Alex Rivera (ProRestor LV)">Alex Rivera (ProRestor LV) - +1 (702) 555-0222</option>
              </select>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 leading-relaxed">
              <strong>State Lock Warning:</strong> Once dispatched, an automated Twilio SMS with a 1-tap mobile accept link will be sent to <strong>{selectedTech.name}</strong>. Accepting locks the job to prevent technician racing.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDispatchModalJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDispatch}
                disabled={dispatching}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg shadow-lg shadow-amber-500/20 transition"
              >
                {dispatching ? 'Dispatching...' : 'Send SMS Dispatch'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
