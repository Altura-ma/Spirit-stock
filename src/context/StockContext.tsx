import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Bottle, Supplier } from '../types';
import { useAuth } from './AuthContext';
import {
  requestNotificationPermissions,
  notifyLowStock,
  notifyOutOfStock,
} from '../services/notifications';

interface StockContextType {
  bottles: Bottle[];
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  addBottle: (data: Omit<Bottle, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBottle: (id: string, data: Partial<Bottle>) => Promise<void>;
  deleteBottle: (id: string) => Promise<void>;
  sellBottle: (id: string, qty: number) => Promise<void>;
  addSupplier: (data: Omit<Supplier, 'id' | 'restaurantId'>) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  getLowStockBottles: () => Bottle[];
  getTotalStockValue: () => number;
}

const StockContext = createContext<StockContextType | null>(null);

export function StockProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    if (!user) {
      setBottles([]);
      setSuppliers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const bottlesQ = query(
      collection(db, 'bottles'),
      where('restaurantId', '==', user.restaurantId)
    );
    const suppliersQ = query(
      collection(db, 'suppliers'),
      where('restaurantId', '==', user.restaurantId)
    );

    let bottlesLoaded = false;
    let suppliersLoaded = false;
    const checkLoaded = () => {
      if (bottlesLoaded && suppliersLoaded) setLoading(false);
    };

    const unsubBottles = onSnapshot(
      bottlesQ,
      (snap) => {
        setBottles(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate() ?? new Date(),
            updatedAt: d.data().updatedAt?.toDate() ?? new Date(),
          })) as Bottle[]
        );
        bottlesLoaded = true;
        checkLoaded();
      },
      () => {
        setError('Impossible de charger le stock. Vérifiez votre connexion.');
        bottlesLoaded = true;
        checkLoaded();
      }
    );

    const unsubSuppliers = onSnapshot(
      suppliersQ,
      (snap) => {
        setSuppliers(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Supplier[]
        );
        suppliersLoaded = true;
        checkLoaded();
      },
      () => {
        suppliersLoaded = true;
        checkLoaded();
      }
    );

    return () => {
      unsubBottles();
      unsubSuppliers();
    };
  }, [user]);

  const addBottle = async (data: Omit<Bottle, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Non connecté');
    await addDoc(collection(db, 'bottles'), {
      ...data,
      restaurantId: user.restaurantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateBottle = async (id: string, data: Partial<Bottle>) => {
    await updateDoc(doc(db, 'bottles', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteBottle = async (id: string) => {
    await deleteDoc(doc(db, 'bottles', id));
  };

  const sellBottle = async (id: string, qty: number) => {
    const bottle = bottles.find((b) => b.id === id);
    if (!bottle) return;
    const safeQty = Math.min(qty, bottle.quantity);
    const newQty = bottle.quantity - safeQty;
    await updateDoc(doc(db, 'bottles', id), {
      quantity: newQty,
      updatedAt: serverTimestamp(),
    });
    if (newQty === 0) {
      await notifyOutOfStock(bottle.name);
    } else if (newQty <= bottle.minThreshold && bottle.quantity > bottle.minThreshold) {
      await notifyLowStock(bottle.name, newQty, bottle.minThreshold);
    }
  };

  const addSupplier = async (data: Omit<Supplier, 'id' | 'restaurantId'>) => {
    if (!user) throw new Error('Non connecté');
    await addDoc(collection(db, 'suppliers'), {
      ...data,
      restaurantId: user.restaurantId,
    });
  };

  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    await updateDoc(doc(db, 'suppliers', id), data);
  };

  const deleteSupplier = async (id: string) => {
    await deleteDoc(doc(db, 'suppliers', id));
  };

  const getLowStockBottles = () =>
    bottles.filter((b) => b.quantity <= b.minThreshold);

  const getTotalStockValue = () =>
    bottles.reduce((sum, b) => sum + b.quantity * b.price, 0);

  return (
    <StockContext.Provider
      value={{
        bottles,
        suppliers,
        loading,
        error,
        addBottle,
        updateBottle,
        deleteBottle,
        sellBottle,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        getLowStockBottles,
        getTotalStockValue,
      }}
    >
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be used within StockProvider');
  return ctx;
}
