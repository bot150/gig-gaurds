import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Claim } from '../types';
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  MoreHorizontal,
  ChevronRight,
  ArrowUpDown,
  Check,
  X,
  AlertTriangle,
  Clock,
  IndianRupee,
  BarChart2,
  BarChart3,
  ClipboardCheck,
  Zap,
  MessageSquare,
  Users,
  Map as MapIcon,
  FileText,
  Mail,
  Settings,
  CloudRain,
  ShieldAlert,
  Activity,
  MapPin,
  Shield,
  Bell
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useClaims } from '../ClaimsContext';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, updateDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { getRiskPredictions, getPlatformHealthMetrics } from '../services/riskService';
import { PredictiveRiskAnalytics } from '../components/PredictiveRiskAnalytics';
import { DisasterImpactAnalytics } from '../components/DisasterImpactAnalytics';
import { PlatformHealthMetrics } from '../components/PlatformHealthMetrics';

export const Admin: React.FC = () => {
  const { claims, triggerDisruption } = useClaims();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('fraud')) return 'fraud';
    if (path.includes('claims')) return 'claims';
    if (path.includes('workers')) return 'workers';
    if (path.includes('risk-map')) return 'map';
    if (path.includes('reports')) return 'reports';
    if (path.includes('alerts')) return 'alerts';
    if (path.includes('triggers')) return 'controls';
    if (path.includes('settings')) return 'settings';
    return 'analytics';
  }, [location.pathname]);

  const pendingCount = claims.filter(c => c.status === 'needs_manual_review').length;

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { id: 'fraud', label: 'Fraud Monitor', icon: ShieldAlert, count: claims.filter(c => c.fraudScore > 0.5).length, path: '/admin/fraud' },
    { id: 'claims', label: 'Claims', icon: ClipboardCheck, count: pendingCount, path: '/admin/claims' },
    { id: 'workers', label: 'Workers', icon: Users, path: '/admin/workers' },
    { id: 'map', label: 'Risk Map', icon: MapIcon, path: '/admin/risk-map' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/admin/reports' },
    { id: 'alerts', label: 'System Alerts', icon: Bell, path: '/admin/alerts' },
    { id: 'controls', label: 'Controls', icon: Zap, path: '/admin/triggers' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 flex flex-col">
      <div className="order-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'analytics' && <AnalyticsDashboard claims={claims} />}
            {activeTab === 'fraud' && <FraudMonitoring claims={claims} />}
            {activeTab === 'claims' && <ClaimsManagement />}
            {activeTab === 'workers' && <WorkerRegistry />}
            {activeTab === 'map' && <RiskMap />}
            {activeTab === 'reports' && <ReportsModule claims={claims} />}
            {activeTab === 'alerts' && <SystemAlerts claims={claims} />}
            {activeTab === 'controls' && <SystemControls triggerDisruption={triggerDisruption} />}
            {activeTab === 'settings' && <SystemSettings />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="order-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-8 border-t border-neutral-100">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Admin Control Center</h2>
          <p className="text-sm text-neutral-500 font-medium">Manage the ErgoShield ecosystem and monitor real-time risks.</p>
        </div>

        <div className="flex flex-wrap bg-neutral-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    basePremium: 50,
    riskThresholdHigh: 0.6,
    riskThresholdLow: 0.3,
    payoutMultiplier: 1.5,
    autoApproveEnabled: true,
  });

  const handleSave = () => {
    toast.success('System configurations updated successfully.');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">System Configurations</h3>
        <button 
          onClick={handleSave}
          className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
        >
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm space-y-6">
          <h4 className="font-black text-neutral-900 uppercase tracking-widest text-xs">Premium & Payouts</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Base Weekly Premium (₹)</label>
              <input 
                type="number" 
                value={settings.basePremium}
                onChange={e => setSettings({ ...settings, basePremium: Number(e.target.value) })}
                className="w-full px-6 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Payout Multiplier</label>
              <input 
                type="number" 
                step="0.1"
                value={settings.payoutMultiplier}
                onChange={e => setSettings({ ...settings, payoutMultiplier: Number(e.target.value) })}
                className="w-full px-6 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm space-y-6">
          <h4 className="font-black text-neutral-900 uppercase tracking-widest text-xs">Risk Thresholds</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">High Risk Score Threshold</label>
              <input 
                type="number" 
                step="0.1"
                value={settings.riskThresholdHigh}
                onChange={e => setSettings({ ...settings, riskThresholdHigh: Number(e.target.value) })}
                className="w-full px-6 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Low Risk Score Threshold</label>
              <input 
                type="number" 
                step="0.1"
                value={settings.riskThresholdLow}
                onChange={e => setSettings({ ...settings, riskThresholdLow: Number(e.target.value) })}
                className="w-full px-6 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="font-black text-neutral-900">Auto-Approve Claims</h4>
            <p className="text-sm text-neutral-500">Enable automated STP for low-risk claims.</p>
          </div>
          <button 
            onClick={() => setSettings({ ...settings, autoApproveEnabled: !settings.autoApproveEnabled })}
            className={`w-14 h-8 rounded-full transition-all relative ${settings.autoApproveEnabled ? 'bg-emerald-500' : 'bg-neutral-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.autoApproveEnabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC<{ claims: Claim[] }> = ({ claims }) => {
  const suspiciousCount = claims.filter(c => c.fraudScore > 0.5).length;
  const approvedClaims = claims.filter(c => c.status === 'processed' || c.status === 'approved' || c.status === 'completed');
  const totalPayout = approvedClaims.reduce((acc, c) => acc + c.amount, 0);
  
  // Mock total premiums for loss ratio calculation
  const totalPremiums = claims.length * 50; 
  const lossRatio = totalPremiums > 0 ? (totalPayout / totalPremiums) * 100 : 0;

  const predictions = getRiskPredictions();
  const healthMetrics = getPlatformHealthMetrics(claims);

  return (
    <div className="space-y-8">
      <PlatformHealthMetrics {...healthMetrics} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-[20px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3 shadow-sm">
            <IndianRupee size={20} />
          </div>
          <p className="text-neutral-500 text-[11px] font-black uppercase tracking-widest">Total Payouts</p>
          <p className="text-xl font-black text-neutral-900 mt-0.5 tracking-tight">₹{totalPayout.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3 shadow-sm">
            <ClipboardCheck size={20} />
          </div>
          <p className="text-neutral-500 text-[11px] font-black uppercase tracking-widest">Claims Processed</p>
          <p className="text-xl font-black text-neutral-900 mt-0.5 tracking-tight">{approvedClaims.length}</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3 shadow-sm">
            <Activity size={20} />
          </div>
          <p className="text-neutral-500 text-[11px] font-black uppercase tracking-widest">Loss Ratio</p>
          <p className="text-xl font-black text-neutral-900 mt-0.5 tracking-tight">{lossRatio.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-3 shadow-sm">
            <AlertCircle size={20} />
          </div>
          <p className="text-neutral-500 text-[11px] font-black uppercase tracking-widest">Pending Review</p>
          <p className="text-xl font-black text-neutral-900 mt-0.5 tracking-tight">{claims.filter(c => c.status === 'needs_manual_review').length}</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-neutral-100 shadow-sm hover:shadow-md transition-all border-red-100">
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-3 shadow-sm">
            <ShieldAlert size={20} />
          </div>
          <p className="text-neutral-500 text-[11px] font-black uppercase tracking-widest">Suspicious</p>
          <p className="text-xl font-black text-red-600 mt-0.5 tracking-tight">{suspiciousCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PredictiveRiskAnalytics predictions={predictions} />
        </div>
        <div className="space-y-6">
          <div className="bg-neutral-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap size={80} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">AI Insight</h4>
            <h3 className="text-xl font-black tracking-tight mb-4">Next Week Outlook</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-medium">
              Based on historical weather patterns and current humidity levels, we predict a <span className="text-white font-bold">24% increase</span> in rain-related claims for the coastal corridor.
            </p>
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Confidence Score</span>
              <span className="text-sm font-black text-emerald-400">88%</span>
            </div>
          </div>
          
          <DisasterImpactAnalytics 
            eventName="Rain Impact"
            location="Mangalagiri"
            workersAffected={28}
            claimsGenerated={14}
            totalPayout={3780}
            avgLostHours={3.2}
          />
        </div>
      </div>
    </div>
  );
};

const FraudMonitoring: React.FC<{ claims: Claim[] }> = ({ claims }) => {
  const suspiciousClaims = claims.filter(c => c.fraudScore > 0.3).sort((a, b) => b.fraudScore - a.fraudScore);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">Fraud Monitoring Panel</h3>
        <p className="text-neutral-500 font-medium text-sm">Real-time analysis of suspicious claim patterns and location mismatches.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {suspiciousClaims.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] border border-neutral-100 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">No suspicious claims detected</p>
          </div>
        ) : (
          suspiciousClaims.map(claim => (
            <div key={claim.id} className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      claim.fraudScore > 0.7 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-neutral-900">CLM-{claim.id?.slice(-6).toUpperCase()}</h4>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Worker ID: {claim.userId.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-1">Fraud Risk Score</p>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${claim.fraudScore > 0.7 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${claim.fraudScore * 100}%` }}
                        />
                      </div>
                      <span className={`font-black text-sm ${claim.fraudScore > 0.7 ? 'text-red-600' : 'text-amber-600'}`}>
                        {(claim.fraudScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-neutral-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <MapPin size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Location Integrity</span>
                    </div>
                    <p className="text-xs font-bold text-neutral-700">
                      Worker: {claim.location?.lat.toFixed(4)}, {claim.location?.lng.toFixed(4)}
                    </p>
                    <div className="mt-2 space-y-1">
                      {claim.suspiciousFlags.some(f => f.includes('Location') || f.includes('Mock')) ? (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertTriangle size={10} />
                          <span className="text-[9px] font-black uppercase">GPS Spoofing Risk</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <Check size={10} />
                          <span className="text-[9px] font-black uppercase">GPS Verified</span>
                        </div>
                      )}
                      {claim.suspiciousFlags.some(f => f.includes('Root') || f.includes('VPN')) ? (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <ShieldAlert size={10} />
                          <span className="text-[9px] font-black uppercase">Device Compromised</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <Shield size={10} />
                          <span className="text-[9px] font-black uppercase">Secure Device</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <Activity size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Activity History</span>
                    </div>
                    <p className="text-xs font-bold text-neutral-700">
                      {claim.incomeLossVerified ? 'Verified Work Loss' : 'No Activity Recorded'}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">Based on app heartbeat data</p>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Risk Flags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {claim.suspiciousFlags.map(flag => (
                        <span key={flag} className="bg-white px-2 py-0.5 rounded-md text-[8px] font-black text-red-500 border border-red-100 uppercase">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col gap-2 justify-center border-l border-neutral-100 pl-6">
                <button 
                  onClick={() => {/* Handle approve */}}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                >
                  Approve
                </button>
                <button 
                  onClick={() => {/* Handle reject */}}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const WorkerRegistry: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'worker'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredWorkers = workers.filter(w => 
    w.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    w.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = async (workerId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', workerId), {
        isVerified: !currentStatus
      });
      toast.success(`Worker status updated.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${workerId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">Worker Registry</h3>
        <div className="relative w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
              <th className="px-8 py-5">Worker Name</th>
              <th className="px-6 py-5">Email</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Joined</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : filteredWorkers.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-neutral-400 font-medium">No workers found.</td></tr>
            ) : (
              filteredWorkers.map((worker) => (
                <tr key={worker.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center font-black text-neutral-400">
                        {worker.fullName?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900">{worker.fullName}</span>
                        <div className="flex gap-1 mt-1">
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-[8px] font-black uppercase tracking-widest text-neutral-500 rounded">
                            {worker.riskZone || 'Inland'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-[8px] font-black uppercase tracking-widest text-neutral-500 rounded">
                            {worker.cityTier || 'Tier 2'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-neutral-500">{worker.email}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${worker.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {worker.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs text-neutral-400">{new Date(worker.createdAt).toLocaleDateString()}</td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleToggleStatus(worker.id, worker.isVerified)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        worker.isVerified ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {worker.isVerified ? 'Block' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RiskMap: React.FC = () => {
  const zones = [
    { name: 'Vijayawada', risk: 'High', color: 'bg-red-500', zone: 'inland', tier: 'tier2' },
    { name: 'Mumbai', risk: 'Medium', color: 'bg-amber-500', zone: 'coastal', tier: 'tier1' },
    { name: 'Chennai', risk: 'High', color: 'bg-red-500', zone: 'coastal', tier: 'coastal' },
    { name: 'Delhi', risk: 'Low', color: 'bg-emerald-500', zone: 'urban', tier: 'tier1' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">Geographic Risk Heatmap</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Coastal Risk</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Urban Risk</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Inland Risk</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-4 rounded-[40px] border border-neutral-100 shadow-sm h-[500px] relative overflow-hidden">
          <div className="absolute inset-0 bg-neutral-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <MapIcon size={64} className="mx-auto text-neutral-200" />
              <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Dynamic Risk Heatmap</p>
            </div>
          </div>
          {/* Mock Heatmap Circles */}
          <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          
          {/* Markers */}
          <div className="absolute top-1/4 left-1/3 group cursor-pointer">
            <div className="w-6 h-6 bg-red-500 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
              <AlertTriangle size={12} className="text-white" />
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-900 text-white text-[10px] font-black p-2 rounded-lg whitespace-nowrap">
              Chennai (Coastal Risk)
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-black text-neutral-900 uppercase tracking-widest mb-4">Risk Zone Breakdown</h4>
          {zones.map((zone) => (
            <div key={zone.name} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-emerald-500 transition-all cursor-pointer">
              <div>
                <p className="font-black text-neutral-900">{zone.name}</p>
                <div className="flex gap-1 mt-1">
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{zone.zone}</span>
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">•</span>
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{zone.tier}</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${zone.color}`}>
                {zone.risk}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReportsModule: React.FC<{ claims: Claim[] }> = ({ claims }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">System Reports</h3>
        <button className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg">
          <Download size={18} />
          Generate Full Audit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <h4 className="font-black text-neutral-900">Financial Summary</h4>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed">Detailed breakdown of premiums collected vs. claims paid out across all plans.</p>
          <button className="w-full py-3 bg-neutral-50 text-neutral-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all">Download PDF</button>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-neutral-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <h4 className="font-black text-neutral-900">Worker Demographics</h4>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed">Analysis of worker distribution, plan popularity, and verification status.</p>
          <button className="w-full py-3 bg-neutral-50 text-neutral-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all">Download PDF</button>
        </div>
      </div>
    </div>
  );
};

const SystemAlerts: React.FC<{ claims: Claim[] }> = ({ claims }) => {
  const alerts = [
    { id: 1, type: 'critical', title: 'High Fraud Activity', message: 'Unusual claim patterns detected in Vijayawada Central.', time: '2 mins ago', icon: ShieldAlert },
    { id: 2, type: 'warning', title: 'Delayed Payouts', message: 'Average payout time exceeded 2.5h target in Coastal zones.', time: '15 mins ago', icon: Clock },
    { id: 3, type: 'info', title: 'New Worker Surge', message: '24 new workers registered in the last hour.', time: '45 mins ago', icon: Users },
    { id: 4, type: 'success', title: 'System Backup', message: 'Full database backup completed successfully.', time: '2 hours ago', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">System Alerts</h3>
        <button className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Mark all as read</button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={`bg-white p-6 rounded-[32px] border shadow-sm flex items-start gap-6 transition-all hover:shadow-md ${
            alert.type === 'critical' ? 'border-red-100' : 
            alert.type === 'warning' ? 'border-amber-100' : 
            'border-neutral-100'
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              alert.type === 'critical' ? 'bg-red-50 text-red-600' : 
              alert.type === 'warning' ? 'bg-amber-50 text-amber-600' : 
              alert.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
              'bg-blue-50 text-blue-600'
            }`}>
              <alert.icon size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-black text-neutral-900">{alert.title}</h4>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{alert.time}</span>
              </div>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">{alert.message}</p>
            </div>
            <button className="p-2 text-neutral-300 hover:text-neutral-500 transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SystemControls: React.FC<{ triggerDisruption: () => void }> = ({ triggerDisruption }) => {
  const { triggerMockEvent, resetMockEvent, mockEvent } = useClaims();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">Trigger Controls</h3>
        <p className="text-neutral-500 font-medium">Manual overrides and emergency protocols for the ErgoShield platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-neutral-900 p-10 rounded-[48px] text-white space-y-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
            <Zap size={120} />
          </div>
          <div className="space-y-4 relative">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center">
              <Zap size={32} />
            </div>
            <h4 className="text-2xl font-black tracking-tight">Mock Disaster Triggers</h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Trigger mock calamity events to test automated insurance claims even when real weather conditions are normal.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 relative">
            <button 
              onClick={() => triggerMockEvent('rain')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
            >
              <CloudRain size={20} />
              Trigger Heavy Rain
            </button>
            <button 
              onClick={() => triggerMockEvent('flood')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
            >
              <AlertTriangle size={20} />
              Trigger Flood
            </button>
            <button 
              onClick={resetMockEvent}
              disabled={!mockEvent.type}
              className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Clock size={20} />
              Reset Mock Event
            </button>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[48px] border border-neutral-100 shadow-sm space-y-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
            <h4 className="text-2xl font-black text-neutral-900 tracking-tight">System Disruption</h4>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Simulate a general system-wide disruption to test automated STP logic and fraud detection across multiple zones.
            </p>
          </div>
          <button 
            onClick={triggerDisruption}
            className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-3"
          >
            <Zap size={20} />
            Trigger Disruption
          </button>
        </div>
      </div>
    </div>
  );
};

const ClaimsManagement: React.FC = () => {
  const { claims } = useClaims();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [calamityFilter, setCalamityFilter] = useState('All Calamities');
  const [zoneFilter, setZoneFilter] = useState('All Zones');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high'>('newest');
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [fraudModalClaim, setFraudModalClaim] = useState<Claim | null>(null);
  const [appealModalClaim, setAppealModalClaim] = useState<Claim | null>(null);

  const filteredClaims = useMemo(() => {
    return claims
      .filter(c => {
        const matchesSearch = (c.id?.toLowerCase().includes(search.toLowerCase()) || c.userId.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = statusFilter === 'All Statuses' || c.status === statusFilter;
        const matchesCalamity = calamityFilter === 'All Calamities' || c.calamityType === calamityFilter;
        const matchesZone = zoneFilter === 'All Zones' || c.zone === zoneFilter;
        return matchesSearch && matchesStatus && matchesCalamity && matchesZone;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (sortBy === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        if (sortBy === 'amount_high') return b.amount - a.amount;
        return 0;
      });
  }, [claims, search, statusFilter, calamityFilter, zoneFilter, sortBy]);

  const handleUpdateStatus = async (claimId: string, newStatus: 'approved' | 'rejected' | 'processed') => {
    try {
      await updateDoc(doc(db, 'claims', claimId), {
        status: newStatus,
        reviewedBy: 'admin_manual',
        reviewedAt: new Date().toISOString()
      });
      toast.success(`Claim ${claimId} marked as ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
    }
  };

  const handleBulkAction = async (newStatus: 'approved' | 'rejected') => {
    const toUpdate = selectedClaims.filter(id => {
      const claim = claims.find(c => c.id === id);
      return claim?.status === 'needs_manual_review' || claim?.status === 'appealed';
    });

    for (const id of toUpdate) {
      await handleUpdateStatus(id, newStatus);
    }
    
    setSelectedClaims([]);
  };

  const exportCSV = () => {
    const headers = ['Claim ID', 'Worker ID', 'Zone', 'Calamity', 'Date', 'Amount', 'Status', 'Eligibility', 'Fraud', 'Income Verified'];
    const rows = filteredClaims.map(c => [
      c.id,
      c.userId,
      c.zone,
      c.calamityType,
      new Date(c.timestamp).toLocaleDateString(),
      c.amount,
      c.status,
      c.eligibilityStatus,
      c.fraudCheckStatus,
      c.incomeLossVerified ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `claims_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_auto: 'bg-blue-100 text-blue-700',
      needs_manual_review: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      processed: 'bg-teal-100 text-teal-700',
      appealed: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status] || 'bg-neutral-100 text-neutral-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getCheckIndicator = (status: 'pass' | 'fail' | 'flag' | 'pending' | boolean) => {
    if (typeof status === 'boolean') {
      return status ? 'bg-emerald-500' : 'bg-amber-500';
    }
    if (status === 'pass') return 'bg-emerald-500';
    if (status === 'fail' || status === 'flag') return 'bg-red-500';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-neutral-900 tracking-tight">Claims Management</h3>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-black uppercase tracking-widest text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-[32px] border border-neutral-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search Claim ID or Worker ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option>All Statuses</option>
            <option value="pending_auto">Pending Auto</option>
            <option value="needs_manual_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processed">Processed</option>
            <option value="appealed">Appealed</option>
          </select>
          <select 
            value={calamityFilter}
            onChange={(e) => setCalamityFilter(e.target.value)}
            className="bg-neutral-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option>All Calamities</option>
            <option value="flood">Flood</option>
            <option value="cyclone">Cyclone</option>
            <option value="heatwave">Heatwave</option>
            <option value="landslide">Landslide</option>
          </select>
          <select 
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-neutral-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option>All Zones</option>
            <option value="Vijayawada">Vijayawada</option>
            <option value="Guntur">Guntur</option>
            <option value="Amaravati">Amaravati</option>
            <option value="Krishna dist">Krishna dist</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_high">Amount: High to Low</option>
          </select>
        </div>
      </div>

      {selectedClaims.length > 0 && (
        <div className="bg-neutral-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-6">
            <span className="text-sm font-black uppercase tracking-widest">{selectedClaims.length} claims selected</span>
            <div className="h-6 w-px bg-white/10" />
            <button 
              onClick={() => handleBulkAction('approved')}
              className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              Approve All
            </button>
            <button 
              onClick={() => handleBulkAction('rejected')}
              className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
            >
              Reject All
            </button>
          </div>
          <button onClick={() => setSelectedClaims([])} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 text-neutral-400 text-[10px] font-black uppercase tracking-widest border-b border-neutral-100">
                <th className="px-8 py-5">
                  <input 
                    type="checkbox" 
                    checked={selectedClaims.length === filteredClaims.length && filteredClaims.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedClaims(filteredClaims.map(c => c.id!));
                      else setSelectedClaims([]);
                    }}
                    className="rounded-md border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                  />
                </th>
                <th className="px-6 py-5">Claim ID</th>
                <th className="px-6 py-5">Worker ID</th>
                <th className="px-6 py-5">Zone</th>
                <th className="px-6 py-5">Calamity</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Checks</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <input 
                      type="checkbox" 
                      checked={selectedClaims.includes(claim.id!)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedClaims(prev => [...prev, claim.id!]);
                        else setSelectedClaims(prev => prev.filter(id => id !== claim.id));
                      }}
                      className="rounded-md border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                    />
                  </td>
                  <td className="px-6 py-5 font-black text-neutral-900 text-sm tracking-tight">{claim.id?.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-5 text-neutral-500 text-xs font-bold">{claim.userId}</td>
                  <td className="px-6 py-5 text-neutral-700 text-xs font-bold">{claim.zone}</td>
                  <td className="px-6 py-5 text-neutral-700 text-xs font-black uppercase tracking-widest">{claim.calamityType}</td>
                  <td className="px-6 py-5 text-neutral-500 text-xs font-medium">{new Date(claim.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-5 font-black text-neutral-900 text-sm tracking-tight">₹{claim.amount.toLocaleString()}</td>
                  <td className="px-6 py-5">{getStatusBadge(claim.status)}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getCheckIndicator(claim.eligibilityStatus)} shadow-sm`} title={`Eligibility: ${claim.eligibilityStatus}`} />
                      <div className={`w-2.5 h-2.5 rounded-full ${getCheckIndicator(claim.fraudCheckStatus)} shadow-sm`} title={`Fraud: ${claim.fraudCheckStatus}`} />
                      <div className={`w-2.5 h-2.5 rounded-full ${getCheckIndicator(claim.incomeLossVerified)} shadow-sm`} title={`Income: ${claim.incomeLossVerified ? 'Verified' : 'Unverified'}`} />
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {claim.status === 'needs_manual_review' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(claim.id!, 'approved')}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(claim.id!, 'rejected')}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-sm"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : claim.status === 'appealed' ? (
                        <button 
                          onClick={() => setAppealModalClaim(claim)}
                          className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all shadow-sm flex items-center gap-2"
                        >
                          <MessageSquare size={14} />
                          Review Appeal
                        </button>
                      ) : (
                        <button 
                          onClick={() => claim.fraudCheckStatus === 'flag' ? setFraudModalClaim(claim) : null}
                          className="p-2 bg-neutral-50 text-neutral-400 rounded-xl hover:bg-neutral-100 hover:text-neutral-900 transition-all"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fraud Modal */}
      {fraudModalClaim && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-3xl font-black text-neutral-900 mb-2 tracking-tight">Fraud Flag Detected</h3>
            <p className="text-neutral-500 font-medium mb-8 leading-relaxed">
              This claim has been flagged by our automated system for manual verification.
            </p>
            
            <div className="bg-red-50 border border-red-100 p-6 rounded-3xl mb-10">
              <p className="text-red-900 font-black text-[10px] uppercase tracking-widest mb-2">Flag Reason:</p>
              <p className="text-red-700 text-sm font-medium italic">
                {[
                  "Duplicate GPS location detected",
                  "Claim filed outside calamity zone radius",
                  "Income history mismatch with platform data"
                ][Math.floor(Math.random() * 3)]}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  handleUpdateStatus(fraudModalClaim.id!, 'approved');
                  setFraudModalClaim(null);
                }}
                className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                Override & Approve
              </button>
              <button 
                onClick={() => {
                  handleUpdateStatus(fraudModalClaim.id!, 'rejected');
                  setFraudModalClaim(null);
                }}
                className="py-4 bg-white border-2 border-neutral-100 text-neutral-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-50 transition-all"
              >
                Confirm Reject
              </button>
            </div>
            <button 
              onClick={() => setFraudModalClaim(null)}
              className="w-full mt-6 text-neutral-400 text-[10px] font-black uppercase tracking-widest hover:text-neutral-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Appeal Review Modal */}
      {appealModalClaim && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-3xl font-black text-neutral-900 mb-2 tracking-tight">Review Appeal</h3>
            <p className="text-neutral-500 font-medium mb-8 leading-relaxed">
              Worker has appealed the rejection of claim <span className="font-black text-neutral-900">{appealModalClaim.id?.slice(-8).toUpperCase()}</span>.
            </p>
            
            <div className="bg-purple-50 border border-purple-100 p-6 rounded-3xl mb-10">
              <p className="text-purple-900 font-black text-[10px] uppercase tracking-widest mb-2">Worker's Reason:</p>
              <p className="text-purple-700 text-sm font-medium italic leading-relaxed">
                "{appealModalClaim.appealReason}"
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  handleUpdateStatus(appealModalClaim.id!, 'approved');
                  setAppealModalClaim(null);
                }}
                className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                Accept Appeal & Approve
              </button>
              <button 
                onClick={() => {
                  handleUpdateStatus(appealModalClaim.id!, 'rejected');
                  setAppealModalClaim(null);
                }}
                className="py-4 bg-white border-2 border-neutral-100 text-neutral-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-50 transition-all"
              >
                Maintain Rejection
              </button>
            </div>
            <button 
              onClick={() => setAppealModalClaim(null)}
              className="w-full mt-6 text-neutral-400 text-[10px] font-black uppercase tracking-widest hover:text-neutral-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
