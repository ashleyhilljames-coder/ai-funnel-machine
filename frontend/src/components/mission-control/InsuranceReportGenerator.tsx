import React, { useState, useEffect } from 'react';
import { Printer, Download, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import {
  MissionJob,
  MoistureReading,
  EquipmentLog,
  LossPhoto,
  JobDetailsResponse
} from '../../types/missionControl';

interface InsuranceReportGeneratorProps {
  jobs: MissionJob[];
  selectedJobId?: string;
}

export const InsuranceReportGenerator: React.FC<InsuranceReportGeneratorProps> = ({
  jobs,
  selectedJobId
}) => {
  const [activeJobId, setActiveJobId] = useState<string>(selectedJobId || jobs[0]?.id || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [jobDetail, setJobDetail] = useState<JobDetailsResponse | null>(null);

  useEffect(() => {
    if (selectedJobId) {
      setActiveJobId(selectedJobId);
    }
  }, [selectedJobId]);

  useEffect(() => {
    if (!activeJobId) return;
    fetchJobDetails(activeJobId);
  }, [activeJobId]);

  const fetchJobDetails = async (jobId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mission-control/jobs/${jobId}/details`);
      const data = await res.json();
      if (data.success) {
        setJobDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch report detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const selectedJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Job Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            📄 IICRC-Compliant Insurance Drying & Scope Report
          </h2>
          <p className="text-xs text-slate-400">
            Generate 1-click official Loss & Moisture Summary report for State Farm, Farmers, Allstate, and Liberty Mutual claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeJobId}
            onChange={(e) => setActiveJobId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-sky-400 focus:outline-none focus:border-sky-500"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.id} - {j.homeowner_name} ({j.damage_type})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            1-Click Export / Print PDF
          </button>
        </div>
      </div>

      {/* Report Document Printable Container */}
      {loading || !jobDetail ? (
        <div className="p-12 text-center text-slate-400">Loading IICRC report data...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-4xl mx-auto text-slate-100 space-y-6 shadow-2xl print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
          {/* Document Header */}
          <div className="border-b-2 border-amber-500/80 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 print:text-amber-600">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-widest">SYNCRO SCALE MISSION CONTROL</span>
              </div>
              <h1 className="text-2xl font-black text-slate-100 print:text-black tracking-tight mt-1">
                EMERGENCY PROPERTY RESTORATION & MOISTURE REPORT
              </h1>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Standard ANSI/IICRC S500 Water Damage & Structural Drying Compliance Certification
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono bg-amber-500/10 text-amber-400 print:bg-gray-100 print:text-black px-3 py-1 rounded-md font-bold border border-amber-500/20">
                CLAIM ID: {jobDetail.job.id}
              </span>
              <p className="text-[11px] text-slate-400 print:text-gray-500 mt-1">
                Report Date: {new Date().toLocaleDateString('en-US')}
              </p>
            </div>
          </div>

          {/* Homeowner & Loss Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/60 print:bg-gray-50 p-4 rounded-xl border border-slate-800 print:border-gray-300 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-sky-400 print:text-sky-800 uppercase text-[10px] tracking-wider">Property Owner Info</h4>
              <p><strong className="text-slate-300 print:text-black">Name:</strong> {jobDetail.job.homeowner_name}</p>
              <p><strong className="text-slate-300 print:text-black">Phone:</strong> {jobDetail.job.homeowner_phone}</p>
              <p><strong className="text-slate-300 print:text-black">Address:</strong> {jobDetail.job.address}</p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-extrabold text-amber-400 print:text-amber-800 uppercase text-[10px] tracking-wider">Loss Incident Metadata</h4>
              <p><strong className="text-slate-300 print:text-black">Emergency Type:</strong> {jobDetail.job.damage_type}</p>
              <p><strong className="text-slate-300 print:text-black">Water Source:</strong> {jobDetail.job.water_source}</p>
              <p><strong className="text-slate-300 print:text-black">Affected Areas:</strong> {jobDetail.job.affected_rooms}</p>
            </div>
          </div>

          {/* Room Psychrometric Log Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-200 print:text-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 print:text-cyan-700" />
              Psychrometric Drying Logs (IICRC S500 Grid)
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black border-b border-slate-800">
                  <th className="p-2.5">Date / Time</th>
                  <th className="p-2.5">Room Location</th>
                  <th className="p-2.5">Temp (°F)</th>
                  <th className="p-2.5">RH (%)</th>
                  <th className="p-2.5">Wood Moisture</th>
                  <th className="p-2.5">Drywall Moisture</th>
                  <th className="p-2.5">Equipment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                {jobDetail.moistureReadings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-slate-500 italic">No psychrometric readings logged yet.</td>
                  </tr>
                ) : (
                  jobDetail.moistureReadings.map((mr) => (
                    <tr key={mr.id} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                      <td className="p-2.5 text-slate-400 print:text-black font-mono">{new Date(mr.timestamp).toLocaleDateString()}</td>
                      <td className="p-2.5 font-bold text-slate-200 print:text-black">{mr.room_name}</td>
                      <td className="p-2.5 font-mono">{mr.ambient_temp_f}°F</td>
                      <td className="p-2.5 font-mono text-cyan-400 print:text-cyan-800 font-bold">{mr.relative_humidity_pct}%</td>
                      <td className="p-2.5 font-mono">{mr.wood_moisture_pct}%</td>
                      <td className="p-2.5 font-mono">{mr.drywall_moisture_pct}%</td>
                      <td className="p-2.5 text-[11px] text-slate-300 print:text-black">
                        {mr.air_movers_count} Air Movers | {mr.dehumidifiers_count} Dehum
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Placed Equipment */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-200 print:text-black">Placed Equipment Inventory</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {jobDetail.equipment.map((eq) => (
                <div key={eq.id} className="bg-slate-950 print:bg-gray-100 p-2.5 rounded-lg border border-slate-800 print:border-gray-300">
                  <p className="font-bold text-slate-200 print:text-black">{eq.equipment_name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">SN: {eq.serial_no}</p>
                  <p className="text-[10px] text-sky-400">{eq.room_name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Loss Photos */}
          {jobDetail.photos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-slate-200 print:text-black">Loss Inspection Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {jobDetail.photos.map((ph) => (
                  <div key={ph.id} className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <img src={ph.photo_url} alt={ph.caption} className="w-full h-28 object-cover rounded-md" />
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{ph.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Authorization Signature Block */}
          <div className="border-t border-slate-800 print:border-gray-400 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-300 print:text-black">Homeowner Digital Work Authorization</p>
              <p className="text-[10px] text-slate-400 print:text-gray-500">IICRC Emergency Services Authorization Signed On-Site</p>
            </div>
            {jobDetail.job.signature_data ? (
              <div className="bg-slate-950 print:bg-gray-100 p-2 rounded-lg border border-slate-800">
                <img src={jobDetail.job.signature_data} alt="Homeowner Signature" className="h-12 object-contain invert print:invert-0" />
              </div>
            ) : (
              <div className="text-xs text-rose-400 font-semibold italic">Pending Homeowner Signature</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
