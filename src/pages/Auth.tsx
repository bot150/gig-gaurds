import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, User, Phone, Chrome, Zap, Camera, RefreshCw, Check, MapPin } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { getRiskDataForCity } from '../services/riskService';
import { AUTHORIZED_ADMINS } from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const Auth: React.FC = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-neutral-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
        
        <div className="flex justify-center mb-8">
          <div className="flex bg-neutral-100 p-1 rounded-2xl">
            <button
              onClick={() => setRole('worker')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                role === 'worker' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Worker
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                role === 'admin' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {isLogin ? <Login role={role} /> : <Signup role={role} />}
      </div>
    </div>
  );
};

export const Login: React.FC<{ role: 'worker' | 'admin' }> = ({ role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();
  const { login, forgotPassword, resetPassword, loginWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (role === 'admin' && !password.endsWith('@ergoshield')) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      await login(email, password);
      // Check if user is admin to redirect to admin dashboard
      const isAuthAdmin = AUTHORIZED_ADMINS.includes(email.toLowerCase()) || password.endsWith('@ergoshield');
      toast.info(`Login check: ${email} is ${isAuthAdmin ? '' : 'NOT '}an authorized admin.`);
      
      if (isAuthAdmin) {
        navigate('/admin/analytics');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setResetStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword(email, otp, newPassword);
      setForgotPasswordMode(false);
      setResetStep('email');
      setEmail('');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (forgotPasswordMode) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200">
            <RefreshCw size={40} />
          </div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tighter mb-2">Reset Password</h2>
          <p className="text-neutral-500 text-center font-medium">
            {resetStep === 'email' && "Enter your email to receive a reset code."}
            {resetStep === 'otp' && "Enter the 6-digit code sent to your email."}
            {resetStep === 'new_password' && "Create a secure new password."}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex items-center gap-3">
            {error}
          </div>
        )}

        <form onSubmit={resetStep === 'email' ? handleForgotPassword : handleResetPassword} className="space-y-5">
          {resetStep === 'email' && (
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {resetStep === 'otp' && (
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Verification Code</label>
              <div className="relative">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-black text-2xl tracking-[0.5em] text-center"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (e.target.value.length === 6) setResetStep('new_password');
                  }}
                />
              </div>
            </div>
          )}

          {resetStep === 'new_password' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : resetStep === 'email' ? 'Send Code' : 'Reset Password'}
          </button>

          <button
            type="button"
            onClick={() => { setForgotPasswordMode(false); setResetStep('email'); }}
            className="w-full text-neutral-500 font-bold hover:text-neutral-700 transition-all"
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200">
          <Shield size={40} />
        </div>
        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter mb-2">
          {role === 'admin' ? 'Admin Login' : 'Worker Login'}
        </h2>
        <p className="text-neutral-500 text-center font-medium">
          {role === 'admin' ? 'Secure access to the control center.' : 'Secure your income with ErgoShield.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex items-center gap-3">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {role === 'worker' && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-neutral-100 text-neutral-900 font-black text-lg py-4 rounded-2xl hover:bg-neutral-50 hover:border-emerald-600 transition-all shadow-sm group"
            >
              <Chrome size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-neutral-400 font-bold tracking-widest">Or email</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="block text-sm font-bold text-neutral-700">Password</label>
              <button 
                type="button"
                onClick={() => setForgotPasswordMode(true)}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="text-center mt-10 text-neutral-600 font-medium">
        New to ErgoShield?{' '}
        <Link to="/signup" className="text-emerald-600 font-bold hover:underline">Create Account</Link>
      </p>
    </div>
  );
};

export const Signup: React.FC<{ role: 'worker' | 'admin' }> = ({ role }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    location: 'Detecting...',
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [isIframe, setIsIframe] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const { signUp, verifyOTP, resendOTP, profile, user, loginWithGoogle } = useAuth();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isSigningUpAsAdmin = role === 'admin';

  useEffect(() => {
    // Detect location automatically
    const detectLocation = async () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
            if (apiKey) {
              const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`);
              const data = await response.json();
              if (data && data.length > 0) {
                setFormData(prev => ({ ...prev, location: data[0].name }));
              } else {
                setFormData(prev => ({ ...prev, location: 'Vijayawada' }));
              }
            } else {
              setFormData(prev => ({ ...prev, location: 'Vijayawada' }));
            }
          } catch (err) {
            console.error("Location detection error:", err);
            setFormData(prev => ({ ...prev, location: 'Vijayawada' }));
          }
        }, (err) => {
          console.error("Geolocation error:", err);
          setFormData(prev => ({ ...prev, location: 'Vijayawada' }));
        });
      } else {
        setFormData(prev => ({ ...prev, location: 'Vijayawada' }));
      }
    };

    detectLocation();
    return () => stopCamera();
  }, []);

  // Removed auto-show OTP for login

  useEffect(() => {
    if (isCapturing && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCapturing, stream]);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    
    const checkDevices = async () => {
      if (role !== 'worker') return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableDevices(devices.filter(d => d.kind === 'videoinput'));
      } catch (e) {
        console.warn("enumerateDevices not supported", e);
      }
    };
    checkDevices();
  }, []);

  const startCamera = async () => {
    setIsCapturing(true);
    setError("");
    
    try {
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Use the most basic constraints for maximum compatibility
      const constraints = { 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setStream(newStream);
      setPermissionStatus('granted');
      setError("");
    } catch (err) {
      console.error("Camera access error:", err);
      const errName = err instanceof Error ? err.name : 'UnknownError';
      
      setPermissionStatus('denied');
      
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setError("Camera is still blocked by the browser's preview window security. Even with settings 'Allowed', you must click 'Retry' or use the Upload button below.");
      } else {
        setError(`Camera error: ${errName}. Please ensure no other app is using it.`);
      }
      
      setIsCapturing(false);
      setStream(null);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        setIsCapturing(false);
        setError("");
        toast.success("Photo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'worker' && !photo) {
      setError('Please capture a live photo for verification.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isSigningUpAsAdmin && !formData.password.endsWith('@ergoshield')) {
        setError('Invalid registration credentials.');
        setLoading(false);
        return;
      }

      const finalLocation = formData.location === 'Detecting...' ? 'Vijayawada' : formData.location;
      
      const phoneIndexRef = doc(db, 'indices', `phone_${formData.phoneNumber}`);
      const phoneSnap = await getDoc(phoneIndexRef);
      
      if (phoneSnap.exists()) {
        setError('This phone number is already registered.');
        setLoading(false);
        return;
      }
      
      await signUp(formData.email, formData.password, formData.fullName, formData.phoneNumber, role);
      
      const riskData = getRiskDataForCity(finalLocation);
      await setDoc(doc(db, 'users', auth.currentUser!.uid), {
        photoURL: photo || '',
        location: finalLocation,
        riskZone: riskData.zone,
        cityTier: riskData.tier,
        role: role, // Use the selected role
      }, { merge: true });

      await setDoc(phoneIndexRef, { ownerId: auth.currentUser!.uid, type: 'phone' });
      
      setShowOtp(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verifyOTP(otp);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200">
            <Zap size={40} />
          </div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tighter mb-2">Verify Email</h2>
          <p className="text-neutral-500 text-center font-medium">
            Verification code sent to your email. Please enter the OTP to activate your account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex items-center gap-3">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1 text-center">6-Digit OTP</label>
            <input
              type="text"
              required
              maxLength={6}
              className="w-full py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-black text-3xl tracking-[0.5em] text-center"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => resendOTP()}
              className="text-emerald-600 font-bold hover:underline text-sm"
            >
              Resend OTP
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200">
          <Shield size={40} />
        </div>
        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter mb-2">
          {isSigningUpAsAdmin ? 'Admin Registration' : 'Join ErgoShield'}
        </h2>
        <p className="text-neutral-500 text-center font-medium">
          {isSigningUpAsAdmin 
            ? 'Create your secure administrator profile.' 
            : 'Create your secure worker profile in seconds.'}
        </p>
      </div>

      {error && (!error.toLowerCase().includes("camera") || role === 'worker') && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Shield className="shrink-0" size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        {role === 'worker' && (
          <>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError('');
                try {
                  await loginWithGoogle();
                  navigate('/dashboard');
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-neutral-100 text-neutral-900 font-black text-lg py-4 rounded-2xl hover:bg-neutral-50 hover:border-emerald-600 transition-all shadow-sm group mb-6"
            >
              <Chrome size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
              {loading ? 'Connecting...' : 'Sign up with Google'}
            </button>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-neutral-400 font-bold tracking-widest">Or create account</span>
              </div>
            </div>

            <div className="mb-6">
            <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Live Verification Photo</label>
            <p className="text-[10px] text-neutral-400 mb-2 ml-1 uppercase tracking-widest font-bold">Required for identity verification</p>
            <div className="relative aspect-video bg-neutral-100 rounded-2xl overflow-hidden border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center group">
              {photo ? (
                <div className="relative w-full h-full">
                  <img src={photo} alt="Verification" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); startCamera(); }}
                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg text-neutral-700 hover:text-emerald-600 transition-all"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
              ) : isCapturing ? (
                <div className="relative w-full h-full">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-emerald-500 flex items-center justify-center shadow-2xl"
                  >
                    <div className="w-10 h-10 bg-emerald-500 rounded-full" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex flex-col items-center gap-4 group transition-all"
                  >
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-300 relative">
                      <Camera size={40} />
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-200 animate-ping opacity-20" />
                    </div>
                    <div className="text-center">
                      <span className="block text-sm font-black text-neutral-900 uppercase tracking-widest mb-1">
                        {error.includes("camera") || error.includes("denied") ? "Retry Camera" : "Enable Camera"}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Click to start live verification
                      </span>
                    </div>
                  </button>
                  
                  {(error.includes("denied") || error.includes("camera") || error.includes("blocked")) && (
                    <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-[240px]">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={16} />
                        RETRY LIVE CAMERA
                      </button>
                      <p className="text-[9px] text-neutral-500 text-center leading-tight font-bold">
                        Chrome blocks camera in preview windows. <br/>
                        <span className="text-emerald-600">Click Retry above</span> to try again now that you've given permission.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="user"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </>
      )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="tel"
                required
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="+91 98765 43210"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg w-fit">
          <MapPin size={14} className="text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Detected: {formData.location}</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 mt-4"
        >
          {loading 
            ? (isSigningUpAsAdmin ? 'Creating Account as Admin...' : 'Creating Account...') 
            : (isSigningUpAsAdmin ? 'Create Account as Admin' : 'Create Account')}
        </button>
      </form>

      <p className="text-center mt-10 text-neutral-600 font-medium">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 font-bold hover:underline">Sign In</Link>
      </p>
    </div>
  );
};
