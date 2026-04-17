import React from 'react';
import { Shield, IndianRupee, Clock, Activity } from 'lucide-react';
import { InsurancePolicy, Claim } from '../types';

interface IncomeProtectionWidgetProps {
  policy: InsurancePolicy | null;
  claims: Claim[];
}

export const IncomeProtectionWidget: React.FC<IncomeProtectionWidgetProps> = ({ policy, claims }) => {
  const weeklyIncomeProtected = 4200; // Mocked average
  const activeCoverage = policy ? '7 days' : '0 days';
  
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const claimsThisWeek = claims.filter(c => new Date(c.timestamp) >= startOfWeek).length;
  
  const lastPayout = claims.filter(c => c.status === 'processed' || c.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.amount || 0;

  return (
    <div className="bg-neutral-900 text-white p-8 rounded-[40px] shadow-xl border border-neutral-800">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight">Income Protection</h3>
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest">Worker Safety Widget</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <IndianRupee size={10} /> Weekly Protected
          </p>
          <p className="text-2xl font-black text-white">₹{weeklyIncomeProtected}</p>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <Clock size={10} /> Active Coverage
          </p>
          <p className="text-2xl font-black text-white">{activeCoverage}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <Activity size={10} /> Claims This Week
          </p>
          <p className="text-2xl font-black text-white">{claimsThisWeek}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <IndianRupee size={10} /> Last Payout
          </p>
          <p className="text-2xl font-black text-emerald-400">₹{lastPayout}</p>
        </div>
      </div>
    </div>
  );
};
