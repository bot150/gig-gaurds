import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';
import { ShoppingBag, Utensils, Zap, ChevronRight, CheckCircle2, Upload, CreditCard, UserCheck, AlertCircle, Camera, RefreshCw } from 'lucide-react';
import { calculateRiskScore, verifyAadhar, verifyBankAccount } from '../services/gemini';
import { useRef } from 'react';

const categories = [
  {
    id: 'food',
    title: 'Food Delivery',
    icon: Utensils,
    color: 'bg-orange-100 text-orange-600',
    options: ['Swiggy', 'Zomato']
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce',
    icon: ShoppingBag,
    color: 'bg-blue-100 text-blue-600',
    options: ['Amazon', 'Flipkart', 'Myntra', 'AJIO']
  },
  {
    id: 'quick_commerce',
    title: 'Quick Commerce',
    icon: Zap,
    color: 'bg-yellow-100 text-yellow-600',
    options: ['Zepto', 'Blinkit']
  }
];

export const Onboarding: React.FC = () => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState({
    aadharNumber: '',
    bankAccount: '',
    ifsc: '',
    age: '',
  });
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [aadharFileName, setAadharFileName] = useState<string>('');
  const [aadharBackFile, setAadharBackFile] = useState<File | null>(null);
  const [aadharBackFileName, setAadharBackFileName] = useState<string>('');
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [bankFileName, setBankFileName] = useState<string>('');
  const [livePhoto, setLivePhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [accountData, setAccountData] = useState({
    emailOrPhone: profile?.email || user?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setStep(2);
  };

  const handleSubSelect = (sub: string) => {
    setSelectedSub(sub);
    setStep(3);
  };

  const handleVerificationContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera access. Please use a modern browser.");
      return;
    }

    setCameraActive(true);
    setError(null);

    try {
      // Try with facingMode: 'user' first for front camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        });
      } catch (e) {
        // Fallback to any video device if 'user' fails
        console.warn("facingMode: 'user' failed, falling back to generic video", e);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(
          <div className="flex flex-col gap-3">
            <p><strong>Camera Permission Denied.</strong></p>
            <p className="text-sm">To fix this:</p>
            <ol className="text-xs text-left list-decimal pl-4 space-y-1">
              <li>Click the <strong>lock icon</strong> in your browser's address bar.</li>
              <li>Change Camera to <strong>"Allow"</strong>.</li>
              <li>Refresh this page.</li>
            </ol>
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs mb-2">Still having trouble? The preview window might be blocking access.</p>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Open App in New Tab
              </a>
            </div>
          </div>
        );
      } else {
        setError("Could not access camera. Please ensure no other app is using your camera and try again.");
      }
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/jpeg');
        setLivePhoto(data);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions to proceed.');
      return;
    }

    if (!livePhoto) {
      setError('Please take a live photo for identity verification.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Check for duplicates using index collection
      const aadharIndexRef = doc(db, 'indices', `aadhar_${verificationData.aadharNumber}`);
      const bankIndexRef = doc(db, 'indices', `bank_${verificationData.bankAccount}`);
      
      const [aadharSnap, bankSnap] = await Promise.all([
        getDoc(aadharIndexRef),
        getDoc(bankIndexRef)
      ]);

      if (aadharSnap.exists() && aadharSnap.data().ownerId !== user.uid) {
        setError('This Aadhar number is already registered with another account.');
        setLoading(false);
        return;
      }

      if (bankSnap.exists() && bankSnap.data().ownerId !== user.uid) {
        setError('This Bank account is already registered with another account.');
        setLoading(false);
        return;
      }

      // 2. AI Verification of Aadhar Card
      if (!aadharFile || !aadharBackFile) {
        setError('Please upload both front and back pages of your Aadhar card.');
        setLoading(false);
        return;
      }

      if (!bankFile) {
        setError('Please upload your bank document (passbook/cancelled cheque).');
        setLoading(false);
        return;
      }

      // Convert files to base64 for Gemini
      const fileToBase64 = (file: File) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const [aadharBase64, bankBase64] = await Promise.all([
        fileToBase64(aadharFile),
        fileToBase64(bankFile)
      ]);

      // Verify Aadhar Front
      const aadharResult = await verifyAadhar(
        verificationData.aadharNumber,
        aadharBase64,
        aadharFile.type
      );

      if (!aadharResult.verified) {
        setError(`Aadhar Verification Failed: ${aadharResult.reason}`);
        setLoading(false);
        return;
      }

      // Verify Bank Account
      const bankResult = await verifyBankAccount(
        verificationData.bankAccount,
        bankBase64,
        bankFile.type
      );

      if (!bankResult.verified) {
        setError(`Bank Verification Failed: ${bankResult.reason}`);
        setLoading(false);
        return;
      }

      // 3. Upload All Files to Storage
      const uploadFile = async (file: File, path: string) => {
        const fileRef = ref(storage, `${path}/${user.uid}_${Date.now()}_${file.name}`);
        const result = await uploadBytes(fileRef, file);
        return getDownloadURL(result.ref);
      };

      const uploadBase64 = async (base64: string, path: string) => {
        const fileRef = ref(storage, `${path}/${user.uid}_${Date.now()}.jpg`);
        const blob = await (await fetch(base64)).blob();
        const result = await uploadBytes(fileRef, blob);
        return getDownloadURL(result.ref);
      };

      const [aadharUrl, aadharBackUrl, bankUrl, livePhotoUrl] = await Promise.all([
        uploadFile(aadharFile, 'aadhar_front'),
        uploadFile(aadharBackFile, 'aadhar_back'),
        uploadFile(bankFile, 'bank_docs'),
        uploadBase64(livePhoto, 'live_photos')
      ]);

      // 4. Simulate AI Risk Profiling
      const riskResult = await calculateRiskScore("Mumbai, India", { temp: 32, humidity: 80, forecast: "Heavy Rain" });
      
      // 5. Update User Profile
      await updateDoc(doc(db, 'users', user.uid), {
        category: selectedCategory,
        subCategory: selectedSub,
        aadharNumber: verificationData.aadharNumber,
        aadharCardUrl: aadharUrl,
        aadharBackUrl: aadharBackUrl,
        bankAccountNumber: verificationData.bankAccount,
        bankDocUrl: bankUrl,
        livePhotoUrl: livePhotoUrl,
        ifscCode: verificationData.ifsc,
        age: parseInt(verificationData.age),
        riskScore: riskResult.score,
        weeklyPremium: riskResult.premium,
        onboarded: true,
        aadharVerified: true,
        bankVerified: true
      });

      // 5.1 Create Active Policy
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 1); // 1 year policy

      await addDoc(collection(db, 'policies'), {
        userId: user.uid,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        premiumAmount: riskResult.premium,
        coverageAmount: 50000, // Default coverage
      });

      // 6. Create Indices for uniqueness
      await Promise.all([
        setDoc(aadharIndexRef, { ownerId: user.uid, type: 'aadhar' }),
        setDoc(bankIndexRef, { ownerId: user.uid, type: 'bank' })
      ]);

      setStep(5);
    } catch (err) {
      console.error(err);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 border border-neutral-100">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-emerald-600' : 'bg-neutral-100'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Select Your Category</h2>
            <p className="text-neutral-500 mb-8">Tell us which platform you deliver for</p>
            <div className="grid grid-cols-1 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className="flex items-center gap-4 p-6 bg-neutral-50 border border-neutral-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                    <cat.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-neutral-900 text-lg">{cat.title}</h3>
                    <p className="text-sm text-neutral-500">{cat.options.join(', ')}</p>
                  </div>
                  <ChevronRight className="text-neutral-300 group-hover:text-emerald-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button onClick={() => setStep(1)} className="text-emerald-600 font-medium mb-6 flex items-center gap-1">
              ← Back to Categories
            </button>
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Choose Platform</h2>
            <p className="text-neutral-500 mb-8">Select the specific app you use</p>
            <div className="grid grid-cols-2 gap-4">
              {categories.find(c => c.id === selectedCategory)?.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSubSelect(opt)}
                  className="p-6 bg-neutral-50 border border-neutral-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all font-bold text-neutral-800"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Verification</h2>
            <p className="text-neutral-500 mb-8">We need some details to verify your identity</p>
            <form onSubmit={handleVerificationContinue} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Aadhar Number</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="text"
                      required
                      placeholder="1234 5678 9012"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      value={verificationData.aadharNumber}
                      onChange={(e) => setVerificationData({ ...verificationData, aadharNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Age</label>
                  <input
                    type="number"
                    required
                    placeholder="25"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    value={verificationData.age}
                    onChange={(e) => setVerificationData({ ...verificationData, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Bank Account Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="text"
                      required
                      placeholder="Account Number"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      value={verificationData.bankAccount}
                      onChange={(e) => setVerificationData({ ...verificationData, bankAccount: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="SBIN0001234"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    value={verificationData.ifsc}
                    onChange={(e) => setVerificationData({ ...verificationData, ifsc: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Aadhar Front Page</label>
                  <div 
                    onClick={() => document.getElementById('aadhar-upload')?.click()}
                    className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      aadharFile ? 'bg-emerald-50 border-emerald-500' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      id="aadhar-upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAadharFile(file);
                          setAadharFileName(file.name);
                        }
                      }}
                    />
                    {aadharFile ? (
                      <>
                        <CheckCircle2 className="text-emerald-500" size={32} />
                        <p className="font-bold text-emerald-700 text-center text-xs truncate w-full">{aadharFileName}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400" size={32} />
                        <p className="font-medium text-neutral-600 text-sm">Front Page</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Aadhar Back Page</label>
                  <div 
                    onClick={() => document.getElementById('aadhar-back-upload')?.click()}
                    className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      aadharBackFile ? 'bg-emerald-50 border-emerald-500' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      id="aadhar-back-upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAadharBackFile(file);
                          setAadharBackFileName(file.name);
                        }
                      }}
                    />
                    {aadharBackFile ? (
                      <>
                        <CheckCircle2 className="text-emerald-500" size={32} />
                        <p className="font-bold text-emerald-700 text-center text-xs truncate w-full">{aadharBackFileName}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="text-neutral-400" size={32} />
                        <p className="font-medium text-neutral-600 text-sm">Back Page</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Bank Document (Passbook/Cheque)</label>
                <div 
                  onClick={() => document.getElementById('bank-upload')?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    bankFile ? 'bg-emerald-50 border-emerald-500' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <input
                    id="bank-upload"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBankFile(file);
                        setBankFileName(file.name);
                      }
                    }}
                  />
                  {bankFile ? (
                    <>
                      <CheckCircle2 className="text-emerald-500" size={32} />
                      <p className="font-bold text-emerald-700">{bankFileName}</p>
                    </>
                  ) : (
                    <>
                      <CreditCard className="text-neutral-400" size={32} />
                      <p className="font-medium text-neutral-600">Upload Bank Proof</p>
                      <p className="text-xs text-neutral-400">Must show account number & name</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Live Identity Verification</label>
                <div className="relative bg-neutral-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-neutral-200">
                  {livePhoto ? (
                    <div className="relative w-full h-full">
                      <img src={livePhoto} alt="Live" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setLivePhoto(null)}
                        className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-all"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  ) : cameraActive ? (
                    <div className="relative w-full h-full">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <button 
                        onClick={takePhoto}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-4 rounded-full shadow-xl hover:scale-110 transition-all"
                      >
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-600" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={startCamera}
                      className="flex flex-col items-center gap-3 text-white hover:text-emerald-400 transition-all"
                    >
                      <Camera size={48} />
                      <span className="font-bold">Take Live Photo</span>
                    </button>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all"
              >
                Continue to Account Setup
              </button>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Account & Terms</h2>
            <p className="text-neutral-500 mb-8">Review your account details and our policy terms</p>
            
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Registered Email/Phone</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-500 cursor-not-allowed"
                    value={accountData.emailOrPhone}
                  />
                  <p className="text-xs text-neutral-400 mt-2">This is the account linked to your ErgoShield profile.</p>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 space-y-4">
                <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Insurance Terms & Conditions
                </h3>
                <ul className="space-y-3 text-sm text-emerald-800">
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span><strong>Risk Score Calculation:</strong> We calculate a "Risk Score" (0-100) based on local weather patterns and platform disruption data.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span><strong>Premium Generation:</strong> Based on your score, we assign a Weekly Premium (typically ₹30, ₹50, or ₹70).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span><strong>Policy Summary:</strong> You will receive a summary including your personalized risk level, weekly cost, and maximum payout per disruption.</span>
                  </li>
                </ul>
                <label className="flex items-center gap-3 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    required
                    className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-emerald-900">I accept the terms and conditions</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
              >
                {loading ? 'Generating AI Profile...' : 'Accept & Complete Onboarding'}
              </button>
            </form>
          </div>
        )}

        {step === 5 && (
          <div className="text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={64} />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Verification Complete!</h2>
            <p className="text-neutral-500 mb-8">Your AI Risk Profile has been generated.</p>
            
            <div className="bg-neutral-50 rounded-2xl p-6 mb-8 text-left border border-neutral-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-neutral-600 font-medium">Risk Score</span>
                <span className="text-emerald-600 font-bold text-xl">{profile?.riskScore || 45}/100</span>
              </div>
              <div className="w-full bg-neutral-200 h-3 rounded-full mb-6 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-1000" 
                  style={{ width: `${profile?.riskScore || 45}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 font-medium">Weekly Premium</span>
                <span className="text-neutral-900 font-bold text-2xl">₹{profile?.weeklyPremium || 50}/week</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
