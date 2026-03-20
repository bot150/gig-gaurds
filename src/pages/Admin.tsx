import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Claim, DisruptionEvent } from '../types';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  CreditCard, 
  MapPin, 
  Activity,
  Plus,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    });

    const unsubClaims = onSnapshot(collection(db, 'claims'), (snap) => {
      setClaims(snap.docs.map(doc => doc.data() as Claim));
    });

    const unsubDisruptions = onSnapshot(collection(db, 'disruptions'), (snap) => {
      setDisruptions(snap.docs.map(doc => doc.data() as DisruptionEvent));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubClaims();
      unsubDisruptions();
    };
  }, []);

  const triggerDisruption = async (type: string, severity: 'low' | 'medium' | 'high') => {
    try {
      // 1. Log Disruption
      await addDoc(collection(db, 'disruptions'), {
        type,
        severity,
        location: 'Mumbai',
        timestamp: new Date().toISOString(),
        affectedCount: Math.floor(Math.random() * 100) + 50
      });

      // 2. Simulate Automatic Claims for affected workers
      const workers = users.filter(u => u.role === 'worker');
      const amountMap: Record<string, number> = {
        'Heavy Rain': 300,
        'Extreme Heat': 250,
        'High Pollution': 200,
        'System Outage': 400
      };

      for (const worker of workers) {
        await addDoc(collection(db, 'claims'), {
          userId: worker.uid,
          policyId: 'auto-policy',
          triggerEvent: type,
          amount: amountMap[type] || 200,
          status: 'processed',
          timestamp: new Date().toISOString(),
          location: { lat: 19.076, lng: 72.877 }
        });
      }

      alert(`Triggered ${type} disruption and processed claims for ${workers.length} workers.`);
    } catch (err) {
      console.error(err);
    }
  };

  const stats = [
    { label: 'Total Workers', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Policies', value: users.length, icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Claims Processed', value: claims.length, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Payouts', value: `₹${claims.reduce((acc, c) => acc + c.amount, 0)}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const categoryData = [
    { name: 'Food', value: users.filter(u => u.category === 'food').length },
    { name: 'E-Commerce', value: users.filter(u => u.category === 'ecommerce').length },
    { name: 'Quick Commerce', value: users.filter(u => u.category === 'quick_commerce').length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-neutral-900">Admin Analytics</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => triggerDisruption('Heavy Rain', 'high')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
          >
            <Zap size={18} /> Trigger Rain Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-neutral-500 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <h3 className="text-xl font-bold text-neutral-900 mb-8">Worker Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {categoryData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                <span className="text-sm text-neutral-500">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <h3 className="text-xl font-bold text-neutral-900 mb-8">Disruption Analytics</h3>
          <div className="space-y-4">
            {disruptions.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    d.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{d.type}</p>
                    <p className="text-xs text-neutral-500">{new Date(d.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-neutral-900">{d.affectedCount}</p>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold">Affected</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
