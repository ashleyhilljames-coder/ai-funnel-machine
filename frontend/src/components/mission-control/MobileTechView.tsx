import React, { useState, useEffect } from 'react';
import {
  Navigation, Phone, Camera, PenTool, CheckCircle2, Thermometer,
  CloudOff, RefreshCw, Plus, Sparkles, MapPin, Send, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { indexedDbSync, PendingMoisture, PendingPhoto } from '../../services/indexedDbSync';
import { MissionJob, LossPhotoCategory } from '../../types/missionControl';

interface MobileTechViewProps {
  jobs: MissionJob[];
  selectedJobId?: string;
  onSelectJob: (jobId: string) => void;
  onRefreshData: () => void;
}

export const MobileTechView: React.FC<MobileTechViewProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  onRefreshData
}) => {
  const activeJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  const [enRouteSent, setEnRouteSent] = useState<boolean>(false);
  const [sendingEnRoute, setSendingEnRoute] = useState<boolean>(false);

  // Moisture Log Form State
  const [roomName, setRoomName] = useState('Living Room');
  const [tempF, setTempF] = useState('74.0');
  const [rhPct, setRhPct] = useState('65.0');
  const [woodPct, setWoodPct] = useState('26.0');
  const [drywallPct, setDrywallPct] = useState('38.0');
  const [airMovers, setAirMovers] = useState('3');
  const [dehumidifiers, setDehumidifiers] = useState('1');
  const [techNotes, setTechNotes] = useState('');
  const [savingReading, setSavingReading] = useState(false);

  // Photo state
  const [photoCaption, setPhotoCaption] = useState('Initial Water Damage');
  const [photoCategory, setPhotoCategory] = useState<LossPhotoCategory>('INITIAL_DAMAGE');

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const updatePending = async () => {
      const count = await indexedDbSync.getPendingCount();
      setPendingCount(count);
    };

    updatePending();
    const unsubscribe = indexedDbSync.subscribe(updatePending);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      unsubscribe();
    };
  }, []);

  const handleSendEnRoute = async () => {
    if (!activeJob) return;
    setSendingEnRoute(true);
    try {
      const res = await fetch(`/api/mission-control/jobs/${activeJob.id}/en-route-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etaMinutes: 20 })
      });
      const data = await res.json();
      if (data.success) {
        setEnRouteSent(true);
        onRefreshData();
      } else {
        alert(data.error || 'Failed to send En Route SMS');
      }
    } catch (err: any) {
      alert('En Route SMS exception: ' + err.message);
    } finally {
      setSendingEnRoute(false);
    }
  };

  const handleSaveMoistureReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    setSavingReading(true);
    const readingData: PendingMoisture = {
      job_id: activeJob.id,
      room_name: roomName,
      ambient_temp_f: parseFloat(tempF) || 72,
      relative_humidity_pct: parseFloat(rhPct) || 50,
      wood_moisture_pct: parseFloat(woodPct) || 15,
      drywall_moisture_pct: parseFloat(drywallPct) || 15,
      air_movers_count: parseInt(airMovers, 10) || 0,
      dehumidifiers_count: parseInt(dehumidifiers, 10) || 0,
      tech_notes: techNotes,
      timestamp: new Date().toISOString()
    };

    try {
      if (isOnline) {
        const res = await fetch(`/api/mission-control/jobs/${activeJob.id}/moisture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(readingData)
        });
        if (res.ok) {
          alert('✅ Moisture reading saved successfully!');
          onRefreshData();
        } else {
          throw new Error('Server error');
        }
      } else {
        await indexedDbSync.saveOfflineMoisture(readingData);
        alert('📶 Device is offline. Moisture reading queued locally in IndexedDB!');
      }

      setTechNotes('');
    } catch (err) {
      console.warn('Falling back to IndexedDB:', err);
      await indexedDbSync.saveOfflineMoisture(readingData);
      alert('📶 Saved to IndexedDB offline queue.');
    } finally {
      setSavingReading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJob) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;

      const photoData: PendingPhoto = {
        job_id: activeJob.id,
        photo_url: base64Data,
        caption: photoCaption,
        category: photoCategory,
        timestamp: new Date().toISOString()
      };

      try {
        if (isOnline) {
          const res = await fetch(`/api/mission-control/jobs/${activeJob.id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(photoData)
          });
          if (res.ok) {
            alert('📷 Loss photo uploaded and saved to Cloud Storage!');
            onRefreshData();
          } else {
            throw new Error('Upload error');
          }
        } else {
          await indexedDbSync.saveOfflinePhoto(photoData);
          alert('📷 Loss photo stored in IndexedDB offline queue!');
        }
      } catch (err) {
        await indexedDbSync.saveOfflinePhoto(photoData);
        alert('📷 Saved photo to IndexedDB offline storage.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/mission-control/jobs/${activeJob.id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData: signatureDataUrl })
      });
      if (res.ok) {
        alert('✍️ Homeowner Work Authorization signed and locked!');
        setShowSignatureModal(false);
        onRefreshData();
      }
    } catch (err: any) {
      alert('Error saving signature: ' + err.message);
    }
  };

  if (!activeJob) {
    return (
      <div className="p-6 text-center text-slate-400">
        No active emergency jobs assigned.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 pb-16">
      {/* Network Status Badge */}
      <div className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold ${
        isOnline
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-center gap-2">
          {isOnline ? <CheckCircle2 className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          <span>{isOnline ? 'Online - Live Cloud Sync' : 'Offline - Basement/Subfloor Mode (IndexedDB Queue)'}</span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px]">
            {pendingCount} Pending Sync
          </span>
        )}
      </div>

      {/* Select Job Dropdown (Mobile selector) */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Assigned Job:</label>
        <select
          value={activeJob.id}
          onChange={(e) => onSelectJob(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-sky-400 focus:outline-none focus:border-sky-500"
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.id} - {j.homeowner_name} ({j.damage_type})
            </option>
          ))}
        </select>
      </div>

      {/* 1. Job Card & One-Tap En Route Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-black text-sky-400 uppercase tracking-wide">{activeJob.id}</span>
            <h3 className="font-extrabold text-lg text-slate-100">{activeJob.homeowner_name}</h3>
            <p className="text-xs text-amber-400 font-bold flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {activeJob.damage_type} ({activeJob.water_source})
            </p>
          </div>
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
            {activeJob.stage}
          </span>
        </div>

        {/* Address & Navigation */}
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{activeJob.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <a href={`tel:${activeJob.homeowner_phone}`} className="font-semibold text-emerald-400 underline">
              {activeJob.homeowner_phone}
            </a>
          </div>
        </div>

        {/* One-Tap Action Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(activeJob.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            <Navigation className="w-4 h-4 text-sky-400" />
            1-Tap GPS Nav
          </a>

          <button
            onClick={handleSendEnRoute}
            disabled={sendingEnRoute || enRouteSent}
            className={`flex items-center justify-center gap-1.5 py-2.5 font-bold text-xs rounded-xl shadow-lg transition ${
              enRouteSent
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Send className="w-4 h-4" />
            {enRouteSent ? 'En Route SMS Sent' : '1-Tap En Route SMS'}
          </button>
        </div>
      </div>

      {/* 2. Digital Work Authorization Signature Pad Trigger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-sky-400" />
            <h4 className="font-bold text-sm text-slate-100">Work Authorization Signature</h4>
          </div>
          {activeJob.signature_data ? (
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Signed
            </span>
          ) : (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
              Required
            </span>
          )}
        </div>

        {activeJob.signature_data ? (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <img src={activeJob.signature_data} alt="Homeowner Signature" className="h-10 object-contain invert" />
            <button
              onClick={() => setShowSignatureModal(true)}
              className="text-xs font-semibold text-sky-400 hover:underline"
            >
              Re-sign
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSignatureModal(true)}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition"
          >
            <PenTool className="w-4 h-4" />
            Open Homeowner Signature Pad
          </button>
        )}
      </div>

      {/* 3. Room-by-Room Psychrometric Moisture Drying Log Form */}
      <form onSubmit={handleSaveMoistureReading} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-cyan-400" />
            <h4 className="font-bold text-sm text-slate-100">Psychrometric Moisture Log</h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">IICRC S500</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Room / Structure Location:</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Master Bedroom, Basement Subfloor"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ambient Temp (°F):</label>
              <input
                type="number"
                step="0.1"
                value={tempF}
                onChange={(e) => setTempF(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Relative Humidity (%):</label>
              <input
                type="number"
                step="0.1"
                value={rhPct}
                onChange={(e) => setRhPct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Wood Moisture (%):</label>
              <input
                type="number"
                step="0.1"
                value={woodPct}
                onChange={(e) => setWoodPct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Drywall Moisture (%):</label>
              <input
                type="number"
                step="0.1"
                value={drywallPct}
                onChange={(e) => setDrywallPct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Air Movers Placed:</label>
              <input
                type="number"
                value={airMovers}
                onChange={(e) => setAirMovers(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Dehumidifiers Placed:</label>
              <input
                type="number"
                value={dehumidifiers}
                onChange={(e) => setDehumidifiers(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Technician Notes:</label>
            <textarea
              rows={2}
              value={techNotes}
              onChange={(e) => setTechNotes(e.target.value)}
              placeholder="e.g. Set containment barrier, subfloor extraction complete."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingReading}
          className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          {savingReading ? 'Saving Log...' : 'Save Psychrometric Moisture Log'}
        </button>
      </form>

      {/* 4. Offline-First Loss Photo Camera Uploader */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            <h4 className="font-bold text-sm text-slate-100">Loss Photo Camera Uploader</h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Cloudflare R2 / S3</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Photo Tag / Category:</label>
            <select
              value={photoCategory}
              onChange={(e) => setPhotoCategory(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-purple-400"
            >
              <option value="INITIAL_DAMAGE">Initial Loss & Water Standing</option>
              <option value="EQUIPMENT_SETUP">Equipment Containment Setup</option>
              <option value="POST_DRYING">Post-Drying Structural Clearance</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Photo Caption:</label>
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="e.g. Drywall moisture reading photo"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-400"
            />
          </div>

          <label className="flex items-center justify-center gap-2 w-full py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-purple-500/20 transition">
            <Camera className="w-4 h-4" />
            Snap Photo with Camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  );
};
