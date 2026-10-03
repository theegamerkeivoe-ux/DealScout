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
} from 'firebase/firestore';
import { db } from '../firebase';
import { Membership, DealRequest } from '../types';

const MEMBERSHIPS_COLLECTION = 'memberships';
const DEAL_REQUESTS_COLLECTION = 'dealRequests';
const LOCAL_MEMBERSHIP_KEY = 'dealscout_vip_membership';
const LOCAL_REQUESTS_KEY = 'dealscout_vip_requests';

// Default initial VIP demo deal requests so the feature is rich and lively immediately
const INITIAL_SAMPLE_REQUESTS: DealRequest[] = [
  {
    id: 'req_sample_1',
    userId: 'user_gamer_pro',
    userEmail: 'vip.member@example.com',
    userName: 'Alex R.',
    productOrStore: 'PlayStation 5 Pro Console',
    targetBudget: 'Under $650',
    productUrl: 'https://direct.playstation.com',
    notes: 'Looking for any bundle discount or retailer cashback code.',
    status: 'deal_found',
    adminResponse: 'Great news Alex! We secured a verified 10% instant promo code + free express shipping bundle for our members at GameDepot.',
    foundCouponCode: 'VIP5PRO',
    foundDealUrl: 'https://example.com/deal/ps5-pro',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'req_sample_2',
    userId: 'user_fashion_lover',
    userEmail: 'sarah.style@example.com',
    userName: 'Sarah M.',
    productOrStore: 'Lululemon Align High-Rise Pant 25"',
    targetBudget: '$60 - $75',
    productUrl: 'https://shop.lululemon.com',
    notes: 'Any color in size 6, preferably black or dark olive.',
    status: 'researching',
    adminResponse: 'Our scout team is checking weekly markdown drops and wholesale outlets. We will ping you as soon as verified!',
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
];

// Helper: Get local sample requests
function getLocalRequests(): DealRequest[] {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_REQUESTS;
  const stored = localStorage.getItem(LOCAL_REQUESTS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(INITIAL_SAMPLE_REQUESTS));
    return INITIAL_SAMPLE_REQUESTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_SAMPLE_REQUESTS;
  }
}

function saveLocalRequests(requests: DealRequest[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
  }
}

/**
 * Fetch active membership for a user
 */
