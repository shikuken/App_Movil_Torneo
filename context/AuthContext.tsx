import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PerfilUsuario {
  uid: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string | null;
}

interface AuthContextValue {
  user: User | null;
  perfil: PerfilUsuario | null;
  cargandoAuth: boolean;
  logout: () => Promise<void>;
  estaAutenticado: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    // Escucha el estado de autenticación en la nube en tiempo real
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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
        setPerfil(null);
      }
      setCargandoAuth(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        cargandoAuth,
        logout,
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
