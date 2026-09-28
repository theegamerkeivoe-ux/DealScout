import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isOwner: boolean;
  ownerEmail: string;
  isSigningIn: boolean;
  popupBlocked: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const DEFAULT_OWNER_EMAIL = 'theegamerkeivoe@gmail.com';

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isOwner: false,
  ownerEmail: '',
  isSigningIn: false,
  popupBlocked: false,
  signInWithGoogle: async () => {},
  signInWithGoogleRedirect: async () => {},
  logout: async () => {},
  authError: null,
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const isSigningInRef = useRef(false);

  const checkIsOwner = async (user: User | null): Promise<boolean> => {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();
    if (email === DEFAULT_OWNER_EMAIL.toLowerCase().trim()) {
      return true;
    }
    try {
      const res = await fetch('/api/auth/check-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return Boolean(data?.isOwner);
    } catch {
      return false;
    }
  };

  // Check for any redirect authentication result on boot
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const verified = await checkIsOwner(result.user);
          setIsOwner(verified);
          if (!verified) {
            setAuthError(
              'Access denied. You are not authorized to access the Deal Scout admin dashboard.'
            );
          }
        }
      })
      .catch((err: any) => {
        const code = err?.code || '';
        if (
          code !== 'auth/popup-closed-by-user' &&
          code !== 'auth/cancelled-popup-request'
        ) {
          console.warn('Redirect auth handler warning:', err);
        }
      });
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const verified = await checkIsOwner(user);
        setIsOwner(verified);
        if (!verified) {
          setAuthError(
            'Access denied. You are not authorized to access the Deal Scout admin dashboard.'
          );
        } else {
          setAuthError(null);
          setPopupBlocked(false);
        }
      } else {
        setIsOwner(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    // Guard against simultaneous or overlapping sign-in calls
    if (isSigningInRef.current) {
      console.warn('Sign-in request is already in progress, skipping duplicate call.');
      return;
    }

    isSigningInRef.current = true;
    setIsSigningIn(true);
    setAuthError(null);
    setPopupBlocked(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const verified = await checkIsOwner(result.user);
      setIsOwner(verified);
      if (!verified) {
        setAuthError(
          'Access denied. You are not authorized to access the Deal Scout admin dashboard.'
        );
      }
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMsg = err?.message || '';

      console.warn('Google Sign-In caught:', errorCode, errorMsg);

      if (errorCode === 'auth/popup-blocked') {
        setPopupBlocked(true);
        setAuthError(
          'Sign-in popup was blocked by your browser. Please allow popups for this site, or open the app in a new tab.'
        );
      } else if (
        errorCode === 'auth/cancelled-popup-request' ||
        errorMsg.includes('Pending promise was never set')
      ) {
        // Harmless SDK state cancellation from previous attempt, avoid surfacing raw error
        console.warn('Ignored previous popup cancellation.');
      } else if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/user-cancelled'
      ) {
        // User closed popup dialog manually, no error message needed
      } else {
        setAuthError(errorMsg || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      isSigningInRef.current = false;
      setIsSigningIn(false);
    }
  };

  const signInWithGoogleRedirect = async () => {
    if (isSigningInRef.current) return;
    isSigningInRef.current = true;
    setIsSigningIn(true);
    setAuthError(null);
    setPopupBlocked(false);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google Redirect Sign-In error:', err);
      setAuthError(err?.message || 'Failed to initiate redirect sign in.');
    } finally {
      isSigningInRef.current = false;
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAuthError(null);
      setPopupBlocked(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
    setPopupBlocked(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isOwner,
        ownerEmail: isOwner && currentUser?.email ? currentUser.email : '',
        isSigningIn,
        popupBlocked,
        signInWithGoogle,
        signInWithGoogleRedirect,
        logout,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

