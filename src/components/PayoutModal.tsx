import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, IndianRupee, ArrowRight, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  claimId: string;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, amount, claimId }) => {
  const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');

  useEffect(() => {
    if (!isOpen) {
      setStep('confirm');
    }
  }, [isOpen]);

  const handlePayout = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      toast.success(`₹${amount} credited to your bank account instantly!`);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 'confirm' && (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Zap size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Instant Payout</h3>
                  <p className="text-sm text-neutral-500 font-medium">Powered by Razorpay Instant</p>
                </div>
              </div>

              <div className="bg-neutral-50 p-6 rounded-3xl mb-8 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Claim ID</span>
                  <span className="text-sm font-bold text-neutral-900">CLM-{claimId.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Amount</span>
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">₹{amount}</span>
                </div>
                <div className="pt-4 border-t border-neutral-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Smartphone size={16} className="text-neutral-400" />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-medium leading-tight">
                    Funds will be transferred to your linked UPI ID: <span className="text-neutral-900 font-bold">sree****@okaxis</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handlePayout}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                >
                  Confirm Payout <ArrowRight size={18} />
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center space-y-6"
            >
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent"
                />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <IndianRupee size={32} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Processing Payout</h3>
                <p className="text-sm text-neutral-500 font-medium mt-2">Connecting to Razorpay secure gateway...</p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center space-y-6"
            >
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-50">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-neutral-900 tracking-tight">Success!</h3>
                <p className="text-sm text-neutral-500 font-medium mt-2">
                  ₹{amount} has been successfully credited to your account.
                </p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 justify-center">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Transaction ID: TXN_{Math.random().toString(36).slice(2, 10).toUpperCase()}</span>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-xl"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
