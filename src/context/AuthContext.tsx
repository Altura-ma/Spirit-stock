import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, restaurantName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_SUPPLIER = {
  name: 'Louis Mathieu',
  phone: '0782407933',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            restaurantId: data.restaurantId,
            restaurantName: data.restaurantName,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUser({
        uid: credential.user.uid,
        email: credential.user.email!,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
      });
    }
  };

  const signUp = async (email: string, password: string, restaurantName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    const restaurantRef = await addDoc(collection(db, 'restaurants'), {
      name: restaurantName,
      ownerId: credential.user.uid,
      createdAt: serverTimestamp(),
    });

    // Create default supplier
    await addDoc(collection(db, 'suppliers'), {
      name: DEFAULT_SUPPLIER.name,
      phone: DEFAULT_SUPPLIER.phone,
      restaurantId: restaurantRef.id,
    });

    await setDoc(doc(db, 'users', credential.user.uid), {
      email,
      restaurantId: restaurantRef.id,
      restaurantName,
      createdAt: serverTimestamp(),
    });

    setUser({
      uid: credential.user.uid,
      email,
      restaurantId: restaurantRef.id,
      restaurantName,
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
