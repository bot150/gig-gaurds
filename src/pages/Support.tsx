import React from 'react';
import { HelpCircle, MessageSquare, Phone, Mail, ChevronRight } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const faqs = [
    { q: "How do I file a claim?", a: "ErgoShield automatically detects weather disruptions. If you've been affected by an event we missed, you can file a manual claim in the Claims section." },
    { q: "When will I receive my payout?", a: "Parametric payouts are usually processed within 24 hours of the trigger event being confirmed." },
    { q: "Can I change my coverage plan?", a: "Yes, you can update your coverage preferences in your Profile settings at any time." },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center">
        <h2 className="text-5xl md:text-6xl font-display uppercase tracking-tighter text-neutral-900 mb-4">How can we help?</h2>
        <p className="text-neutral-500 text-lg font-medium">Our AI assistant and support team are here for you 24/7.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={28} />
          </div>
          <h3 className="text-xl font-display uppercase tracking-tighter text-neutral-900 mb-2">Live Chat</h3>
          <p className="text-sm text-neutral-500 mb-6">Talk to our AI assistant for instant answers.</p>
          <button className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">Start Chat</button>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm text-center">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Phone size={28} />
          </div>
          <h3 className="text-xl font-display uppercase tracking-tighter text-neutral-900 mb-2">Call Support</h3>
          <p className="text-sm text-neutral-500 mb-6">Available for emergency assistance.</p>
          <button className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">Call Now</button>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm text-center">
          <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail size={28} />
          </div>
          <h3 className="text-xl font-display uppercase tracking-tighter text-neutral-900 mb-2">Email Us</h3>
          <p className="text-sm text-neutral-500 mb-6">Send us your detailed queries.</p>
          <button className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">Send Email</button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 bg-neutral-50/50">
          <h3 className="text-2xl font-display uppercase tracking-tighter text-neutral-900">Frequently Asked Questions</h3>
        </div>
        <div className="divide-y divide-neutral-100">
          {faqs.map((faq, i) => (
            <div key={i} className="p-8 hover:bg-neutral-50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-neutral-900">{faq.q}</h4>
                <ChevronRight size={20} className="text-neutral-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <p className="text-neutral-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
