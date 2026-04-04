import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, User, Phone, Chrome, Zap, Camera, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

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
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (role === 'admin') {
      setError('Admins must use email and password with @ergoshield validation.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
      
      if (!userDoc?.exists()) {
        if (user.phoneNumber) {
          const phoneIndexRef = doc(db, 'indices', `phone_${user.phoneNumber}`);
          let phoneSnap;
          try {
            phoneSnap = await getDoc(phoneIndexRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `indices/phone_${user.phoneNumber}`);
          }

          if (phoneSnap?.exists()) {
            setError('The phone number associated with this Google account is already registered.');
            setLoading(false);
            await auth.signOut();
            return;
          }
          try {
            await setDoc(phoneIndexRef, { ownerId: user.uid, type: 'phone' });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `indices/phone_${user.phoneNumber}`);
          }
        }

        try {
          await setDoc(userDocRef, {
            uid: user.uid,
            fullName: user.displayName || 'New User',
            email: user.email,
            phoneNumber: user.phoneNumber || '',
            role: 'worker',
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
        navigate('/onboarding');
      } else {
        const data = userDoc.data();
        if (data.role === 'admin') {
          setError('This account is an admin. Please use the Admin login flow.');
          await auth.signOut();
          return;
        }
        navigate('/dashboard');
      }
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
        setError('Invalid admin password. Admin passwords must end with @ergoshield');
        setLoading(false);
        return;
      }

      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User profile not found.');
        await auth.signOut();
        return;
      }

      const profile = userDoc.data();
      
      if (role === 'admin' && profile.role !== 'admin') {
        setError('This account is not registered as an admin.');
        await auth.signOut();
        return;
      }

      if (role === 'worker' && profile.role === 'admin') {
        setError('This account is an admin. Please use the Admin login flow.');
        await auth.signOut();
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Password</label>
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
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera.");
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
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

    if (role === 'admin' && !formData.password.endsWith('@ergoshield')) {
      setError('Invalid admin password. Admin passwords must end with @ergoshield');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const phoneIndexRef = doc(db, 'indices', `phone_${formData.phoneNumber}`);
      const phoneSnap = await getDoc(phoneIndexRef);
      
      if (phoneSnap.exists()) {
        setError('This phone number is already registered.');
        setLoading(false);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        photoURL: photo || '',
        role: role,
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      await setDoc(phoneIndexRef, { ownerId: user.uid, type: 'phone' });

      if (role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200">
          <Shield size={40} />
        </div>
        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter mb-2">
          {role === 'admin' ? 'Admin Registration' : 'Join ErgoShield'}
        </h2>
        <p className="text-neutral-500 text-center font-medium">
          {role === 'admin' ? 'Create an administrative account.' : 'Create your secure profile in seconds.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex items-center gap-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        {role === 'worker' && (
          <div className="mb-6">
            <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Live Verification Photo</label>
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
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-emerald-500 flex items-center justify-center shadow-2xl"
                  >
                    <div className="w-10 h-10 bg-emerald-500 rounded-full" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex flex-col items-center gap-3 text-neutral-400 hover:text-emerald-600 transition-all"
                >
                  <Camera size={32} />
                  <span className="text-xs font-bold uppercase tracking-widest">Start Camera</span>
                </button>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 mt-4"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center mt-10 text-neutral-600 font-medium">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 font-bold hover:underline">Sign In</Link>
      </p>
    </div>
  );
};
