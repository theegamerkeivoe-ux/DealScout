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
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export type DealCategory = string;
export const DEAL_CATEGORIES: string[] = [];

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
  clientIdentifier: string;
  isFirstUse: boolean;
  commissionRate: number; // 0.20 for first, 0.10 for recurring
  orderEstimatedValue: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid';
  timestamp: string;
}

export interface AffiliateClick {
  id?: string;
  affiliateCode: string;
  dealId?: string;
  clientIdentifier?: string;
  timestamp: string;
  referrer?: string;
}

