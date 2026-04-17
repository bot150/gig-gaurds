import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';
import { AUTHORIZED_ADMINS } from './constants';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phoneNumber: string, role: 'worker' | 'admin') => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyResetOTP: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  isAdmin: false,
  loading: true,
  signUp: async () => {},
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  verifyOTP: async () => {},
  resendOTP: async () => {},
  forgotPassword: async () => {},
  verifyResetOTP: async () => {},
  resetPassword: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = React.useMemo(() => {
    if (profile?.role === 'admin') return true;
    
    const userEmail = user?.email?.toLowerCase().trim();
    const profileEmail = profile?.email?.toLowerCase().trim();
    const authorized = AUTHORIZED_ADMINS.map(a => a.toLowerCase().trim());
    
    if (userEmail && authorized.includes(userEmail)) return true;
    if (profileEmail && authorized.includes(profileEmail)) return true;
    
    return false;
  }, [user?.email, profile?.email, profile?.role]);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userDoc = doc(db, 'users', firebaseUser.uid);
        unsubProfile = onSnapshot(userDoc, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            const userEmail = firebaseUser.email?.toLowerCase().trim();
            const isAuthorized = userEmail && AUTHORIZED_ADMINS.map(a => a.toLowerCase().trim()).includes(userEmail);

            // Bootstrap Admin Role for authorized emails
            if (isAuthorized && data.role !== 'admin') {
              console.log(`Authorized Admin detected: ${userEmail}. Updating role...`);
              try {
                await updateDoc(userDoc, { role: 'admin' });
                toast.success("Admin access activated.");
              } catch (e) {
                console.error("Failed to bootstrap admin role:", e);
                setProfile(data);
              }
            } else {
              setProfile(data);
            }
          } else {
            // If profile doesn't exist yet, don't set loading to false
            // It might be being created in signUp
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Error: ", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const signUp = async (email: string, password: string, fullName: string, phoneNumber: string, role: 'worker' | 'admin' = 'worker') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    const newProfile: UserProfile = {
      uid: userCredential.user.uid,
      fullName,
      email,
      phoneNumber,
      role,
      emailVerified: false,
      otpCode: otp,
      otpExpiry: expiry,
      otpAttempts: 0,
      createdAt: new Date().toISOString(),
      trustScore: 90,
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
    await setDoc(doc(db, 'indices', `email_${email}`), { ownerId: userCredential.user.uid, type: 'email' });
    
    // Send real OTP email using EmailJS
    try {
      await emailjs.send(
        "service_uojqexh",
        "template_3k8fzsh",
        {
          email: email.trim(),
          passcode: otp,
          time: "5 minutes"
        },
        "xVQ9BQ7mzd3cD0V3-"
      );
    } catch (e) {
      console.error("EmailJS Error:", e);
    }

    console.log(`[MOCK EMAIL] OTP for ${email}: ${otp}`);
    toast.info(`Verification code sent to ${email}`);
  };

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = doc(db, 'users', userCredential.user.uid);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      
      // Bootstrap Admin Role for authorized emails during login
      if (email && AUTHORIZED_ADMINS.includes(email.toLowerCase()) && data.role !== 'admin') {
        try {
          await updateDoc(userDoc, { role: 'admin' });
          toast.success("Admin access granted.");
        } catch (e) {
          console.error("Failed to bootstrap admin role during login:", e);
        }
      }

      if (!data.emailVerified) {
        toast.warning("Please verify your email to continue.");
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const userDoc = doc(db, 'users', userCredential.user.uid);
      let docSnap;
      try {
        docSnap = await getDoc(userDoc);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userCredential.user.uid}`);
      }
      
      const userEmail = userCredential.user.email?.toLowerCase().trim();
      const isAuthorizedAdmin = userEmail && AUTHORIZED_ADMINS.includes(userEmail);

      if (!docSnap?.exists()) {
        const newProfile: UserProfile = {
          uid: userCredential.user.uid,
          fullName: userCredential.user.displayName || 'Google User',
          email: userCredential.user.email || '',
          phoneNumber: userCredential.user.phoneNumber || '',
          role: isAuthorizedAdmin ? 'admin' : 'worker',
          emailVerified: true, // Google emails are pre-verified
          createdAt: new Date().toISOString(),
          trustScore: 90,
          photoURL: userCredential.user.photoURL || '',
        };
        
        try {
          await setDoc(userDoc, newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${userCredential.user.uid}`);
        }
        
        if (newProfile.email) {
          try {
            await setDoc(doc(db, 'indices', `email_${newProfile.email}`), { 
              ownerId: userCredential.user.uid, 
              type: 'email' 
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `indices/email_${newProfile.email}`);
          }
        }
        
        toast.success("Account created successfully with Google!");
      } else {
        const data = docSnap.data() as UserProfile;
        // Ensure email index exists
        if (data.email) {
          try {
            await setDoc(doc(db, 'indices', `email_${data.email}`), { 
              ownerId: userCredential.user.uid, 
              type: 'email' 
            }, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `indices/email_${data.email}`);
          }
        }

        // Bootstrap admin if needed
        if (isAuthorizedAdmin && data.role !== 'admin') {
          try {
            await updateDoc(userDoc, { role: 'admin' });
            toast.success("Admin access granted.");
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${userCredential.user.uid}`);
          }
        }
        
        toast.success("Signed in with Google!");
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        throw new Error("Login popup was blocked. Please enable popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore
      } else {
        console.error("Google Login Error:", error);
        throw error;
      }
    }
  };

  const verifyOTP = async (otp: string) => {
    if (!user || !profile) throw new Error("No active session");

    if (new Date() > new Date(profile.otpExpiry || '')) {
      throw new Error("OTP has expired. Please resend.");
    }

    if ((profile.otpAttempts || 0) >= 3) {
      throw new Error("Maximum attempts reached. Please resend OTP.");
    }

    if (profile.otpCode === otp) {
      await updateDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        otpCode: null,
        otpExpiry: null,
        otpAttempts: 0
      });
      toast.success("OTP verified! Account activated.");
    } else {
      await updateDoc(doc(db, 'users', user.uid), {
        otpAttempts: (profile.otpAttempts || 0) + 1
      });
      throw new Error("entered otp is wrong");
    }
  };

  const resendOTP = async () => {
    if (!user) throw new Error("No active session");
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await updateDoc(doc(db, 'users', user.uid), {
      otpCode: otp,
      otpExpiry: expiry,
      otpAttempts: 0
    });

    // Send real OTP email using EmailJS
    try {
      await emailjs.send(
        "service_uojqexh",
        "template_3k8fzsh",
        {
          email: user.email?.trim() || '',
          passcode: otp,
          time: "5 minutes"
        },
        "xVQ9BQ7mzd3cD0V3-"
      );
    } catch (e) {
      console.error("EmailJS Error:", e);
    }

    console.log(`[MOCK EMAIL] New OTP for ${user.email}: ${otp}`);
    toast.info("New verification code sent.");
  };

  const forgotPassword = async (email: string) => {
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();
    
    // Try original email index
    let emailIndexRef = doc(db, 'indices', `email_${cleanEmail}`);
    let emailSnap = await getDoc(emailIndexRef);
    
    let userId: string | null = null;

    if (emailSnap.exists()) {
      userId = emailSnap.data().ownerId;
    } else {
      // Try lowercase email index
      emailIndexRef = doc(db, 'indices', `email_${lowerEmail}`);
      emailSnap = await getDoc(emailIndexRef);
      if (emailSnap.exists()) {
        userId = emailSnap.data().ownerId;
      }
    }

    if (!userId) {
      // Fallback for legacy users: try exact match then lowercase match in Firestore
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        userId = querySnapshot.docs[0].id;
      } else {
        const qLower = query(collection(db, 'users'), where('email', '==', lowerEmail), limit(1));
        const querySnapshotLower = await getDocs(qLower);
        if (!querySnapshotLower.empty) {
          userId = querySnapshotLower.docs[0].id;
        }
      }
    }

    if (!userId) {
      throw new Error("No user found with this email. Please check the spelling or try registering again.");
    }
    
    // Repair the index for future use (using the email provided by user)
    try {
      await setDoc(doc(db, 'indices', `email_${cleanEmail}`), { ownerId: userId, type: 'email' });
    } catch (e) {
      console.warn("Failed to repair email index:", e);
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await updateDoc(doc(db, 'users', userId), {
      resetOtp: otp,
      resetOtpExpiry: expiry,
      resetOtpAttempts: 0
    });

    // Send real OTP email using EmailJS
    try {
      await emailjs.send(
        "service_uojqexh",
        "template_3k8fzsh",
        {
          email: cleanEmail,
          passcode: otp,
          time: "5 minutes"
        },
        "xVQ9BQ7mzd3cD0V3-"
      );
    } catch (e) {
      console.error("EmailJS Error:", e);
    }

    console.log(`[MOCK EMAIL] Reset OTP for ${cleanEmail}: ${otp}`);
    toast.info(`Password reset code sent to ${cleanEmail}`);
  };

  const verifyResetOTP = async (email: string, otp: string) => {
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();
    
    let userId: string | null = null;
    
    // Try original email index
    let emailIndexRef = doc(db, 'indices', `email_${cleanEmail}`);
    let emailSnap = await getDoc(emailIndexRef);
    
    if (emailSnap.exists()) {
      userId = emailSnap.data().ownerId;
    } else {
      // Try lowercase email index
      emailIndexRef = doc(db, 'indices', `email_${lowerEmail}`);
      emailSnap = await getDoc(emailIndexRef);
      if (emailSnap.exists()) {
        userId = emailSnap.data().ownerId;
      }
    }

    if (!userId) {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        userId = querySnapshot.docs[0].id;
      } else {
        const qLower = query(collection(db, 'users'), where('email', '==', lowerEmail), limit(1));
        const querySnapshotLower = await getDocs(qLower);
        if (!querySnapshotLower.empty) {
          userId = querySnapshotLower.docs[0].id;
        }
      }
    }

    if (!userId) throw new Error("User not found.");

    const userDoc = await getDoc(doc(db, 'users', userId));
    const data = userDoc.data() as UserProfile;

    if (new Date() > new Date(data.resetOtpExpiry || '')) {
      throw new Error("Reset OTP has expired.");
    }

    if ((data.resetOtpAttempts || 0) >= 3) {
      throw new Error("Maximum attempts reached.");
    }

    if (data.resetOtp !== otp) {
      await updateDoc(doc(db, 'users', userId), {
        resetOtpAttempts: (data.resetOtpAttempts || 0) + 1
      });
      throw new Error("entered otp is wrong");
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    await verifyResetOTP(email, otp);
    
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();
    let userId: string | null = null;

    // Try original email index
    let emailIndexRef = doc(db, 'indices', `email_${cleanEmail}`);
    let emailSnap = await getDoc(emailIndexRef);
    
    if (emailSnap.exists()) {
      userId = emailSnap.data().ownerId;
    } else {
      // Try lowercase email index
      emailIndexRef = doc(db, 'indices', `email_${lowerEmail}`);
      emailSnap = await getDoc(emailIndexRef);
      if (emailSnap.exists()) {
        userId = emailSnap.data().ownerId;
      }
    }

    if (!userId) {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        userId = querySnapshot.docs[0].id;
      } else {
        const qLower = query(collection(db, 'users'), where('email', '==', lowerEmail), limit(1));
        const querySnapshotLower = await getDocs(qLower);
        if (!querySnapshotLower.empty) {
          userId = querySnapshotLower.docs[0].id;
        }
      }
    }

    if (!userId) throw new Error("User not found.");

    await updateDoc(doc(db, 'users', userId), {
      resetOtp: null,
      resetOtpExpiry: null,
      resetOtpAttempts: 0
    });

    toast.success("Password updated successfully! Please login with your new password.");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin,
      loading, 
      signUp, 
      login, 
      loginWithGoogle,
      logout, 
      verifyOTP, 
      resendOTP,
      forgotPassword,
      verifyResetOTP,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
