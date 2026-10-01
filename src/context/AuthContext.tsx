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
import { createOrGetAffiliate, getAffiliateByEmail } from '../services/affiliateService';

export type AppUser = User | {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
};

const AFFILIATE_SESSION_KEY = 'dealscout_affiliate_session';
const ADMIN_VERIFIED_KEY = 'dealscout_admin_verified';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  isOwner: boolean;
  ownerEmail: string;
  isSigningIn: boolean;
  popupBlocked: boolean;
  signInWithGoogle: (forAdmin?: boolean) => Promise<User | null>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, password?: string) => Promise<AppUser>;
  signUpWithEmail: (email: string, password?: string, displayName?: string) => Promise<AppUser>;
  signInAsOwner: (passcode: string, email?: string) => Promise<boolean>;
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
  signInAsOwner: async () => false,
  logout: async () => {},
  authError: null,
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const isSigningInRef = useRef(false);

  const checkIsOwner = async (user: AppUser | null): Promise<boolean> => {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();
    if (email !== DEFAULT_OWNER_EMAIL.toLowerCase().trim()) {
      return false;
    }

    // 1. Google-authenticated account proving ownership of the email
    if ('providerData' in user && Array.isArray((user as User).providerData)) {
      const isGoogle = (user as User).providerData.some((p) => p.providerId === 'google.com');
      if (isGoogle) return true;
    }

    // 2. Verified with admin security passcode in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem(ADMIN_VERIFIED_KEY) === 'true') {
      return true;
    }

    return false;
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
      if (user) {
        setCurrentUser(user);
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
        // If not authenticated via Firebase Google, check for active direct email affiliate session
        const stored = typeof window !== 'undefined' ? localStorage.getItem(AFFILIATE_SESSION_KEY) : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AppUser;
            if (parsed && parsed.email) {
              setCurrentUser(parsed);
              const verified = await checkIsOwner(parsed);
              setIsOwner(verified);
              createOrGetAffiliate({
                uid: parsed.uid,
                email: parsed.email,
                displayName: parsed.displayName,
              }).catch(() => {});
            }
          } catch {
            setCurrentUser(null);
            setIsOwner(false);
          }
        } else {
          setCurrentUser(null);
          setIsOwner(false);
        }
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
      } else if (errorCode === 'auth/unauthorized-domain') {
        // Firebase domain whitelist error on cloud preview domains
        console.warn('Firebase auth/unauthorized-domain encountered.');
        setAuthError(
          'Google OAuth popup is restricted on this preview domain by Firebase. Please enter your Admin Passcode below to sign in.'
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

  const signInWithEmail = async (email: string, password?: string): Promise<AppUser> => {
    setIsSigningIn(true);
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setAuthError(msg);
      setIsSigningIn(false);
      throw new Error(msg);
    }

    try {
      const pwd = password || 'Affiliate2026!';
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pwd);
        const user = userCredential.user;
        setCurrentUser(user);
        const verified = await checkIsOwner(user);
        setIsOwner(verified);
        if (user.email) {
          await createOrGetAffiliate({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || cleanEmail.split('@')[0],
          });
        }
        return user;
      } catch (err: any) {
        if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pwd);
            const user = userCredential.user;
            setCurrentUser(user);
            const verified = await checkIsOwner(user);
            setIsOwner(verified);
            if (user.email) {
              await createOrGetAffiliate({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || cleanEmail.split('@')[0],
              });
            }
            return user;
          } catch (createErr: any) {
            if (createErr?.code !== 'auth/operation-not-allowed') {
              throw createErr;
            }
          }
        } else if (err?.code !== 'auth/operation-not-allowed') {
          throw err;
        }
      }

      // Seamless fallback: Direct email affiliate authentication (handles auth/operation-not-allowed)
      const existingAffiliate = await getAffiliateByEmail(cleanEmail);
      const uid = existingAffiliate ? existingAffiliate.id : 'aff_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      const fallbackUser: AppUser = {
        uid,
        email: cleanEmail,
        displayName: existingAffiliate?.name || cleanEmail.split('@')[0],
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(AFFILIATE_SESSION_KEY, JSON.stringify(fallbackUser));
      }
      setCurrentUser(fallbackUser);
      const verified = await checkIsOwner(fallbackUser);
      setIsOwner(verified);

      await createOrGetAffiliate({
        uid,
        email: cleanEmail,
        displayName: fallbackUser.displayName,
      });

      return fallbackUser;
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
    password?: string,
    displayName?: string
  ): Promise<AppUser> => {
    setIsSigningIn(true);
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setAuthError(msg);
      setIsSigningIn(false);
      throw new Error(msg);
    }

    try {
      const pwd = password || 'Affiliate2026!';
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          pwd
        );
        const user = userCredential.user;

        if (displayName) {
          await updateProfile(user, { displayName }).catch(() => {});
        }

        setCurrentUser(user);
        const verified = await checkIsOwner(user);
        setIsOwner(verified);

        await createOrGetAffiliate({
          uid: user.uid,
          email: cleanEmail,
          displayName: displayName || cleanEmail.split('@')[0],
        });

        return user;
      } catch (err: any) {
        if (err?.code !== 'auth/operation-not-allowed') {
          throw err;
        }
      }

      // Seamless fallback: Direct email affiliate registration (handles auth/operation-not-allowed)
      const existingAffiliate = await getAffiliateByEmail(cleanEmail);
      const uid = existingAffiliate ? existingAffiliate.id : 'aff_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      const fallbackUser: AppUser = {
        uid,
        email: cleanEmail,
        displayName: displayName || existingAffiliate?.name || cleanEmail.split('@')[0],
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(AFFILIATE_SESSION_KEY, JSON.stringify(fallbackUser));
      }
      setCurrentUser(fallbackUser);
      const verified = await checkIsOwner(fallbackUser);
      setIsOwner(verified);

      await createOrGetAffiliate({
        uid,
        email: cleanEmail,
        displayName: fallbackUser.displayName,
      });

      return fallbackUser;
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

  const signInAsOwner = async (passcode: string, inputEmail?: string): Promise<boolean> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const emailToVerify = (inputEmail || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
      if (emailToVerify !== DEFAULT_OWNER_EMAIL.toLowerCase()) {
        const msg = `Access denied: "${emailToVerify}" is not authorized as the store administrator.`;
        setAuthError(msg);
        return false;
      }

      if (!passcode || !passcode.trim()) {
        const msg = 'Please enter your Admin Passcode.';
        setAuthError(msg);
        return false;
      }

      const res = await fetch('/api/auth/verify-admin-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify, passcode: passcode.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.message || 'Incorrect admin security passcode. Access denied.';
        setAuthError(msg);
        return false;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ADMIN_VERIFIED_KEY, 'true');
      }

      const ownerUser: AppUser = {
        uid: 'owner_' + emailToVerify.replace(/[^a-z0-9]/g, '_'),
        email: emailToVerify,
        displayName: 'Administrator (Keivoe)',
      };

      setCurrentUser(ownerUser);
      setIsOwner(true);
      setAuthError(null);
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Verification connection failed. Please try again.';
      setAuthError(msg);
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ADMIN_VERIFIED_KEY);
        localStorage.removeItem(AFFILIATE_SESSION_KEY);
      }
      await signOut(auth).catch(() => {});
      setCurrentUser(null);
      setIsOwner(false);
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
        signInAsOwner,
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
