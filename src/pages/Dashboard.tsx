import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Claim, InsurancePolicy, WeatherData, DisruptionEvent } from '../types';
import { AUTHORIZED_ADMINS } from '../constants';
import { 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  IndianRupee, 
  Clock, 
  CheckCircle2,
  CloudRain,
  Thermometer,
  Wind,
  FileText,
  User,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Gift,
  Bell,
  MapPin,
  Activity
} from 'lucide-react';
import { WeatherWidget } from '../components/WeatherWidget';
import { IncomeProtectionWidget } from '../components/IncomeProtectionWidget';
import { EmergencyAlerts } from '../components/EmergencyAlerts';
import { checkAutomatedTriggers } from '../services/insuranceService';
import { useClaims } from '../ClaimsContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { PayoutModal } from '../components/PayoutModal';

export const Dashboard: React.FC = () => {
  const { profile, isAdmin, user } = useAuth();
  const { mockEvent } = useClaims();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activeDisruptions, setActiveDisruptions] = useState<DisruptionEvent[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedPayoutClaim, setSelectedPayoutClaim] = useState<Claim | null>(null);

  const handleRepairRole = async () => {
    if (!user?.uid) return;
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, { role: 'admin' });
      toast.success("Role repaired! Please refresh.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to repair role.");
    }
  };

  useEffect(() => {
    // Mock Emergency Alerts
    const mockAlerts: any[] = [];
    setAlerts([]);
  }, [profile?.location, weather?.city]);

  // Automated Trigger Logic
  useEffect(() => {
    if (!profile?.uid || !weather) return;

    const runTriggers = async () => {
      try {
        // Use weather.city as the primary location for triggers if profile location is missing
        // This ensures the trigger matches the actual location detected by the weather widget
        const currentLocation = profile.location || weather.city || "New Delhi";
        const newClaim = await checkAutomatedTriggers(profile.uid, currentLocation, weather, policy);
        if (newClaim && !claims.some(c => c.id === newClaim.id)) {
          toast.success(`Automated Claim Triggered: ${newClaim.triggerEvent}`, {
            description: `A compensation of ₹${newClaim.amount} has been processed for your loss of income.`,
            duration: 10000,
          });
        }
      } catch (err) {
        console.error("Failed to run automated triggers", err);
      }
    };

    runTriggers();
  }, [weather?.isRisk, profile?.uid, policy?.id]);

  useEffect(() => {
    // Mock Social Disruption Fetch (Strikes/Protests)
    const fetchDisruptions = () => {
      const mockDisruptions: DisruptionEvent[] = [
        { id: 'd1', type: 'Transport Strike', severity: 'high', location: 'Mumbai', timestamp: new Date().toISOString(), affectedCount: 50000, status: 'active' },
        { id: 'd2', type: 'Public Protest', severity: 'medium', location: 'New Delhi', timestamp: new Date().toISOString(), affectedCount: 12000, status: 'active' },
        { id: 'd3', type: 'Local Bandh', severity: 'high', location: 'Bangalore', timestamp: new Date().toISOString(), affectedCount: 35000, status: 'active' }
      ];
      const currentLocation = profile?.location || weather?.city || "New Delhi";
      const filtered = mockDisruptions.filter(d => currentLocation.toLowerCase().includes(d.location.toLowerCase()));
      setActiveDisruptions(filtered);
    };
    fetchDisruptions();
  }, [profile?.location, weather?.city]);

  useEffect(() => {
    if (!profile?.uid) return;

    const claimsQuery = query(
      collection(db, 'claims'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubClaims = onSnapshot(claimsQuery, (snap) => {
      setClaims(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'claims');
    });

    const policyQuery = query(
      collection(db, 'policies'),
      where('userId', '==', profile.uid),
      where('status', '==', 'active'),
      limit(1)
    );

    const unsubPolicy = onSnapshot(policyQuery, (snap) => {
      if (!snap.empty) {
        setPolicy({ id: snap.docs[0].id, ...snap.docs[0].data() } as InsurancePolicy);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'policies');
    });

    return () => {
      unsubClaims();
      unsubPolicy();
    };
  }, [profile?.uid]);

  const [paymentStatus, setPaymentStatus] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/payment/verify-config')
      .then(res => res.json())
      .then(data => setPaymentStatus(data))
      .catch(err => console.error("Failed to check payment status", err));
  }, []);

  const handlePayment = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get Razorpay Key & Create Order
      const [keyRes, orderRes] = await Promise.all([
        fetch('/api/payment/key').then(r => r.json()),
        fetch('/api/payment/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: profile.weeklyPremium || 50,
            receipt: `receipt_dash_${profile.uid}_${Date.now()}`,
          }),
        })
      ]);

      if (keyRes.error) {
        setError(keyRes.error);
        setLoading(false);
        return;
      }
      const { key } = keyRes;

      if (!orderRes.ok) throw new Error('Failed to create order');
      const order = await orderRes.json();

      // 3. Open Razorpay
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "ErgoShield Insurance",
        description: "Weekly Premium Payment",
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            if (verifyRes.ok) {
              toast.success('Payment successful! Your coverage has been extended.');
              // In a real app, you'd update the policy end date in Firestore here
              setTimeout(() => window.location.reload(), 2000);
            } else {
              toast.error('Payment verification failed.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Error verifying payment');
          }
        },
        prefill: {
          name: profile.fullName,
          email: profile.email,
          contact: profile.phoneNumber,
        },
        theme: {
          color: "#059669",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setError('Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Earnings', value: '₹0', icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Premium Paid', value: `₹${policy ? policy.premiumAmount : 0}`, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Claims', value: claims.filter(c => c.status === 'pending_auto' || c.status === 'needs_manual_review' || c.status === 'appealed').length.toString(), icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Payouts Received', value: `₹${claims.filter(c => c.status === 'processed' || c.status === 'approved').reduce((acc, c) => acc + c.amount, 0)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto">
      {/* Debug Section */}
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="bg-neutral-900 text-white p-3 rounded-full shadow-xl hover:scale-110 transition-transform"
        >
          <Activity size={20} />
        </button>
        
        <AnimatePresence>
          {showDebug && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 right-0 w-80 bg-white rounded-[32px] shadow-2xl border border-neutral-100 p-6 space-y-4"
            >
              <h4 className="font-black text-neutral-900">Auth Diagnostics</h4>
              <div className="space-y-2 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Email:</span>
                  <span className="text-neutral-900 truncate ml-2">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Role:</span>
                  <span className="text-neutral-900">{profile?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">isAdmin Flag:</span>
                  <span className={isAdmin ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                    {isAdmin ? 'TRUE' : 'FALSE'}
                  </span>
                </div>
              </div>
              
              {!isAdmin && user?.email && AUTHORIZED_ADMINS.includes(user.email.toLowerCase()) && (
                <button 
                  onClick={handleRepairRole}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                >
                  Repair Admin Role
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mock Event Alert */}
      <AnimatePresence>
        {mockEvent.type && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-500 text-white p-6 rounded-[32px] shadow-lg shadow-amber-200 flex items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight">Mock {mockEvent.type === 'rain' ? 'Rain' : 'Flood'} Alert – Claims Generated for Workers</h4>
                <p className="text-sm font-medium opacity-90">This is a simulation for testing purposes in {mockEvent.location}.</p>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Active Simulation</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-neutral-900 tracking-tighter mb-2">
            Hello, {profile?.fullName?.split(' ')[0] || 'Sree'}!
          </h1>
          <p className="text-lg text-neutral-500 font-medium">
            Here's what's happening with your ErgoShield insurance.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 border border-emerald-100 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Payments Ready</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-6 py-3 rounded-2xl">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              Active Plan: <span className="text-emerald-900">Amazon Plan</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Shield size={24} />
          </div>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Risk Profile</p>
          <div className="mt-2 space-y-1">
            <p className="text-lg font-black text-neutral-900 tracking-tight capitalize">{profile?.riskZone || 'Inland'} Zone</p>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{profile?.cityTier || 'Tier 2'} City</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <User size={24} />
          </div>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Trust Score</p>
          <div className="mt-2 space-y-1">
            <p className="text-lg font-black text-neutral-900 tracking-tight">{profile?.trustScore || 92}%</p>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Reliability: High</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <TrendingUp size={24} />
          </div>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Active Policy</p>
          <p className="text-lg font-black text-neutral-900 mt-2 tracking-tight">{policy?.policyName || 'Basic Shield'}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <IndianRupee size={24} />
          </div>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Daily Premium</p>
          <p className="text-lg font-black text-neutral-900 mt-2 tracking-tight">₹{policy?.premiumAmount || 25}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Claims Paid</p>
          <p className="text-lg font-black text-neutral-900 mt-2 tracking-tight">₹{claims.filter(c => c.status === 'processed' || c.status === 'approved' || c.status === 'completed').reduce((acc, c) => acc + c.amount, 0)}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weather Widget */}
        <div className="lg:col-span-2 space-y-8">
          <EmergencyAlerts alerts={alerts} />
          <WeatherWidget onWeatherUpdate={setWeather} />
        </div>

        {/* Income Protection Widget */}
        <div className="space-y-8">
          <IncomeProtectionWidget policy={policy} claims={claims} />
          
          {/* Social Alerts Card */}
          <div className="bg-white rounded-[40px] p-8 border border-neutral-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-neutral-50 rounded-2xl">
                <Bell className="w-6 h-6 text-neutral-900" />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900">Social Alerts</h3>
                <p className="text-xs text-neutral-500 font-medium tracking-tight">Strikes & Local Disruptions</p>
              </div>
            </div>

            <div className="space-y-4">
              {activeDisruptions.length > 0 ? (
                activeDisruptions.map(d => (
                  <div key={d.id} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{d.type}</span>
                    </div>
                    <p className="text-sm font-bold text-red-900">{d.location}</p>
                    <p className="text-[10px] text-red-700/60 font-medium mt-1 leading-tight">
                      Automated claims are active for this event.
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <ShieldCheck className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No Active Strikes</p>
                  <p className="text-[10px] text-neutral-400 mt-1">Your area is currently stable.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-[40px] p-10 border border-neutral-100 shadow-sm flex flex-col justify-center items-center text-center space-y-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${weather?.isRisk ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {weather?.isRisk ? <AlertTriangle size={32} /> : <ShieldCheck size={32} />}
          </div>
          <div>
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight mb-2">
              Status: {weather?.isRisk ? 'Risk Detected' : 'Optimal'}
            </h3>
            <p className="text-neutral-500 font-medium">
              {weather?.isRisk 
                ? `${weather.riskReason || 'Severe Weather'} in ${weather.city}. Automated claims active.` 
                : `Conditions in ${weather?.city || 'your area'} are safe.`}
            </p>
            {weather?.lastUpdated && (
              <p className="text-[10px] text-neutral-400 font-medium mt-2 uppercase tracking-widest">
                Last Updated: {new Date(weather.lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${weather?.isRisk ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {weather?.isRisk ? <Zap size={14} className="animate-pulse" /> : <CheckCircle2 size={14} />}
            {weather?.isRisk ? 'Claim Trigger Active' : 'Monitoring'}
          </div>
        </div>

      {/* Claim Management Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Claim Management</h2>
          <button 
            onClick={() => navigate('/claims')}
            className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors flex items-center gap-2"
          >
            View All Claims <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {claims.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-[40px] border border-neutral-100 text-center">
              <p className="text-neutral-400 font-medium">No automated claims triggered yet.</p>
            </div>
          ) : (
            claims.slice(0, 4).map((claim) => (
              <motion.div 
                key={claim.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    claim.status === 'approved' || claim.status === 'processed' 
                      ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' 
                      : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                  }`}>
                    {claim.status === 'approved' || claim.status === 'processed' ? <CheckCircle2 size={20} /> : <Zap size={20} />}
                  </div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    {new Date(claim.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-black text-neutral-900 mb-1 line-clamp-1">{claim.triggerEvent}</h4>
                <p className="text-xs text-neutral-500 font-medium mb-4">Payout: ₹{claim.amount}</p>
                
                <div className="flex flex-col gap-3 pt-4 border-t border-neutral-50">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      claim.status === 'approved' || claim.status === 'processed' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {claim.status === 'processed' ? 'Paid' : claim.status === 'approved' ? 'Ready' : claim.status}
                    </span>
                    <div className="w-6 h-6 bg-neutral-50 rounded-full flex items-center justify-center">
                      <ArrowRight size={12} className="text-neutral-300" />
                    </div>
                  </div>

                  {claim.status === 'approved' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPayoutClaim(claim);
                      }}
                      className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={12} /> Instant Payout
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <PayoutModal 
        isOpen={!!selectedPayoutClaim}
        onClose={() => setSelectedPayoutClaim(null)}
        amount={selectedPayoutClaim?.amount || 0}
        claimId={selectedPayoutClaim?.id || ''}
      />
    </div>
  );
};
