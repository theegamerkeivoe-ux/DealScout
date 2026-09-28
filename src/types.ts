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

