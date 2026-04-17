import React from 'react';
import { Bell, AlertTriangle, Zap, CloudRain, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmergencyAlert } from '../types';

interface EmergencyAlertsProps {
  alerts: EmergencyAlert[];
}

export const EmergencyAlerts: React.FC<EmergencyAlertsProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-6 rounded-[32px] border flex items-start gap-4 shadow-sm ${
              alert.type === 'weather' 
                ? 'bg-blue-50 border-blue-100 text-blue-900' 
                : alert.type === 'disruption'
                ? 'bg-amber-50 border-amber-100 text-amber-900'
                : 'bg-neutral-50 border-neutral-100 text-neutral-900'
            }`}
          >
            <div className={`p-3 rounded-2xl ${
              alert.type === 'weather' 
                ? 'bg-blue-500 text-white' 
                : alert.type === 'disruption'
                ? 'bg-amber-500 text-white'
                : 'bg-neutral-900 text-white'
            }`}>
              {alert.type === 'weather' ? <CloudRain size={20} /> : alert.type === 'disruption' ? <AlertTriangle size={20} /> : <Info size={20} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60">{alert.title}</h4>
                <span className="text-[10px] font-black opacity-40">{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm font-bold leading-tight mb-2">{alert.message}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded-md">
                  Location: {alert.location}
                </span>
                {alert.type === 'weather' && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Zap size={10} /> Coverage Active
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
