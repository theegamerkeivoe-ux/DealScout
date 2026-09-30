import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Affiliate, AffiliateConversion, AffiliateClick } from '../types';

const AFFILIATES_COLLECTION = 'affiliates';
const CONVERSIONS_COLLECTION = 'affiliate_conversions';
const CLICKS_COLLECTION = 'affiliate_clicks';

const CLIENT_ID_KEY = 'dealscout_client_id';
const ACTIVE_AFFILIATE_KEY = 'dealscout_active_affiliate';
const CLIENT_CONVERSION_HISTORY_KEY = 'dealscout_conversion_history';

/**
 * Get or initialize persistent client identifier for tracking first-time vs recurring usage
 */
export function getClientIdentifier(): string {
  if (typeof window === 'undefined') return 'anon';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = 'client_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

/**
 * Get currently stored affiliate referral code from URL or cookie/storage
 */
export function getStoredAffiliateCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_AFFILIATE_KEY);
}

/**
 * Save active affiliate code (with 30-day attribution)
 */
export function setStoredAffiliateCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  const clean = code.trim().toUpperCase();
  localStorage.setItem(ACTIVE_AFFILIATE_KEY, clean);
}

/**
 * Clear stored affiliate code
 */
export function clearStoredAffiliateCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_AFFILIATE_KEY);
}

/**
 * Generate a clean, unique affiliate promo code (e.g. SCOUT-ALEX20)
 */
