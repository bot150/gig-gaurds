import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { User, Mail, Phone, Shield, CreditCard, MapPin, Calendar, Save, X, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const ProfilePage: React.FC = () => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    fullName: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');

  if (!profile) return null;

  const handleEdit = () => {
    setEditedProfile({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber,
    });
    setIsEditing(true);
    setError('');
  };

  const handleSave = async () => {
    if (!profile.uid) return;
    setLoading(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        fullName: editedProfile.fullName,
        phoneNumber: editedProfile.phoneNumber,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const infoItems = [
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: 'Phone', value: profile.phoneNumber },
    { icon: Shield, label: 'Category', value: `${profile.category} (${profile.subCategory})` },
    { icon: CreditCard, label: 'Aadhar', value: `XXXX-XXXX-${profile.aadharNumber?.slice(-4)}` },
    { icon: MapPin, label: 'Location', value: 'Mumbai, India' },
    { icon: Calendar, label: 'Joined', value: new Date(profile.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-emerald-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-8">
            <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-lg">
              <div className="w-full h-full bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 font-bold text-3xl">
                {profile.fullName.charAt(0)}
              </div>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-neutral-100 text-neutral-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                  <X size={16} /> Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEdit}
                className="bg-neutral-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-neutral-800 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="mb-8">
            {isEditing ? (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                    value={editedProfile.fullName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input 
                    type="tel"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                    value={editedProfile.phoneNumber}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phoneNumber: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-neutral-900">{profile.fullName}</h2>
                <p className="text-neutral-500 flex items-center gap-2 mt-1">
                  <Shield size={16} className="text-emerald-600" />
                  Verified Delivery Partner
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {infoItems.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-400 shadow-sm">
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{item.label}</p>
                  <p className="text-neutral-900 font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-emerald-50 rounded-3xl p-8 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-emerald-900">Weekly Protection Active</h3>
          <p className="text-emerald-700 mt-1">Your next premium of ₹{profile.weeklyPremium} will be deducted on Monday.</p>
        </div>
        <button className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">
          Manage Subscription
        </button>
      </div>
    </div>
  );
};
