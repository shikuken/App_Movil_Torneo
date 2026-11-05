import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import {
  isSessionExpired,
  clearSessionTimestamps,
  updateLastActive,
  storeLoginTimestamp,
} from '../utils/session';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PerfilUsuario {
  uid: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string | null;
  fotoUrl?: string | null;
  puntosRanking?: number;
  torneosJugados?: number;
  primerosPuestos?: number;
  segundosPuestos?: number;
  tercerosPuestos?: number;
}

interface AuthContextValue {
  user: User | null;
  perfil: PerfilUsuario | null;
  cargandoAuth: boolean;
  logout: () => Promise<void>;
  actualizarPerfil: (datos: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    fotoUrl?: string | null;
  }) => Promise<void>;
  estaAutenticado: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const appState = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  useEffect(() => {
    // Escucha el estado de autenticación en la nube en tiempo real
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // ── Verificar si la sesión ha expirado ──
        const expired = await isSessionExpired();
        if (expired) {
          console.log('Sesión expirada. Cerrando sesión automáticamente...');
          await signOut(auth);
          await clearSessionTimestamps();
          setUser(null);
          setPerfil(null);
          setCargandoAuth(false);
          return;
        }

        // Sesión válida: actualizar último timestamp de actividad
        await updateLastActive();
        setUser(currentUser);

        try {
          // Carga el perfil del usuario desde Cloud Firestore si existe
          const docRef = doc(db, 'usuarios', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setPerfil({ uid: currentUser.uid, ...docSnap.data() } as PerfilUsuario);
          } else {
            setPerfil({ uid: currentUser.uid, email: currentUser.email });
          }
        } catch (e) {
          console.warn('No se pudo cargar el perfil de Firestore:', e);
          setPerfil({ uid: currentUser.uid, email: currentUser.email });
        }
      } else {
        setUser(null);
        setPerfil(null);
      }
      setCargandoAuth(false);
    });

    return unsubscribe;
  }, []);

  // ── Listener de AppState: verifica sesión cuando la app vuelve al foreground ──
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // La app pasó de background/inactive a active (foreground)
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (auth.currentUser) {
          const expired = await isSessionExpired();
          if (expired) {
            console.log('Sesión expirada al volver al foreground. Cerrando sesión...');
            await signOut(auth);
            await clearSessionTimestamps();
            // onAuthStateChanged se disparará y limpiará user/perfil
          } else {
            // Sesión aún válida: actualizar timestamp de actividad
            await updateLastActive();
          }
        }
      }

      // La app va a background: guardar timestamp de última actividad
      if (nextAppState.match(/inactive|background/) && auth.currentUser) {
        await updateLastActive();
      }

      appState.current = nextAppState;
    };

    // En web no tenemos AppState de la misma manera, pero funciona para móvil
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const logout = async () => {
    await clearSessionTimestamps();
    await signOut(auth);
  };

  const actualizarPerfil = async (datos: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    fotoUrl?: string | null;
  }) => {
    if (!user) return;
    const userDocRef = doc(db, 'usuarios', user.uid);
    await setDoc(userDocRef, datos, { merge: true });
    setPerfil((prev) => (prev ? { ...prev, ...datos } : { uid: user.uid, email: user.email, ...datos }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        cargandoAuth,
        logout,
        actualizarPerfil,
        estaAutenticado: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
