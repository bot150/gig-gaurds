import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Claim } from '../types';
import { FileText, Clock, CheckCircle2, AlertCircle, IndianRupee, MapPin } from 'lucide-react';

export const ClaimsPage: React.FC = () => {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'claims'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setClaims(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim)));
    });

    return () => unsub();
  }, [profile?.uid]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tighter text-neutral-900 mb-2">Claim History</h2>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-emerald-100">
          Total Payouts: ₹{claims.filter(c => c.status === 'processed').reduce((acc, c) => acc + c.amount, 0)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {claims.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-neutral-100 text-center">
            <div className="w-16 h-16 bg-neutral-50 text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <p className="text-neutral-500 font-medium">No claims recorded yet.</p>
            <p className="text-sm text-neutral-400">Claims are automatically triggered during disruptions.</p>
          </div>
        ) : (
          claims.map((claim) => (
            <div key={claim.id} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  claim.status === 'processed' ? 'bg-emerald-50 text-emerald-600' :
                  claim.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h3 className="font-display text-xl md:text-2xl uppercase tracking-tighter text-neutral-900">{claim.triggerEvent}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-neutral-500 flex items-center gap-1">
                      <Clock size={14} /> {new Date(claim.timestamp).toLocaleString()}
                    </span>
                    <span className="text-sm text-neutral-500 flex items-center gap-1">
                      <MapPin size={14} /> Mumbai
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-right">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em] mb-1">Compensation</p>
                  <p className="text-3xl font-display tracking-tighter text-emerald-600">₹{claim.amount}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em] mb-2">Status</p>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                    claim.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                    claim.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {claim.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <h4 className="font-black uppercase tracking-widest text-[10px] text-blue-900 mb-2">How payouts work?</h4>
          <p className="text-sm text-blue-700 mt-1">
            ErgoShield uses parametric triggers. When weather or platform data confirms a disruption in your area, 
            we automatically process your claim. No manual filing required! Payouts are sent directly to your linked bank account.
          </p>
        </div>
      </div>
    </div>
  );
};
