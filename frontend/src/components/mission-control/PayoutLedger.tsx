import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, Clock, Send, ShieldCheck, Building2, User, RefreshCw } from 'lucide-react';
import { ReferralPayout } from '../../types/missionControl';

export const PayoutLedger: React.FC = () => {
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, approved: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PAID'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mission-control/payouts');
      const data = await res.json();
      if (data.success) {
        setPayouts(data.payouts);
        setTotals(data.totals);
      }
    } catch (err) {
      console.error('Failed to fetch 1099 payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayout = async (id: string, partnerName: string, fee: number) => {
    if (!confirm(`Execute 1099 referral payout of $${fee.toFixed(2)} to ${partnerName}?`)) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/mission-control/payouts/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Payout of $${fee.toFixed(2)} successfully sent to ${partnerName}! (Ref: ${data.payout.transaction_ref})`);
        fetchPayouts();
      } else {
        alert(data.error || 'Payout execution failed');
      }
    } catch (err: any) {
      alert('Payout exception: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    if (activeFilter === 'ALL') return true;
    return p.payout_status === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            💰 1099 Referral Agent & Plumber Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Automated fixed referral payout distribution ($500 - $750 per job) for plumbers, property managers, and lead acquisition agents.
          </p>
        </div>

        <button
          onClick={fetchPayouts}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Referral Volume</span>
          <p className="text-2xl font-black text-slate-100">${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-500">All registered job referrals</p>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-1 bg-emerald-500/5">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Executed Paid Fees</span>
          <p className="text-2xl font-black text-emerald-400">${totals.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-emerald-500/80">Completed 1099 direct transfers</p>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-1 bg-amber-500/5">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Approved Ready to Pay</span>
          <p className="text-2xl font-black text-amber-400">${totals.approved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-amber-500/80">Job signed & scoped</p>
        </div>

        <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-4 space-y-1 bg-sky-500/5">
          <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider">Pending Verification</span>
          <p className="text-2xl font-black text-sky-400">${totals.pending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-sky-500/80">New intake jobs active</p>
        </div>
      </div>

      {/* Ledger Filter Tabs & Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          {(['ALL', 'PENDING', 'APPROVED', 'PAID'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeFilter === filter
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'ALL' ? 'All Referrals' : filter}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3">Payout ID</th>
                <th className="p-3">Job ID</th>
                <th className="p-3">Partner Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Fixed Fee</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 italic">No payouts found matching filter.</td>
                </tr>
              ) : (
                filteredPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-mono font-bold text-sky-400">{p.id}</td>
                    <td className="p-3 font-mono text-slate-300">{p.job_id}</td>
                    <td className="p-3 font-bold text-slate-100 flex items-center gap-1.5">
                      {p.partner_type === 'PLUMBER' ? (
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      {p.partner_name}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-extrabold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {p.partner_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-extrabold text-emerald-400">
                      ${p.referral_fee.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        p.payout_status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : p.payout_status === 'APPROVED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                      }`}>
                        {p.payout_status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {p.payout_status === 'PAID' ? (
                        <span className="text-[11px] text-slate-500 font-mono">
                          Ref: {p.transaction_ref}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleExecutePayout(p.id, p.partner_name, p.referral_fee)}
                          disabled={processingId === p.id}
                          className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-[11px] rounded-lg shadow transition"
                        >
                          {processingId === p.id ? 'Executing...' : 'Execute Payout'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
