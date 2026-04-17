import React from 'react';
import { TrendingUp, Activity, AlertTriangle, Zap } from 'lucide-react';
import { RiskPrediction } from '../types';

interface PredictiveRiskAnalyticsProps {
  predictions: RiskPrediction[];
}

export const PredictiveRiskAnalytics: React.FC<PredictiveRiskAnalyticsProps> = ({ predictions }) => {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <h4 className="font-black text-neutral-900 tracking-tight">Next Week Risk Prediction</h4>
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest">AI-Powered Forecasting</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions.map((p, i) => (
          <div key={i} className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 hover:border-purple-200 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-neutral-900">{p.city}</span>
              <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                p.riskLevel === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {p.prediction}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                  <span>Risk Probability</span>
                  <span>{p.probability}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${p.riskLevel === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${p.probability}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-neutral-400" />
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Expected Claims</span>
                </div>
                <span className="text-sm font-black text-neutral-900">{p.expectedClaims}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