export async function getUserMembership(userEmailOrId: string): Promise<Membership | null> {
  const cleanId = (userEmailOrId || '').trim().toLowerCase();
  if (!cleanId) return null;

  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Membership;
    }

    // Check query by email
    const q = query(collection(db, MEMBERSHIPS_COLLECTION), where('email', '==', cleanId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as Membership;
    }
  } catch (err) {
    console.warn('Firestore membership lookup fallback to local session:', err);
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCAL_MEMBERSHIP_KEY);
    if (stored) {
      try {
        const mem = JSON.parse(stored) as Membership;
        if (mem.email.toLowerCase() === cleanId || mem.userId === cleanId) {
          return mem;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Subscribe / Activate DealScout VIP Membership
 * Monthly: $20 / month
 * Yearly: $216 / year (Save 10% = $24 savings)
 */
export async function activateMembership(
  user: { uid?: string; email: string; displayName?: string | null },
  plan: 'monthly' | 'yearly',
  instantAlerts: boolean = true,
  paymentDetails?: {
    method?: string;
    transactionId?: string;
    lastFour?: string;
  }
): Promise<Membership> {
  const now = new Date();
  const renews = new Date(now);
  if (plan === 'yearly') {
    renews.setFullYear(renews.getFullYear() + 1);
  } else {
    renews.setMonth(renews.getMonth() + 1);
  }

  const membership: Membership = {
    id: 'mem_' + user.email.replace(/[^a-z0-9]/gi, '_'),
    userId: user.uid || 'user_' + user.email.split('@')[0],
    email: user.email.toLowerCase().trim(),
    displayName: user.displayName || user.email.split('@')[0],
    plan,
    status: 'active',
    price: plan === 'yearly' ? 216 : 20,
    billingCycle: plan,
    startDate: now.toISOString(),
    renewsDate: renews.toISOString(),
    instantAlerts,
    paymentMethod: paymentDetails?.method || 'PayPal Checkout',
    transactionId: paymentDetails?.transactionId || 'PP-' + Date.now().toString(36).toUpperCase(),
    lastFour: paymentDetails?.lastFour || '',
    categoriesOfInterest: ['Electronics', 'Fashion', 'Gaming', 'Home & Kitchen', 'Travel'],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  try {
    await setDoc(doc(db, MEMBERSHIPS_COLLECTION, membership.id), membership);
  } catch (err) {
    console.warn('Failed saving membership to Firestore, saving locally:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_MEMBERSHIP_KEY, JSON.stringify(membership));
    try {
      const rawAll = localStorage.getItem('dealscout_all_memberships_local') || '[]';
      const all: Membership[] = JSON.parse(rawAll);
      const existingIdx = all.findIndex((m) => m.id === membership.id || m.email === membership.email);
      if (existingIdx >= 0) {
        all[existingIdx] = membership;
      } else {
        all.unshift(membership);
      }
      localStorage.setItem('dealscout_all_memberships_local', JSON.stringify(all));
    } catch {}
  }

  return membership;
}

/**
 * Cancel an active membership
 */
export async function cancelMembership(membershipId: string): Promise<boolean> {
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, membershipId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error updating membership in Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCAL_MEMBERSHIP_KEY);
    if (stored) {
      try {
        const mem = JSON.parse(stored);
        if (mem.id === membershipId) {
          mem.status = 'cancelled';
          localStorage.setItem(LOCAL_MEMBERSHIP_KEY, JSON.stringify(mem));
        }
      } catch {}
    }
  }

  return true;
}

/**
 * Update member notification / alert preferences
 */
export async function updateMemberAlerts(
  membershipId: string,
  instantAlerts: boolean,
  categories?: string[]
): Promise<boolean> {
  const updates: any = {
    instantAlerts,
    updatedAt: new Date().toISOString(),
  };
  if (categories) updates.categoriesOfInterest = categories;

  try {
    await updateDoc(doc(db, MEMBERSHIPS_COLLECTION, membershipId), updates);
  } catch (err) {
    console.warn('Could not update alerts in Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCAL_MEMBERSHIP_KEY);
    if (stored) {
      try {
        const mem = JSON.parse(stored);
        if (mem.id === membershipId) {
          mem.instantAlerts = instantAlerts;
          if (categories) mem.categoriesOfInterest = categories;
          localStorage.setItem(LOCAL_MEMBERSHIP_KEY, JSON.stringify(mem));
        }
      } catch {}
    }
  }

  return true;
}

/**
 * Fetch all memberships (for Admin view)
 */
export async function getAllMemberships(): Promise<Membership[]> {
  const mergedMap = new Map<string, Membership>();

  // Check local stored list first
  if (typeof window !== 'undefined') {
    try {
      const rawAll = localStorage.getItem('dealscout_all_memberships_local');
      if (rawAll) {
        const parsed: Membership[] = JSON.parse(rawAll);
        if (Array.isArray(parsed)) {
          parsed.forEach((m) => {
            if (m && m.email) mergedMap.set(m.email.toLowerCase().trim(), m);
          });
        }
      }
    } catch {}

    const stored = localStorage.getItem(LOCAL_MEMBERSHIP_KEY);
    if (stored) {
      try {
        const mem: Membership = JSON.parse(stored);
        if (mem && mem.email) mergedMap.set(mem.email.toLowerCase().trim(), mem);
      } catch {}
    }
  }

  // Fetch Firestore remote memberships
  try {
    const snap = await getDocs(collection(db, MEMBERSHIPS_COLLECTION));
    if (!snap.empty) {
      snap.docs.forEach((d) => {
        const data = d.data() as Membership;
        if (data && data.email) {
          mergedMap.set(data.email.toLowerCase().trim(), data);
        }
      });
    }
  } catch (err) {
    console.warn('Failed to fetch memberships from Firestore:', err);
  }

  const result = Array.from(mergedMap.values());
  result.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
  return result;
}

/**
 * Submit a Custom Deal Concierge Request: "Ask for us to find deals for them for whatever they want"
 */
export async function submitDealRequest(data: {
  userId: string;
  userEmail: string;
  userName?: string;
  productOrStore: string;
  targetBudget?: string;
  productUrl?: string;
  notes?: string;
}): Promise<DealRequest> {
  const now = new Date().toISOString();
  const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const request: DealRequest = {
    id: requestId,
    userId: data.userId,
    userEmail: data.userEmail.toLowerCase().trim(),
    userName: data.userName || data.userEmail.split('@')[0],
    productOrStore: data.productOrStore.trim(),
    targetBudget: data.targetBudget?.trim(),
    productUrl: data.productUrl?.trim(),
    notes: data.notes?.trim(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, DEAL_REQUESTS_COLLECTION, requestId), request);
  } catch (err) {
    console.warn('Failed to save deal request to Firestore, saving locally:', err);
  }

  // Also save locally
  const current = getLocalRequests();
  saveLocalRequests([request, ...current]);

  return request;
}

/**
 * Get all deal requests for a user
 */
export async function getUserDealRequests(userEmail: string): Promise<DealRequest[]> {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!cleanEmail) return [];

  try {
    const q = query(
      collection(db, DEAL_REQUESTS_COLLECTION),
      where('userEmail', '==', cleanEmail)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as DealRequest);
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items;
    }
  } catch (err) {
    console.warn('Error fetching user deal requests:', err);
  }

  // Fallback to local
  const local = getLocalRequests();
  return local.filter((r) => r.userEmail.toLowerCase() === cleanEmail);
}

/**
 * Get all deal requests (for Admin Dashboard)
 */
export async function getAllDealRequests(): Promise<DealRequest[]> {
  try {
    const snap = await getDocs(collection(db, DEAL_REQUESTS_COLLECTION));
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as DealRequest);
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items;
    }
  } catch (err) {
    console.warn('Error fetching all deal requests from Firestore:', err);
  }

  // Fallback to local
  const local = getLocalRequests();
  local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return local;
}

/**
 * Admin action: Respond & Fulfill a Deal Request
 */
export async function respondToDealRequest(
  requestId: string,
  data: {
    status: DealRequest['status'];
    adminResponse?: string;
    foundCouponCode?: string;
    foundDealUrl?: string;
  }
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const docRef = doc(db, DEAL_REQUESTS_COLLECTION, requestId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: now,
    });
  } catch (err) {
    console.warn('Failed to update deal request in Firestore:', err);
  }

  // Update in local requests
  const local = getLocalRequests();
  const updated = local.map((r) => {
    if (r.id === requestId) {
      return {
        ...r,
        ...data,
        updatedAt: now,
      };
    }
    return r;
  });
  saveLocalRequests(updated);

  return true;
}