export function generateAffiliateCode(nameOrEmail: string): string {
  const clean = nameOrEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = clean.slice(0, 5) || 'DEAL';
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

/**
 * Retrieve affiliate profile by user UID
 */
export async function getAffiliateByUserId(uid: string): Promise<Affiliate | null> {
  try {
    const docRef = doc(db, AFFILIATES_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Affiliate;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching affiliate by UID:', err);
    return null;
  }
}

/**
 * Retrieve affiliate by unique code
 */
export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  try {
    const cleanCode = code.trim().toUpperCase();
    const q = query(
      collection(db, AFFILIATES_COLLECTION),
      where('affiliateCode', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Affiliate;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching affiliate by code:', err);
    return null;
  }
}

/**
 * Retrieve affiliate by email
 */
export async function getAffiliateByEmail(email: string): Promise<Affiliate | null> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(
      collection(db, AFFILIATES_COLLECTION),
      where('email', '==', cleanEmail),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Affiliate;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching affiliate by email:', err);
    return null;
  }
}

/**
 * Create or get affiliate record on login
 */
export async function createOrGetAffiliate(user: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<Affiliate> {
  // First check if already exists by UID
  const existingByUid = await getAffiliateByUserId(user.uid);
  if (existingByUid) return existingByUid;

  // Check by email
  const existingByEmail = await getAffiliateByEmail(user.email);
  if (existingByEmail) return existingByEmail;

  // Create new affiliate record
  const code = generateAffiliateCode(user.displayName || user.email);
  const now = new Date().toISOString();

  const newAffiliate: Affiliate = {
    id: user.uid,
    email: user.email.toLowerCase().trim(),
    name: user.displayName || user.email.split('@')[0],
    affiliateCode: code,
    commissionRateFirst: 0.20, // 20% on first customer order
    commissionRateRecurring: 0.10, // 10% recurring on repeat orders
    totalEarned: 0,
    pendingBalance: 0,
    paidBalance: 0,
    totalClicks: 0,
    totalConversions: 0,
    payoutMethod: 'paypal',
    payoutDetails: user.email,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, AFFILIATES_COLLECTION, user.uid), newAffiliate);
    return newAffiliate;
  } catch (err) {
    console.error('Failed to create affiliate profile in Firestore:', err);
    return newAffiliate;
  }
}

/**
 * Update affiliate profile settings (payout method, details, custom code)
 */
export async function updateAffiliateProfile(
  affiliateId: string,
  updates: Partial<Affiliate>
): Promise<void> {
  const docRef = doc(db, AFFILIATES_COLLECTION, affiliateId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Record an affiliate referral link click
 */
export async function recordAffiliateClick(
  affiliateCode: string,
  dealId?: string
): Promise<void> {
  try {
    const cleanCode = affiliateCode.trim().toUpperCase();
    const clientId = getClientIdentifier();
    const clickData: AffiliateClick = {
      affiliateCode: cleanCode,
      dealId: dealId || '',
      clientIdentifier: clientId,
      timestamp: new Date().toISOString(),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    };

    const clicksRef = collection(db, CLICKS_COLLECTION);
    await setDoc(doc(clicksRef), clickData);

    // Also increment affiliate's totalClicks
    const affiliate = await getAffiliateByCode(cleanCode);
    if (affiliate) {
      const affRef = doc(db, AFFILIATES_COLLECTION, affiliate.id);
      await updateDoc(affRef, {
        totalClicks: increment(1),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Failed to record affiliate click:', err);
  }
}

/**
 * Record a promo code usage conversion and calculate 20% first / 10% recurring commission
 */
export async function recordAffiliateConversion(params: {
  affiliateCode: string;
  dealId: string;
  dealTitle: string;
  merchantName: string;
  discount?: string;
  customOrderValue?: number;
}): Promise<{
  success: boolean;
  conversion?: AffiliateConversion;
  isFirstUse: boolean;
  commissionRate: number;
  commissionAmount: number;
  message: string;
}> {
  const cleanCode = params.affiliateCode.trim().toUpperCase();
  const affiliate = await getAffiliateByCode(cleanCode);

  if (!affiliate) {
    return {
      success: false,
      isFirstUse: false,
      commissionRate: 0,
      commissionAmount: 0,
      message: `Affiliate referral code "${cleanCode}" not found.`,
    };
  }

  const clientId = getClientIdentifier();

  // Check if client has used this affiliate before to determine First (20%) vs Recurring (10%)
  let isFirstUse = true;

  // Check local history cache first
  const localHistoryStr = localStorage.getItem(CLIENT_CONVERSION_HISTORY_KEY);
  let localHistory: string[] = [];
  try {
    if (localHistoryStr) {
      localHistory = JSON.parse(localHistoryStr);
    }
  } catch {}

  const historyKey = `${clientId}_${cleanCode}`;
  if (localHistory.includes(historyKey)) {
    isFirstUse = false;
  } else {
    // Check Firestore for previous conversion from this client
    try {
      const q = query(
        collection(db, CONVERSIONS_COLLECTION),
        where('clientIdentifier', '==', clientId),
        where('affiliateCode', '==', cleanCode),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        isFirstUse = false;
      }
    } catch {
      // Default to isFirstUse = true if query fails
    }
  }

  // Update local history
  if (!localHistory.includes(historyKey)) {
    localHistory.push(historyKey);
    localStorage.setItem(CLIENT_CONVERSION_HISTORY_KEY, JSON.stringify(localHistory));
  }

  // Rate: 20% on first purchase, 10% recurring on subsequent
  const commissionRate = isFirstUse ? 0.20 : 0.10;

  // Base order value estimation: $50 standard basket or provided value
  const orderEstimatedValue = params.customOrderValue && params.customOrderValue > 0
    ? params.customOrderValue
    : 50.00;

  const commissionAmount = Number((orderEstimatedValue * commissionRate).toFixed(2));
  const conversionId = 'conv_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const now = new Date().toISOString();

  const conversion: AffiliateConversion = {
    id: conversionId,
    affiliateId: affiliate.id,
    affiliateEmail: affiliate.email,
    affiliateCode: cleanCode,
    dealId: params.dealId,
    dealTitle: params.dealTitle,
    merchantName: params.merchantName,
    clientIdentifier: clientId,
    isFirstUse,
    commissionRate,
    orderEstimatedValue,
    commissionAmount,
    status: 'approved',
    timestamp: now,
  };

  try {
    // 1. Save conversion
    await setDoc(doc(db, CONVERSIONS_COLLECTION, conversionId), conversion);

    // 2. Increment affiliate totals
    const affRef = doc(db, AFFILIATES_COLLECTION, affiliate.id);
    await updateDoc(affRef, {
      totalEarned: increment(commissionAmount),
      pendingBalance: increment(commissionAmount),
      totalConversions: increment(1),
      updatedAt: now,
    });

    return {
      success: true,
      conversion,
      isFirstUse,
      commissionRate,
      commissionAmount,
      message: isFirstUse
        ? `Success! 20% first-time commission ($${commissionAmount.toFixed(2)}) earned for affiliate ${cleanCode}.`
        : `Success! 10% recurring commission ($${commissionAmount.toFixed(2)}) earned for affiliate ${cleanCode}.`,
    };
  } catch (err: any) {
    console.error('Error saving affiliate conversion:', err);
    return {
      success: false,
      conversion,
      isFirstUse,
      commissionRate,
      commissionAmount,
      message: err?.message || 'Failed to save conversion.',
    };
  }
}

/**
 * Fetch conversions for an affiliate
 */
export async function getAffiliateConversions(
  affiliateId: string,
  affiliateCode?: string
): Promise<AffiliateConversion[]> {
  try {
    const conversions: AffiliateConversion[] = [];

    // Query by affiliateId
    const q = query(
      collection(db, CONVERSIONS_COLLECTION),
      where('affiliateId', '==', affiliateId),
      limit(50)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      conversions.push({ id: d.id, ...d.data() } as AffiliateConversion);
    });

    // If empty and code provided, query by code
    if (conversions.length === 0 && affiliateCode) {
      const qCode = query(
        collection(db, CONVERSIONS_COLLECTION),
        where('affiliateCode', '==', affiliateCode.toUpperCase()),
        limit(50)
      );
      const snapCode = await getDocs(qCode);
      snapCode.forEach((d) => {
        conversions.push({ id: d.id, ...d.data() } as AffiliateConversion);
      });
    }

    // Sort descending by timestamp
    conversions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return conversions;
  } catch (err) {
    console.warn('Error fetching affiliate conversions:', err);
    return [];
  }
}

/**
 * Fetch all affiliates (for Admin dashboard)
 */
export async function getAllAffiliates(): Promise<Affiliate[]> {
  try {
    const snap = await getDocs(collection(db, AFFILIATES_COLLECTION));
    const list: Affiliate[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Affiliate);
    });
    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  } catch (err) {
    console.error('Error fetching all affiliates:', err);
    return [];
  }
}

/**
 * Fetch all conversions (for Admin dashboard)
 */
export async function getAllConversions(): Promise<AffiliateConversion[]> {
  try {
    const snap = await getDocs(collection(db, CONVERSIONS_COLLECTION));
    const list: AffiliateConversion[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AffiliateConversion);
    });
    list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return list;
  } catch (err) {
    console.error('Error fetching all conversions:', err);
    return [];
  }
}

/**
 * Mark a conversion or payout status (Admin action)
 */
export async function updateConversionStatus(
  conversionId: string,
  status: 'pending' | 'approved' | 'paid'
): Promise<void> {
  const docRef = doc(db, CONVERSIONS_COLLECTION, conversionId);
  await updateDoc(docRef, { status });
}
