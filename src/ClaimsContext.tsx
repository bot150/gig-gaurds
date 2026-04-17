import React, { createContext, useContext, useState, useEffect } from 'react';
import { Claim, UserProfile } from './types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, query, onSnapshot, orderBy, addDoc, where, getDocs, limit } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { MockEvent } from './types';
import { getFraudScore } from './services/riskService';

interface ClaimsContextType {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  triggerDisruption: () => void;
  triggerMockEvent: (type: 'rain' | 'flood') => Promise<void>;
  resetMockEvent: () => void;
  mockEvent: MockEvent;
  submitAppeal: (claimId: string, reason: string) => Promise<void>;
}

const ClaimsContext = createContext<ClaimsContextType | undefined>(undefined);

export const ClaimsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [mockEvent, setMockEvent] = useState<MockEvent>({ type: null, location: '', timestamp: '' });
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || (!profile?.emailVerified && profile?.role !== 'admin')) {
      setClaims([]);
      return;
    }

    let q;
    if (profile?.role === 'admin') {
      q = query(collection(db, 'claims'), orderBy('timestamp', 'desc'));
    } else {
      q = query(
        collection(db, 'claims'), 
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setClaims(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim)));
    }, (error) => {
      if (user) {
        handleFirestoreError(error, OperationType.GET, 'claims');
      }
    });
    return () => unsub();
  }, [user, profile]);

  const triggerDisruption = async () => {
    const zones = ['Vijayawada', 'Guntur', 'Amaravati', 'Krishna dist'];
    const calamities: ('flood' | 'cyclone' | 'earthquake' | 'heatwave' | 'landslide')[] = ['flood', 'cyclone', 'earthquake', 'heatwave', 'landslide'];
    
    // Fetch some real worker IDs to make it more realistic
    const workersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'worker'), limit(10)));
    const workerProfiles = workersSnap.docs.map(d => d.data() as UserProfile);
    const workerIds = workerProfiles.length > 0 ? workerProfiles.map(p => p.uid) : [user?.uid || 'WRK-001'];

    toast.info('Simulating calamity event with fraud detection...');

    for (let i = 0; i < 5; i++) {
      const daysLost = Math.floor(Math.random() * 4) + 1;
      const dailyWage = Math.floor(Math.random() * 501) + 400;
      
      const targetWorkerId = workerIds[Math.floor(Math.random() * workerIds.length)];
      const targetWorker = workerProfiles.find(p => p.uid === targetWorkerId);
      
      // Simulate GPS locations
      const eventLocation = { lat: 16.5062, lng: 80.6480, name: 'Vijayawada Central' }; // Example: Vijayawada
      const workerLocation = Math.random() > 0.2 
        ? { lat: 16.5062 + (Math.random() - 0.5) * 0.01, lng: 80.6480 + (Math.random() - 0.5) * 0.01 } // Close
        : { lat: 17.3850, lng: 78.4867 }; // Far (Hyderabad)

      // Calculate Fraud Score with simulated integrity signals
      const { score, flags } = getFraudScore(
        workerLocation,
        eventLocation,
        Math.random() > 0.1, // weatherConfirmed
        Math.random() > 0.2 ? 8 : 0, // workerActivityHistory
        Math.floor(Math.random() * 5), // claimFrequency
        {
          mockLocation: Math.random() > 0.95, // 5% chance of mock location detected
          rootDetected: Math.random() > 0.98, // 2% chance of root detected
          vpnActive: Math.random() > 0.90,    // 10% chance of VPN
        }
      );

      const claim: Omit<Claim, 'id'> = {
        userId: targetWorkerId,
        policyId: 'POL-' + Math.floor(Math.random() * 9000 + 1000),
        triggerEvent: 'Calamity Alert',
        amount: daysLost * dailyWage,
        status: 'pending_auto',
        timestamp: new Date().toISOString(),
        zone: targetWorker?.location || zones[Math.floor(Math.random() * zones.length)],
        calamityType: calamities[Math.floor(Math.random() * calamities.length)],
        daysLost,
        dailyWage,
        fraudScore: score,
        suspiciousFlags: flags,
        location: workerLocation,
        eventLocation: eventLocation,
        eligibilityStatus: score < 0.5 ? 'pass' : 'fail',
        fraudCheckStatus: score < 0.3 ? 'pass' : 'flag',
        incomeLossVerified: Math.random() > 0.2,
      };

      try {
        const docRef = await addDoc(collection(db, 'claims'), claim);
        const claimId = docRef.id;

        setTimeout(async () => {
          const isSTP = score < 0.3 && claim.incomeLossVerified === true;
          const finalStatus = isSTP ? 'approved' : 'needs_manual_review';
          
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'claims', claimId), { 
            status: finalStatus,
            reviewedBy: isSTP ? 'system_stp' : undefined,
            reviewedAt: isSTP ? new Date().toISOString() : undefined
          });

          if (isSTP) {
            toast.success(`CLM-${claimId.slice(-4).toUpperCase()} auto-approved via STP`, { duration: 3000 });
          } else {
            toast.warning(`CLM-${claimId.slice(-4).toUpperCase()} flagged for manual review (Fraud Score: ${score.toFixed(2)})`, { duration: 4000 });
          }
        }, 2000 + (i * 500));

      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'claims');
      }
    }
  };
  
  const triggerMockEvent = async (type: 'rain' | 'flood') => {
    const location = profile?.location || 'Vijayawada';
    setMockEvent({ type, location, timestamp: new Date().toISOString() });
    
    const eventName = type === 'rain' ? 'Heavy Rain' : 'Flood Event';
    toast.info(`${eventName} triggered - Generating claims...`);

    if (user && profile) {
      const lostHours = type === 'rain' ? 3 : 8;
      const compensation = lostHours * 70;
      
      const eventLocation = { lat: 16.5062, lng: 80.6480, name: location };
      const workerLocation = { lat: 16.5062, lng: 80.6480 }; // Perfect match for mock

      const { score, flags } = getFraudScore(
        workerLocation, 
        eventLocation, 
        true, 
        lostHours, 
        0,
        {
          mockLocation: false, // User triggered mock events are usually local
          rootDetected: false,
          vpnActive: false
        }
      );

      const claim: Omit<Claim, 'id'> = {
        userId: user.uid,
        policyId: 'MOCK-POL-' + Math.floor(Math.random() * 9000 + 1000),
        triggerEvent: `Mock ${type === 'rain' ? 'Heavy Rain' : 'Flood'}`,
        amount: compensation,
        status: 'pending_auto',
        timestamp: new Date().toISOString(),
        zone: location,
        calamityType: type === 'rain' ? 'cyclone' : 'flood',
        daysLost: Math.ceil(lostHours / 8),
        dailyWage: 560,
        fraudScore: score,
        suspiciousFlags: flags,
        location: workerLocation,
        eventLocation: eventLocation,
        eligibilityStatus: 'pass',
        fraudCheckStatus: 'pass',
        incomeLossVerified: true,
      };

      try {
        await addDoc(collection(db, 'claims'), claim);
        toast.success(`${eventName} detected – Insurance claim generated.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'claims');
      }
    }
  };

  const resetMockEvent = () => {
    setMockEvent({ type: null, location: '', timestamp: '' });
    toast.success('Mock event reset - Returning to real-time data.');
  };

  const submitAppeal = async (claimId: string, reason: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'claims', claimId), {
        status: 'appealed',
        appealReason: reason
      });
      toast.success('Appeal submitted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
    }
  };

  return (
    <ClaimsContext.Provider value={{ claims, setClaims, triggerDisruption, triggerMockEvent, resetMockEvent, mockEvent, submitAppeal }}>
      {children}
    </ClaimsContext.Provider>
  );
};

export const useClaims = () => {
  const context = useContext(ClaimsContext);
  if (context === undefined) {
    throw new Error('useClaims must be used within a ClaimsProvider');
  }
  return context;
};
