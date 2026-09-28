import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Deal } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DEALS_COLLECTION = 'deals';

export function isDealExpired(deal: Deal): boolean {
  if (!deal.expirationDate) return false;
  const expiry = new Date(deal.expirationDate);
  // Set end of expiration day
  expiry.setHours(23, 59, 59, 999);
  return expiry.getTime() < Date.now();
}

// Convert Firestore document to Deal object
function docToDeal(docSnap: any): Deal {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    merchantName: data.merchantName || '',
    merchantLogo: data.merchantLogo || '',
    title: data.title || '',
    discount: data.discount || '',
    couponCode: data.couponCode || '',
    description: data.description || '',
    terms: data.terms || '',
    category: data.category || undefined,
    affiliateUrl: data.affiliateUrl || '',
    startDate: data.startDate || '',
    expirationDate: data.expirationDate || '',
    featured: Boolean(data.featured),
    published: data.published !== false,
    clicks: Number(data.clicks || 0),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
  };
}

// Get public published deals
export async function getPublishedDeals(): Promise<Deal[]> {
  try {
    const dealsRef = collection(db, DEALS_COLLECTION);
    const q = query(dealsRef, where('published', '==', true));
    const querySnapshot = await getDocs(q);
    const deals: Deal[] = [];
    querySnapshot.forEach((docSnap) => {
      deals.push(docToDeal(docSnap));
    });
    
    // Sort client-side by featured first, then newest
    return deals.sort((a, b) => {
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    if ((error as any)?.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.LIST, DEALS_COLLECTION);
    }
    console.error('Error fetching published deals:', error);
    return [];
  }
}

// Get all deals (Admin only)
export async function getAllDeals(): Promise<Deal[]> {
  try {
    const dealsRef = collection(db, DEALS_COLLECTION);
    const querySnapshot = await getDocs(dealsRef);
    const deals: Deal[] = [];
    querySnapshot.forEach((docSnap) => {
      deals.push(docToDeal(docSnap));
    });
    return deals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if ((error as any)?.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.LIST, DEALS_COLLECTION);
    }
    console.error('Error fetching all deals for admin:', error);
    throw error;
  }
}

// Get single deal by ID or slug match
export async function getDealById(idOrSlug: string): Promise<Deal | null> {
  const cleanId = (idOrSlug || '').trim().replace(/\/+$/, '');
  if (!cleanId) return null;

  try {
    // 1. Try direct doc get by Firestore doc ID
    const docRef = doc(db, DEALS_COLLECTION, cleanId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const deal = docToDeal(docSnap);
      if (deal.published) {
        return deal;
      }
    }
  } catch (err) {
    // Direct ID might fail if cleanId is not a valid doc key or is a slug, proceed to fallback
    console.debug('Direct doc lookup skipped, trying published query:', err);
  }

  try {
    // 2. Fallback query: query published deals (compliant with Firestore security rules)
    const dealsRef = collection(db, DEALS_COLLECTION);
    const q = query(dealsRef, where('published', '==', true));
    const querySnapshot = await getDocs(q);

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchTarget = normalize(cleanId);

    let match: Deal | null = null;
    querySnapshot.forEach((d) => {
      const deal = docToDeal(d);
      const storeSlug = normalize(deal.merchantName);
      const idMatch = deal.id === cleanId || normalize(deal.id) === searchTarget;
      const slugMatch = storeSlug === searchTarget;

      if (idMatch || slugMatch) {
        match = deal;
      }
    });

    return match;
  } catch (error) {
    console.warn(`Error resolving deal for "${cleanId}":`, error);
    return null;
  }
}

// Create deal (Admin only)
export async function createDeal(
  dealData: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'clicks'>
): Promise<string> {
  try {
    const dealsRef = collection(db, DEALS_COLLECTION);
    const now = new Date().toISOString();
    const docRef = await addDoc(dealsRef, {
      ...dealData,
      clicks: 0,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, DEALS_COLLECTION);
  }
}

// Update deal (Admin only)
export async function updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
  const path = `${DEALS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, DEALS_COLLECTION, id);
    const now = new Date().toISOString();
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete deal (Admin only)
export async function deleteDeal(id: string): Promise<void> {
  const path = `${DEALS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, DEALS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Record click event for a deal
export async function recordDealClick(dealId: string): Promise<void> {
  try {
    const docRef = doc(db, DEALS_COLLECTION, dealId);
    await updateDoc(docRef, {
      clicks: increment(1),
    });

    // Also add to clicks subcollection
    const clicksRef = collection(db, `${DEALS_COLLECTION}/${dealId}/clicks`);
    await addDoc(clicksRef, {
      dealId,
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.warn('Could not record click on Firestore:', error);
  }
}

// Initial sample seed data is now empty so the owner starts completely clean
export const INITIAL_SAMPLE_DEALS: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'clicks'>[] = [];

// Delete all deals in the collection (Owner Admin action)
export async function clearAllDeals(): Promise<number> {
  try {
    const dealsRef = collection(db, DEALS_COLLECTION);
    const querySnapshot = await getDocs(dealsRef);
    let count = 0;
    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(doc(db, DEALS_COLLECTION, docSnap.id));
      count++;
    }
    return count;
  } catch (error) {
    console.error('Error clearing deals:', error);
    throw error;
  }
}

// Purge any residual demo deals (e.g. NordVPN, Nike, Hostinger, Audible, Coursera, HelloFresh)
const SAMPLE_MERCHANTS = ['NordVPN', 'Nike', 'Hostinger', 'Audible', 'Coursera', 'HelloFresh'];

export async function purgeSampleDeals(): Promise<number> {
  try {
    const dealsRef = collection(db, DEALS_COLLECTION);
    const querySnapshot = await getDocs(dealsRef);
    let count = 0;
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      if (
        SAMPLE_MERCHANTS.includes(data.merchantName) ||
        docSnap.id.startsWith('sample-') ||
        data.couponCode === 'SAVE70' ||
        data.couponCode === 'SAVE20' ||
        data.couponCode === 'HOST75' ||
        data.couponCode === 'LEARN100' ||
        data.couponCode === 'FRESH16'
      ) {
        await deleteDoc(doc(db, DEALS_COLLECTION, docSnap.id));
        count++;
      }
    }
    return count;
  } catch (error) {
    console.error('Error purging sample deals:', error);
    return 0;
  }
}

// Seed initial deals if collection is empty - No-op now that sample deals are removed
export async function seedInitialDealsIfEmpty(): Promise<boolean> {
  return false;
}

