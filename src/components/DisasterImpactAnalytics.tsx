import React from 'react';
import { Users, IndianRupee, Clock, AlertTriangle } from 'lucide-react';

interface DisasterImpactAnalyticsProps {
  eventName: string;
  location: string;
  workersAffected: number;
  claimsGenerated: number;
  totalPayout: number;
  avgLostHours: number;
}

export const DisasterImpactAnalytics: React.FC<DisasterImpactAnalyticsProps> = ({ 
  eventName, 
  location, 
  workersAffected, 
  claimsGenerated, 
  totalPayout, 
  avgLostHours 
}) => {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="font-black text-neutral-900 tracking-tight">{eventName} Impact – {location}</h4>
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest">Disaster Analytics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <Users size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Workers Affected</span>
          </div>
          <p className="text-2xl font-black text-neutral-900">{workersAffected}</p>
        </div>

        <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <AlertTriangle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Claims Generated</span>
          </div>
          <p className="text-2xl font-black text-neutral-900">{claimsGenerated}</p>
        </div>

        <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <IndianRupee size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Payout</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">₹{totalPayout.toLocaleString()}</p>
        </div>

        <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <Clock size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Avg Lost Hours</span>
          </div>
          <p className="text-2xl font-black text-neutral-900">{avgLostHours}h</p>
        </div>
      </div>
    </div>
  );
};
