export interface Deal {
  id: string;
  merchantName: string;
  merchantLogo?: string;
  title: string;
  discount: string;
  couponCode?: string;
  description: string;
  terms?: string;
  category?: string;
  affiliateUrl: string;
  startDate?: string;
  expirationDate?: string;
  featured: boolean;
  published: boolean;
  vipExclusive?: boolean;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export type DealCategory = string;
export const DEAL_CATEGORIES: string[] = [];

export interface Membership {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  price: number; // 20 or 216
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  renewsDate: string;
  instantAlerts: boolean;
  categoriesOfInterest?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DealRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  productOrStore: string;
  targetBudget?: string;
  productUrl?: string;
  notes?: string;
  status: 'pending' | 'researching' | 'deal_found' | 'completed' | 'closed';
  adminResponse?: string;
  foundCouponCode?: string;
  foundDealUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClickLog {
  id?: string;
  dealId: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
}

export interface AdminStats {
  totalDeals: number;
  activeDeals: number;
  expiredDeals: number;
  totalClicks: number;
  dealsAddedThisMonth: number;
}

export interface SupportComment {
  id: string;
  text: string;
  name?: string;
  dealId?: string;
  dealTitle?: string;
  merchantName?: string;
  createdAt: string;
  status?: 'active' | 'hidden';
}

export interface Affiliate {
  id: string;
  email: string;
  name: string;
  affiliateCode: string;
  commissionRateFirst: number; // 0.20 = 20%
  commissionRateRecurring: number; // 0.10 = 10%
  totalEarned: number;
  pendingBalance: number;
  paidBalance: number;
  totalClicks: number;
  totalConversions: number;
  payoutMethod?: 'paypal' | 'bank' | 'crypto';
  payoutDetails?: string;
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateConversion {
  id: string;
  affiliateId: string;
  affiliateEmail: string;
  affiliateCode: string;
  dealId: string;
  dealTitle: string;
  merchantName: string;
  couponCode?: string;
  clientIdentifier: string;
  isFirstUse: boolean;
  commissionRate: number; // 0.20 for first, 0.10 for recurring
  orderEstimatedValue: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  timestamp: string;
  confirmedAt?: string;
}

export interface AffiliateClick {
  id?: string;
  affiliateCode: string;
  dealId?: string;
  clientIdentifier?: string;
  timestamp: string;
  referrer?: string;
}

