import React, { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare, Phone, Mail, ChevronRight, X, Bot, Clock, CheckCircle, MessageCircle, Send, Image as ImageIcon, Check } from 'lucide-react';
import { AIChatBoard } from '../components/AIChatBoard';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { Complaint } from '../types';
import { toast } from 'sonner';

export const Support: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewComplaint, setShowNewComplaint] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ subject: '', description: '', paymentId: '', proof: '' });
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!auth.currentUser || !profile) return;

    let q;
    if (isAdmin) {
      // Admins see all complaints
      q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    } else {
      // Workers see only their own
      q = query(
        collection(db, 'complaints'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Complaint[];
      setComplaints(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    });

    return () => unsubscribe();
  }, [isAdmin, profile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewComplaint(prev => ({ ...prev, proof: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;

    try {
      await addDoc(collection(db, 'complaints'), {
        userId: auth.currentUser.uid,
        userName: profile.fullName,
        userEmail: profile.email,
        subject: newComplaint.subject,
        description: newComplaint.description,
        paymentId: newComplaint.paymentId,
        proofUrl: newComplaint.proof,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Complaint submitted successfully.');
      setNewComplaint({ subject: '', description: '', paymentId: '', proof: '' });
      setShowNewComplaint(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'complaints');
    }
  };

  const handleReply = async (complaintId: string) => {
    const text = replyText[complaintId];
    if (!text?.trim()) return;

    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        adminResponse: text,
        respondedAt: new Date().toISOString(),
        status: 'solved'
      });
      toast.success('Response sent and marked as solved.');
      setReplyText(prev => ({ ...prev, [complaintId]: '' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="text-center">
        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter mb-4">
          {isAdmin ? 'Help & Support Management' : 'How can we help?'}
        </h2>
        <p className="text-neutral-500 text-lg font-medium">
          {isAdmin ? 'Manage worker complaints and provide assistance.' : 'Our AI assistant and support team are here for you 24/7.'}
        </p>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm text-center group hover:border-emerald-500 transition-all">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Bot size={28} />
            </div>
            <h3 className="font-bold text-neutral-900 mb-2">AI Chat Board</h3>
            <p className="text-sm text-neutral-500 mb-6">Talk to our AI assistant for instant answers.</p>
            <button className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">
              Start Chat
            </button>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm text-center group hover:border-emerald-500 transition-all">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <MessageCircle size={28} />
            </div>
            <h3 className="font-bold text-neutral-900 mb-2">Raise a Complaint</h3>
            <p className="text-sm text-neutral-500 mb-6">Submit a formal complaint to our admin team.</p>
            <button 
              onClick={() => setShowNewComplaint(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              New Complaint
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNewComplaint && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative">
              <button onClick={() => setShowNewComplaint(false)} className="absolute top-8 right-8 text-neutral-400 hover:text-neutral-900">
                <X size={24} />
              </button>
              <h3 className="text-3xl font-black text-neutral-900 mb-6 tracking-tight">New Complaint</h3>
              <form onSubmit={handleSubmitComplaint} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Subject</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Brief summary of the issue"
                    value={newComplaint.subject}
                    onChange={e => setNewComplaint({ ...newComplaint, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Description</label>
                  <textarea 
                    required
                    rows={4}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    placeholder="Provide detailed information..."
                    value={newComplaint.description}
                    onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Payment ID (Optional)</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Enter Payment ID if applicable"
                    value={newComplaint.paymentId}
                    onChange={e => setNewComplaint({ ...newComplaint, paymentId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Proof Image (Optional)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label 
                      htmlFor="proof-upload"
                      className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-neutral-400 cursor-pointer hover:border-emerald-500 hover:text-emerald-500 transition-all"
                    >
                      <ImageIcon size={24} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {newComplaint.proof ? 'Image Selected' : 'Attach Proof / Screenshot'}
                      </span>
                    </label>
                  </div>
                  {newComplaint.proof && (
                    <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200">
                      <img src={newComplaint.proof} alt="Proof preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setNewComplaint(prev => ({ ...prev, proof: '' }))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                  Submit Complaint
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">
            {isAdmin ? 'All Active Complaints' : 'Your Support History'}
          </h3>
          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-50 px-3 py-1 rounded-full">
            {complaints.length} Total
          </span>
        </div>
        <div className="divide-y divide-neutral-100">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <p className="font-medium">No complaints found.</p>
            </div>
          ) : (
            complaints.map((comp) => (
              <div key={comp.id} className="p-8 space-y-6 hover:bg-neutral-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-neutral-900 text-lg tracking-tight">{comp.subject}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        comp.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {comp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(comp.createdAt).toLocaleString()}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} />
                          {comp.userEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm space-y-4">
                  <p className="text-neutral-600 text-sm leading-relaxed">{comp.description}</p>
                  {(comp.paymentId || comp.proofUrl) && (
                    <div className="pt-4 border-t border-neutral-50 flex flex-wrap gap-6">
                      {comp.paymentId && (
                        <div>
                          <span className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Payment ID</span>
                          <span className="text-sm font-bold text-neutral-900">{comp.paymentId}</span>
                        </div>
                      )}
                      {comp.proofUrl && (
                        <div>
                          <span className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Proof Image</span>
                          <button 
                            onClick={() => window.open(comp.proofUrl, '_blank')}
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 hover:border-emerald-500 transition-all group"
                          >
                            <img src={comp.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <ImageIcon size={16} className="text-white" />
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {comp.adminResponse ? (
                  <div className="ml-8 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      <CheckCircle size={14} />
                      Admin Response • {new Date(comp.respondedAt!).toLocaleString()}
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                      <p className="text-emerald-900 text-sm leading-relaxed font-medium">{comp.adminResponse}</p>
                    </div>
                  </div>
                ) : isAdmin ? (
                  <div className="ml-8 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      <MessageSquare size={14} />
                      Provide Response
                    </div>
                    <div className="relative">
                      <textarea 
                        rows={3}
                        className="w-full px-6 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                        placeholder="Type your response here..."
                        value={replyText[comp.id!] || ''}
                        onChange={e => setReplyText({ ...replyText, [comp.id!]: e.target.value })}
                      />
                      <button 
                        onClick={() => handleReply(comp.id!)}
                        disabled={!replyText[comp.id!]?.trim()}
                        className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-8 flex items-center gap-3 text-neutral-400 italic text-xs font-medium">
                    <Clock size={14} />
                    Waiting for admin response...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
