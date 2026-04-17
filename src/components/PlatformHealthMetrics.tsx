import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface PlatformHealthMetricsProps {
  fraudRate: number;
  approvalRate: number;
  avgPayoutTime: number;
  suspiciousCount: number;
}

export const PlatformHealthMetrics: React.FC<PlatformHealthMetricsProps> = ({ 
  fraudRate, 
  approvalRate, 
  avgPayoutTime, 
  suspiciousCount 
}) => {
  return (
    <div className="bg-neutral-900 text-white p-8 rounded-[40px] shadow-xl border border-neutral-800">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
          <Activity size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight">Platform Health Metrics</h3>
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest">System Performance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-500">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Fraud Rate</span>
          </div>
          <p className="text-3xl font-black text-white">{fraudRate}%</p>
          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${fraudRate}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-500">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Approval Rate</span>
          </div>
          <p className="text-3xl font-black text-white">{approvalRate}%</p>
          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${approvalRate}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-500">
            <Clock size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Avg Payout Time</span>
          </div>
          <p className="text-3xl font-black text-white">{avgPayoutTime}h</p>
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Target: 2.0h</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-500">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Suspicious Claims</span>
          </div>
          <p className="text-3xl font-black text-white">{suspiciousCount}</p>
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Requires Review</p>
        </div>
      </div>
    </div>
  );
};
