import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  ShieldCheck,
  Tag,
  ArrowLeft,
  Share2,
  Info,
  MessageSquare,
  Sparkles,
  Gift,
  Award,
  Repeat,
  CheckCircle2,
  Crown,
  Lock,
  Store,
  BadgeCheck,
} from 'lucide-react';
import { Deal } from '../types';
import { recordDealClick, isDealExpired } from '../services/dealService';
import { ShareButton } from './ShareButton';
import { getDealShareUrl } from '../utils/shareUtils';
import {
  getStoredAffiliateCode,
  setStoredAffiliateCode,
  recordAffiliateConversion,
} from '../services/affiliateService';

interface DealDetailModalProps {
  deal: Deal;
  onClose: () => void;
  onOpenSupport?: (deal?: Deal) => void;
  isStandalonePage?: boolean;
  isVip?: boolean;
  onOpenMembership?: () => void;
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  deal,
  onClose,
  onOpenSupport,
  isStandalonePage = false,
  isVip = false,
  onOpenMembership,
}) => {
  const [copied, setCopied] = useState(false);
  const [hasClickedDeal, setHasClickedDeal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const expired = isDealExpired(deal);

  // Active Affiliate Referral Code
  const [activeAffiliateCode, setActiveAffiliateCode] = useState<string | null>(() => getStoredAffiliateCode());
  const [affiliateInput, setAffiliateInput] = useState('');
  const [affiliateNotice, setAffiliateNotice] = useState<{ isFirst: boolean; amount: number; message: string } | null>(null);

  // Check URL on open for ?ref= or ?aff=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('aff');
      if (refCode) {
        setStoredAffiliateCode(refCode);
        setActiveAffiliateCode(refCode.toUpperCase());
      }
    }
  }, []);

  // Prevent background scrolling while modal is open on mobile
  useEffect(() => {
    if (isStandalonePage) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isStandalonePage]);

  // SEO Title & Meta update when viewing deal
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${deal.merchantName} Promo Code & Discount: ${deal.title} — Deal Scout`;

    return () => {
      document.title = originalTitle;
    };
  }, [deal]);

  // Record affiliate conversion helper
  const triggerAffiliateConversion = async () => {
    // STRICT: Only activate when:
    // 1. A valid promo code is available on this deal on the site
    // 2. The deal is active (not expired)
    // 3. The visitor clicked to the site with an affiliate referral
    if (!deal.couponCode || !deal.couponCode.trim() || isDealExpired(deal)) {
      return;
    }

    const code = (activeAffiliateCode || getStoredAffiliateCode() || '').trim().toUpperCase();
    if (!code) return;

    try {
      const res = await recordAffiliateConversion({
        affiliateCode: code,
        dealId: deal.id,
        dealTitle: deal.title,
        merchantName: deal.merchantName,
        couponCode: deal.couponCode.trim(),
        discount: deal.discount,
      });

      if (res.success && res.commissionAmount > 0) {
        setAffiliateNotice({
          isFirst: res.isFirstUse,
          amount: res.commissionAmount,
          message: res.message,
        });
      }
    } catch (err) {
      console.warn('Affiliate conversion tracking non-blocking warning:', err);
    }
  };

  const handleApplyAffiliateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliateInput.trim()) return;
    const clean = affiliateInput.trim().toUpperCase();
    setStoredAffiliateCode(clean);
    setActiveAffiliateCode(clean);
    setAffiliateInput('');
  };

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deal.couponCode || isDealExpired(deal)) return;

    // Trigger affiliate conversion tracking ONLY when successfully using an available code
    triggerAffiliateConversion();

    try {
      await navigator.clipboard.writeText(deal.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = deal.couponCode;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGetDeal = async () => {
    setHasClickedDeal(true);

    // If there's an active promo code on the site, auto-copy it and activate the affiliate
    if (deal.couponCode && !isDealExpired(deal)) {
      triggerAffiliateConversion();
      try {
        await navigator.clipboard.writeText(deal.couponCode);
        setCopied(true);
      } catch (err) {
        // clipboard might be blocked
      }
    }

    // Record click count in Firestore
    recordDealClick(deal.id);

    // Redirect to affiliate URL in new tab
    if (deal.affiliateUrl) {
      window.open(deal.affiliateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const shareUrl = getDealShareUrl(deal);

  const handleShareDeal = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${deal.merchantName} - ${deal.discount || deal.title} | Deal Scout`,
          text: `Check out this discount for ${deal.merchantName}: ${deal.title}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard unavailable');
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const merchantInitial = deal.merchantName ? deal.merchantName.charAt(0).toUpperCase() : 'D';

  return (
    <div
      id="deal-detail-overlay"
      className={`${
        isStandalonePage
          ? 'min-h-screen py-6 px-3 sm:px-4 bg-gray-50 dark:bg-gray-950 flex items-center justify-center'
          : 'fixed inset-0 z-50 bg-gray-950/80 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStandalonePage) {
          onClose();
        }
      }}
    >
      <div
        id="deal-detail-card"
        className="relative bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header / Breadcrumb / Actions - Pinned */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              All Deals
            </button>
            <span className="text-gray-300 dark:text-gray-700">&bull;</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 dark:bg-amber-400/15 border border-amber-400/30 text-amber-900 dark:text-yellow-400 font-extrabold text-xs">
              <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[200px]">{deal.merchantName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShareButton deal={deal} variant="header" />
            <button
              type="button"
              id="close-deal-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-5 sm:p-8 space-y-6 flex-1 overflow-y-auto overscroll-contain">
          {/* Merchant & Deal Header Section */}
          <div className="space-y-4">
            {/* Top Meta Bar: Store Name, Verified Badge, Category, and Audience Tier */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Store Name Badge */}
                <div
                  onClick={handleGetDeal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-400/40 dark:border-amber-500/30 text-amber-950 dark:text-yellow-300 font-extrabold text-xs sm:text-sm tracking-tight shadow-2xs hover:bg-amber-400/20 transition-all cursor-pointer group"
                  title={`Click to visit official ${deal.merchantName} store`}
                >
                  <Store className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-display font-black tracking-tight">{deal.merchantName}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600/70 dark:text-yellow-400/70 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Verified Store Pill */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Verified Store</span>
                </span>

                {deal.category && (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline-block">
                    &bull; {deal.category}
                  </span>
                )}
              </div>

              {/* Audience Pill */}
              {deal.vipExclusive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-gray-950 font-mono text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  <Crown className="w-3 h-3 text-gray-950" />
                  <span>VIP Exclusive</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300/40">
                  <span>🌐 Free Deal</span>
                </span>
              )}
            </div>

            {/* Main Title Row with Store Logo */}
            <div className="flex items-start gap-4">
              {/* Brand Logo Container */}
              <div
                onClick={handleGetDeal}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-gray-800 border-2 border-amber-400/50 dark:border-amber-500/40 p-2.5 shadow-md flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-amber-400 hover:scale-102 transition-all group"
                title={`Visit ${deal.merchantName}`}
              >
                {deal.merchantLogo && !imgError ? (
                  <img
                    src={deal.merchantLogo}
                    alt={`${deal.merchantName} logo`}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <span className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-gray-950 font-display font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xs">
                    {merchantInitial}
                  </span>
                )}
              </div>

              {/* Title takes full remaining width, no squishing */}
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-snug break-words">
                  {deal.title}
                </h1>
              </div>
            </div>

            {/* Dedicated Discount Offer Banner */}
            {deal.discount && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-400/20 via-yellow-400/10 to-transparent dark:from-amber-950/50 dark:via-gray-800 dark:to-gray-800/40 border-2 border-amber-400/50 dark:border-amber-500/40 flex items-center gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-gray-950 flex items-center justify-center shrink-0 font-bold shadow-2xs">
                  <Tag className="w-4 h-4 -rotate-45" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 block">
                    Verified Discount Offer
                  </span>
                  <span className="font-display font-bold text-sm sm:text-base text-gray-950 dark:text-white block leading-snug break-words">
                    {deal.discount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Coupon Code Big Box (If applicable) */}
          {deal.vipExclusive && !isVip ? (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-400/60 dark:border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  VIP Members Only Drop
                </span>
                <span className="bg-amber-400 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded">
                  VIP ONLY
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <span className="font-mono text-lg font-black text-gray-400 dark:text-gray-500 tracking-widest block select-none">
                    •••• •••• ••••
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    This promo code is exclusively reserved for DealScout VIP members.
                  </span>
                </div>
                {onOpenMembership && (
                  <button
                    type="button"
                    onClick={onOpenMembership}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock with VIP</span>
                  </button>
                )}
              </div>
            </div>
          ) : deal.couponCode ? (
            <div className="bg-amber-500/5 dark:bg-gray-950/80 border-2 border-dashed border-amber-400/60 dark:border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Tag className="w-4 h-4 -rotate-45" />
                  Promo / Coupon Code
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-[11px] font-medium">
                  Click button to copy
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3.5 px-4 text-center font-mono font-bold text-xl sm:text-2xl text-gray-900 dark:text-amber-300 tracking-widest shadow-2xs select-all">
                  {deal.couponCode}
                </div>
                <button
                  type="button"
                  id="modal-copy-code-btn"
                  onClick={handleCopyCode}
                  className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-xs'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Code Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                Copy this code and paste it into the promo box at {deal.merchantName}&apos;s checkout.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <strong className="font-bold block text-gray-900 dark:text-white">
                  Direct Activation Offer
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  No coupon code required! The discount will be applied automatically when clicking the button below.
                </span>
              </div>
            </div>
          )}

          {/* Affiliate Referral Attribution Section (Only when visitor clicked via partner referral) */}
          {activeAffiliateCode && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Active Partner Referral:{' '}
                    <strong className="font-mono text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                      {activeAffiliateCode}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Award className="w-3 h-3" /> 20% First
                  </span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                    <Repeat className="w-3 h-3" /> 10% Recurring
                  </span>
                </div>
              </div>

              {affiliateNotice ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{affiliateNotice.isFirst ? '20% First-Time' : '10% Recurring'} Commission Recorded!</strong> Promo code &quot;{deal.couponCode}&quot; recorded for partner {activeAffiliateCode} (sent for confirmation).
                  </span>
                </div>
              ) : deal.couponCode ? (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Commission will record for partner <strong className="font-mono text-amber-600 dark:text-amber-400">{activeAffiliateCode}</strong> once you copy or use the promo code above.
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  No promo code is required for this direct offer. Affiliate commission activates when a coupon code available on the site is used.
                </p>
              )}
            </div>
          )}

          {/* Official Store Verification Card & Primary GET DEAL Button */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-gray-800/60 border border-amber-300/60 dark:border-gray-700/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  {deal.merchantLogo && !imgError ? (
                    <img
                      src={deal.merchantLogo}
                      alt={deal.merchantName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="font-display font-black text-amber-500 text-sm">{merchantInitial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display font-extrabold text-sm text-gray-950 dark:text-white truncate">
                      {deal.merchantName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                      <BadgeCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Official Store
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    Verified direct checkout &bull; Hand-tested promo codes &bull; Guaranteed savings
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetDeal}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-yellow-400 hover:underline shrink-0 cursor-pointer"
              >
                <span>Visit Store</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              id="modal-get-deal-primary-btn"
              onClick={handleGetDeal}
              className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-black text-base sm:text-lg py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider active:scale-[0.99]"
            >
              <Store className="w-5 h-5 text-gray-950 shrink-0" />
              <span>SHOP OFFER AT {deal.merchantName.toUpperCase()}</span>
              <ExternalLink className="w-4 h-4 ml-1 shrink-0" />
            </button>

            {hasClickedDeal && (
              <div className="text-center text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 py-2.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 animate-in fade-in">
                &check; Redirecting to {deal.merchantName}... The official offer page has been opened in a new tab!
              </div>
            )}
          </div>

          {/* DealScout Link Share Block */}
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-gray-950 font-bold text-[11px] px-2.5 py-0.5 rounded-lg shadow-2xs shrink-0 uppercase tracking-wider">
                <Tag className="w-3 h-3 -rotate-45" /> Link
              </span>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate select-all">
                {shareUrl}
              </span>
            </div>
            <button
              type="button"
              id="modal-copy-dealscout-link-btn"
              onClick={handleShareDeal}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Ask Question / Report Expired Code In-App */}
          {onOpenSupport && (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-900/40 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-950 dark:text-amber-200">
                <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Found an expired code or have questions about this offer?</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenSupport(deal)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold text-xs shrink-0 transition-colors cursor-pointer text-center"
              >
                Post Anonymous Comment
              </button>
            </div>
          )}

          {/* Description & Terms */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            {deal.description && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Offer Details
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  {deal.description}
                </p>
              </div>
            )}

            {deal.terms && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Terms &amp; Restrictions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                  {deal.terms}
                </p>
              </div>
            )}

            {/* Validity & Expiration */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {expired ? (
                    <span className="text-red-500 font-bold">Offer Expired</span>
                  ) : deal.expirationDate ? (
                    `Expires: ${deal.expirationDate}`
                  ) : (
                    'Ongoing Verified Offer'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Affiliate Link</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50/80 dark:bg-gray-950/70 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <span>Curated by Deal Scout</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
