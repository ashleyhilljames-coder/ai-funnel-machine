import React, { useState } from 'react';
import { Mic, Activity, Radio, Mail, Send, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { MissionJob } from '../../types/missionControl';

interface VoiceRoutingConsoleProps {
  onJobCreated: (newJob: MissionJob) => void;
}

export const VoiceRoutingConsole: React.FC<VoiceRoutingConsoleProps> = ({ onJobCreated }) => {
  const [callerName, setCallerName] = useState('Jessica Miller');
  const [callerPhone, setCallerPhone] = useState('+17025550288');
  const [address, setAddress] = useState('4820 W Flamingo Rd, Las Vegas, NV');
  const [damageType, setDamageType] = useState('Water Damage');
  const [waterSource, setWaterSource] = useState('Washing Machine Supply Hose Burst');
  const [affectedRooms, setAffectedRooms] = useState('Utility Room, Hallway, Kitchen');
  const [transcript, setTranscript] = useState(
    '[Deepgram Nova-2 Real-Time Transcript 23:30:15]\n[AI Dispatcher]: Thank you for calling Syncro Scale Emergency Restoration. What is your emergency?\n[Caller]: Help! Our washing machine supply hose completely snapped! Water is flooding out into our utility room, hallway, and kitchen!'
  );
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSimulateCall = async () => {
    setSimulating(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/mission-control/voice-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeownerName: callerName,
          callerPhone,
          address,
          damageType,
          waterSource,
          affectedRooms,
          transcript
        })
      });

      const data = await res.json();
      if (data.success) {
        setLastResult(data);
        onJobCreated(data.job);
      } else {
        alert(data.error || 'Voice stream simulation failed');
      }
    } catch (err: any) {
      alert('Exception simulating voice stream: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            🎙️ Deepgram Nova-2 Voice & Lead Routing Engine
          </h2>
          <p className="text-xs text-slate-400">
            Real-time Twilio inbound call stream processing, Deepgram AI transcript parsing, and Resend email alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg">
          <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
          Twilio & Deepgram Webhooks Listening
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Simulation Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl md:col-span-2">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Mic className="w-4 h-4 text-sky-400" />
            Simulate Inbound Emergency Call Stream
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Caller Name:</label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Caller Phone:</label>
              <input
                type="text"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Property Address:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Damage Type:</label>
                <input
                  type="text"
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Water Source:</label>
                <input
                  type="text"
                  value={waterSource}
                  onChange={(e) => setWaterSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Deepgram Nova-2 Streaming Transcript:</label>
              <textarea
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 font-mono text-[11px] text-sky-300 focus:outline-none focus:border-sky-400 leading-relaxed"
              />
            </div>
          </div>

          <button
            onClick={handleSimulateCall}
            disabled={simulating}
            className="w-full py-3 bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            {simulating ? 'Processing Deepgram Audio Stream...' : 'Trigger Deepgram Nova-2 Inbound Intake Stream'}
          </button>
        </div>

        {/* Real-time Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            Live Voice Telemetry
          </h3>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">Deepgram Nova-2 Model</span>
              <p className="font-bold text-emerald-400">nova-2-general (Real-time WS)</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">STT Audio Latency</span>
              <p className="font-bold text-sky-400 font-mono">142 ms average</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">Resend Email Alerts</span>
              <p className="font-bold text-purple-400">Active (ashley@syncroscale.com)</p>
            </div>
          </div>

          {lastResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Intake Registered!
              </p>
              <p className="text-slate-300 font-mono text-[11px]">Job ID: {lastResult.job?.id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
