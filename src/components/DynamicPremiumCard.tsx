import React from 'react';
import { MLRiskOutput } from '../services/mlRiskService';
import { Shield, TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface DynamicPremiumCardProps {
  data: MLRiskOutput;
  loading?: boolean;
}

export const DynamicPremiumCard: React.FC<DynamicPremiumCardProps> = ({ data, loading }) => {
  const { riskScore, riskLevel, basePremium, adjustment, finalPremium } = data;

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'Safe': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'High': return 'text-rose-600 bg-rose-50 border-rose-100';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'Safe': return <Shield className="w-5 h-5" />;
      case 'Medium': return <AlertCircle className="w-5 h-5" />;
      case 'High': return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[40px] p-8 border border-neutral-100 shadow-sm overflow-hidden relative"
    >
      {/* Background Accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-20 ${
        riskLevel === 'Safe' ? 'bg-emerald-500' : riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
      }`} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Dynamic Premium Calculation</h3>
          <p className="text-sm text-neutral-500 font-medium">ML-Powered Risk Assessment</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-black text-xs uppercase tracking-widest ${getRiskColor()}`}>
          {getRiskIcon()}
          {riskLevel} Risk
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl text-neutral-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-neutral-600">Base Premium</span>
            </div>
            <span className="text-lg font-black text-neutral-900">₹{basePremium}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl text-neutral-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-neutral-600">Risk Score</span>
            </div>
            <span className="text-lg font-black text-neutral-900">{(riskScore * 100).toFixed(1)}%</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl text-neutral-400">
                {adjustment < 0 ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : <TrendingUp className="w-4 h-4 text-rose-500" />}
              </div>
              <span className="text-sm font-bold text-neutral-600">Adjustment</span>
            </div>
            <span className={`text-lg font-black ${adjustment < 0 ? 'text-emerald-600' : adjustment > 0 ? 'text-rose-600' : 'text-neutral-900'}`}>
              {adjustment > 0 ? `+₹${adjustment}` : adjustment < 0 ? `-₹${Math.abs(adjustment)}` : '₹0'}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-8 bg-neutral-900 rounded-[32px] text-white text-center">
          <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Final Weekly Premium</p>
          <div className="text-6xl font-black tracking-tighter mb-4">
            ₹{finalPremium}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
            <Info className="w-3 h-3" />
            Updated based on current risk factors
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
        <div className="p-2 bg-blue-100 rounded-xl h-fit">
          <Info className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-xs text-blue-800 font-medium leading-relaxed">
          Our Machine Learning model analyzes real-time weather data, local disruption history, and your claim history to calculate a fair premium. 
          {riskLevel === 'Safe' ? ' You are currently in a safe zone, enjoying a discount.' : riskLevel === 'High' ? ' High risk detected in your area, premium adjusted accordingly.' : ' Your area is currently at moderate risk.'}
        </p>
      </div>
    </motion.div>
  );
};
