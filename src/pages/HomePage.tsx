import React, { useState, useMemo } from 'react';
import {
  Search,
  Tag,
  PlusCircle,
  Sparkles,
  Star,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Crown,
  ArrowRight,
  Bell,
  Check,
} from 'lucide-react';
import { Deal, Membership } from '../types';
import { DealCard } from '../components/DealCard';
import { isDealExpired } from '../services/dealService';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  deals: Deal[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectDeal: (deal: Deal) => void;
  onNavigateAdmin?: () => void;
  onOpenMembership?: () => void;
  onOpenConcierge?: () => void;
  membership?: Membership | null;
}

export const HomePage: React.FC<HomePageProps> = ({
  deals,
  loading,
  searchQuery,
  onSearchChange,
  onSelectDeal,
  onNavigateAdmin,
  onOpenMembership,
  onOpenConcierge,
  membership,
}) => {
  const { isOwner } = useAuth();
  // Selected category/store filter ('all', 'featured', 'codes', or a specific store name)
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const isVip = Boolean(membership && membership.status === 'active');

  // Only show active deals to public visitors (published and not expired)
  const activeDeals = useMemo(() => {
    return deals.filter((d) => d.published && !isDealExpired(d));
  }, [deals]);

  // Extract top stores for quick filtering
  const topStores = useMemo(() => {
    const counts: Record<string, number> = {};
    activeDeals.forEach((d) => {
      if (d.merchantName) {
        counts[d.merchantName] = (counts[d.merchantName] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 6);
  }, [activeDeals]);

  // Filter based on search query and active tab filter
  const filteredDeals = useMemo(() => {
    return activeDeals.filter((deal) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchStore = deal.merchantName.toLowerCase().includes(q);
        const matchTitle = deal.title.toLowerCase().includes(q);
        const matchCode = (deal.couponCode || '').toLowerCase().includes(q);
        const matchDesc = (deal.description || '').toLowerCase().includes(q);
        if (!matchStore && !matchTitle && !matchCode && !matchDesc) {
          return false;
        }
      }

      // 2. Tab Filter
      if (selectedFilter === 'featured') {
        return deal.featured;
      }
      if (selectedFilter === 'vip') {
        return Boolean(deal.vipExclusive);
      }
      if (selectedFilter === 'free') {
        return !deal.vipExclusive;
      }
      if (selectedFilter === 'codes') {
        return Boolean(deal.couponCode && deal.couponCode.trim());
      }
      if (selectedFilter !== 'all') {
        return deal.merchantName.toLowerCase() === selectedFilter.toLowerCase();
      }

      return true;
    });
  }, [activeDeals, searchQuery, selectedFilter]);

  // Featured deals for the top grid
  const featuredDeals = useMemo(() => {
    return filteredDeals.filter((d) => d.featured);
  }, [filteredDeals]);

  // Other active deals
  const standardDeals = useMemo(() => {
    return filteredDeals.filter((d) => !d.featured);
  }, [filteredDeals]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedFilter !== 'all';

  const clearAllFilters = () => {
    onSearchChange('');
    setSelectedFilter('all');
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Editorial Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white pt-16 pb-14 px-4 sm:px-8 border-b border-gray-800 transition-colors">
        {/* Ambient Warm Glow */}
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-amber-500/15 blur-[120px] rounded-full pointer-events-none"
        />

        <div className="relative max-w-4xl mx-auto text-center space-y-4">
          {/* Subtle Verified Kicker */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 dark:bg-white/5 border border-white/15 text-amber-300 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hand-Tested Coupons &amp; Exclusive Discounts</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none text-balance">
            Find the Best Deals &amp; Promo Codes
          </h1>

          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed text-pretty font-normal">
            Direct affiliate savings and verified discount codes for top services, software, and stores. Updated daily.
          </p>

          {/* Search bar inside Hero */}
          <div className="max-w-xl mx-auto pt-3">
            <div className="relative flex items-center bg-white/95 dark:bg-gray-900/95 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 transition-all focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400">
              <Search className="w-4 h-4 text-gray-400 ml-3.5 shrink-0" />
              <input
                id="hero-deal-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search store, product, or promo code..."
                className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white mr-1 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Interactive Quick-Filter Strip */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-amber-400 text-gray-950 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              All Deals ({activeDeals.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('featured')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'featured'
                  ? 'bg-amber-400 text-gray-950 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span>Featured</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('vip')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'vip'
                  ? 'bg-amber-400 text-gray-950 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>VIP Drops</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('free')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'free'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              <span>🌐 Free Deals</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('codes')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'codes'
                  ? 'bg-amber-400 text-gray-950 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>With Code</span>
            </button>

            {topStores.map((store) => (
              <button
                key={store}
                type="button"
                onClick={() => setSelectedFilter(selectedFilter === store ? 'all' : store)}
                className={`hidden sm:inline-block px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedFilter.toLowerCase() === store.toLowerCase()
                    ? 'bg-amber-400 text-gray-950 shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Sleek, Compact VIP Membership Strip */}
        <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-400/5 border border-amber-300/40 dark:border-amber-500/20 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-gray-950 flex items-center justify-center shrink-0 shadow-2xs">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-bold text-gray-900 dark:text-white">
                VIP Membership
              </span>
              <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">&bull;</span>
              <span className="text-gray-600 dark:text-gray-300">
                Ask our scouts to find deals for whatever you want. Free version still remains for everyone.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isVip ? (
              <button
                type="button"
                onClick={onOpenConcierge}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Ask for Deals</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenMembership}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Join VIP</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Notification Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between p-3.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800/60 rounded-xl text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Showing <strong>{filteredDeals.length}</strong> matching deal{filteredDeals.length === 1 ? '' : 's'}
                {searchQuery && (
                  <> for &quot;<span className="font-semibold">{searchQuery}</span>&quot;</>
                )}
                {selectedFilter !== 'all' && (
                  <> in <span className="font-semibold capitalize">{selectedFilter}</span></>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton / Spinner */}
        {loading && (
          <div className="text-center py-20 space-y-3">
            <div className="w-9 h-9 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide">
              Loading verified deals...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDeals.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50">
              <Tag className="w-7 h-7 -rotate-45" />
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white">
              {deals.length === 0 ? 'No Deals Published Yet' : 'No matching deals found'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
              {searchQuery || selectedFilter !== 'all'
                ? 'Try tweaking your search keywords or reset filters to see all available promotional codes.'
                : deals.length === 0
                ? isOwner
                  ? 'Your deal catalog is set up and ready. Log into the Admin Panel to publish your first verified deal or coupon code.'
                  : 'Fresh deals and discounts are being added soon! Check back shortly or join our VIP Club to request custom deals.'
                : 'No deals available at this moment.'}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  View All Deals
                </button>
              )}
              {deals.length === 0 && isOwner && onNavigateAdmin && (
                <button
                  type="button"
                  onClick={onNavigateAdmin}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-gray-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-500 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Go to Admin Panel</span>
                </button>
              )}
              {deals.length === 0 && !isOwner && onOpenMembership && (
                <button
                  type="button"
                  onClick={onOpenMembership}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-gray-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-500 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Crown className="w-4 h-4" />
                  <span>Join VIP Club</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Featured Deals Section (Shown if featured deals exist and not specifically filtering non-featured) */}
        {!loading && featuredDeals.length > 0 && selectedFilter !== 'codes' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white leading-none">
                    Featured Exclusives
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                    Highest value &amp; viewer-verified deals
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onSelectDeal={onSelectDeal} />
              ))}
            </div>
          </section>
        )}

        {/* All Active Deals Section */}
        {!loading && (standardDeals.length > 0 || (featuredDeals.length > 0 && hasActiveFilters)) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-8 pb-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                <div>
                  <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white leading-none">
                    {featuredDeals.length > 0 && !hasActiveFilters ? 'More Verified Deals' : 'Active Deals'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                    Updated regularly with tested promo codes
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {hasActiveFilters ? filteredDeals.length : standardDeals.length} available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(hasActiveFilters ? filteredDeals : standardDeals).map((deal) => (
                <DealCard key={deal.id} deal={deal} onSelectDeal={onSelectDeal} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
