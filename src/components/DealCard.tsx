import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Tag, ShieldCheck, Clock } from 'lucide-react';
import { Deal } from '../types';
import { recordDealClick, isDealExpired } from '../services/dealService';
import { ShareButton } from './ShareButton';

interface DealCardProps {
  deal: Deal;
  onSelectDeal: (deal: Deal) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onSelectDeal }) => {
  const [copied, setCopied] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const expired = isDealExpired(deal);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deal.couponCode) return;
    navigator.clipboard.writeText(deal.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGetDeal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRedirecting) return;
    setIsRedirecting(true);

    // If there's a coupon code, copy it automatically for a smooth experience
    if (deal.couponCode) {
      try {
        await navigator.clipboard.writeText(deal.couponCode);
        setCopied(true);
      } catch (err) {
        // clipboard might be blocked in some contexts
      }
    }

    // Record click analytics in background
    recordDealClick(deal.id);

    // Open affiliate URL in new tab
    if (deal.affiliateUrl) {
      window.open(deal.affiliateUrl, '_blank', 'noopener,noreferrer');
    }

    setTimeout(() => {
      setIsRedirecting(false);
    }, 1200);
  };

  // Fallback initial badge for logo
  const merchantInitial = deal.merchantName ? deal.merchantName.charAt(0).toUpperCase() : 'D';

  return (
    <div
      id={`deal-card-${deal.id}`}
      onClick={() => onSelectDeal(deal)}
      className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 p-5 flex flex-col transition-all duration-200 hover:shadow-lg hover:border-amber-400/50 dark:hover:border-amber-500/30 hover:-translate-y-0.5 cursor-pointer"
    >
      {/* Top Row: Store Avatar, Name & Discount Badge */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        {/* Left: Store Logo & Verified Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            {deal.merchantLogo && !imgError ? (
              <img
                src={deal.merchantLogo}
                alt={`${deal.merchantName} logo`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-amber-400 text-gray-950 flex items-center justify-center font-display font-black text-lg">
                {merchantInitial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 block truncate"
              title={deal.merchantName}
            >
              {deal.merchantName}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Verified Store</span>
            </div>
          </div>
        </div>

        {/* Right: Discount Callout */}
        {deal.discount && (
          <span
            className="shrink-0 max-w-[50%] truncate font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 tracking-wide text-right"
            title={deal.discount}
          >
            {deal.discount}
          </span>
        )}
      </div>

      {/* Deal Title */}
      <h3 className="font-display font-bold text-base sm:text-lg leading-snug mb-1.5 text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
        {deal.title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 flex-1 line-clamp-2 leading-relaxed">
        {deal.description || `Get ${deal.discount} at ${deal.merchantName} with this verified promo offer.`}
      </p>

      {/* Coupon Code Block */}
      {deal.couponCode ? (
        <div className="bg-amber-500/5 dark:bg-gray-950/80 border border-dashed border-amber-400/50 dark:border-amber-500/30 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <span className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
              Coupon Code
            </span>
            <span className="font-mono font-bold text-gray-900 dark:text-amber-300 tracking-wider text-sm select-all truncate block">
              {deal.couponCode}
            </span>
          </div>
          <button
            type="button"
            id={`copy-btn-${deal.id}`}
            onClick={handleCopyCode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              copied
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl p-3 mb-4 flex items-center justify-center text-center">
          <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
            Direct Activation &bull; No code required at checkout
          </span>
        </div>
      )}

      {/* Primary Action Button Row with Share */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id={`get-deal-btn-${deal.id}`}
          onClick={handleGetDeal}
          disabled={isRedirecting}
          className="flex-1 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-75"
        >
          <Tag className="w-3.5 h-3.5 -rotate-45" />
          <span>{isRedirecting ? 'Opening Offer...' : 'GET DEAL'}</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
        </button>

        <ShareButton deal={deal} variant="card" />
      </div>

      {/* Quiet Unboxed Metadata Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>DealScout Verified</span>
        </span>
        <span>
          {expired ? (
            <span className="text-red-500 font-semibold">Expired</span>
          ) : deal.expirationDate ? (
            `Exp: ${deal.expirationDate}`
          ) : (
            'Active offer'
          )}
        </span>
      </div>
    </div>
  );
};
