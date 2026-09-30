import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { createOrGetAffiliate } from '../services/affiliateService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isOwner: boolean;
  ownerEmail: string;
  isSigningIn: boolean;
  popupBlocked: boolean;
  signInWithGoogle: (forAdmin?: boolean) => Promise<User | null>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, password?: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
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
  signInWithGoogle: async () => null,
  signInWithGoogleRedirect: async () => {},
  signInWithEmail: async () => { throw new Error('Not implemented'); },
  signUpWithEmail: async () => { throw new Error('Not implemented'); },
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
          // Auto-sync affiliate profile
          if (result.user.email) {
            createOrGetAffiliate({
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName,
            }).catch(() => {});
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
        // Automatically ensure affiliate account exists
        if (user.email) {
          createOrGetAffiliate({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          }).catch(() => {});
        }
      } else {
        setIsOwner(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (forAdmin: boolean = false): Promise<User | null> => {
    if (isSigningInRef.current) {
      console.warn('Sign-in request is already in progress, skipping duplicate call.');
      return null;
    }

    isSigningInRef.current = true;
    setIsSigningIn(true);
    setAuthError(null);
    setPopupBlocked(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const verified = await checkIsOwner(result.user);
      setIsOwner(verified);

      if (forAdmin && !verified) {
        setAuthError(
          'Access denied. You are not authorized to access the Deal Scout admin dashboard.'
        );
      }

      if (result.user.email) {
        await createOrGetAffiliate({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
        });
      }

      return result.user;
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
        console.warn('Ignored previous popup cancellation.');
      } else if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/user-cancelled'
      ) {
        // User closed popup dialog manually, no error message needed
      } else {
        setAuthError(errorMsg || 'Failed to sign in with Google. Please try again.');
      }
      return null;
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

  const signInWithEmail = async (email: string, password?: string): Promise<User> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      // If password provided, use password; otherwise fallback to default or quick affiliate access
      const pwd = password || 'Affiliate2026!';
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      } catch (err: any) {
        // If user not found, auto-create to give seamless one-step email onboarding
        if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pwd);
        } else {
          throw err;
        }
      }

      const user = userCredential.user;
      setCurrentUser(user);
      const verified = await checkIsOwner(user);
      setIsOwner(verified);

      if (user.email) {
        await createOrGetAffiliate({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || email.split('@')[0],
        });
      }

      return user;
    } catch (err: any) {
      console.error('Email sign in error:', err);
      const msg = err?.code === 'auth/wrong-password'
        ? 'Incorrect password for this email account.'
        : err?.code === 'auth/invalid-email'
        ? 'Please enter a valid email address.'
        : err?.message || 'Failed to sign in with email.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<User> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      setCurrentUser(user);
      const verified = await checkIsOwner(user);
      setIsOwner(verified);

      if (user.email) {
        await createOrGetAffiliate({
          uid: user.uid,
          email: user.email,
          displayName: displayName || email.split('@')[0],
        });
      }

      return user;
    } catch (err: any) {
      console.error('Email sign up error:', err);
      const msg = err?.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please sign in instead.'
        : err?.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters.'
        : err?.message || 'Failed to create affiliate account.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
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
        signInWithEmail,
        signUpWithEmail,
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
