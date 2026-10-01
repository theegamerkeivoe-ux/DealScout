import React, { useState } from 'react';
import {
  X,
  Check,
  Sparkles,
  Crown,
  Search,
  Bell,
  ShieldCheck,
  Zap,
  ArrowRight,
  Gift,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Membership } from '../types';
import { activateMembership, cancelMembership } from '../services/membershipService';

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMembership: Membership | null;
  onMembershipUpdated: (mem: Membership | null) => void;
  onRequestDealClick?: () => void;
}

export const MembershipModal: React.FC<MembershipModalProps> = ({
  isOpen,
  onClose,
  currentMembership,
  onMembershipUpdated,
  onRequestDealClick,
}) => {
  const { currentUser, signInWithGoogle } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [emailInput, setEmailInput] = useState(currentUser?.email || '');
  const [nameInput, setNameInput] = useState(currentUser?.displayName || '');
  const [instantAlerts, setInstantAlerts] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMemberActive = currentMembership && currentMembership.status === 'active';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = (currentUser?.email || emailInput).trim().toLowerCase();
    if (!email) {
      setErrorMessage('Please enter a valid email address for your membership.');
      return;
    }

    setIsProcessing(true);
    try {
      const mem = await activateMembership(
        {
          uid: currentUser?.uid,
          email,
          displayName: currentUser?.displayName || nameInput || email.split('@')[0],
        },
        billingCycle,
        instantAlerts
      );

      onMembershipUpdated(mem);
      setSuccessMessage(
        `Welcome to DealScout VIP! Your ${
          billingCycle === 'yearly' ? 'Yearly ($216/yr - 10% saved)' : 'Monthly ($20/mo)'
        } membership is active.`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to activate membership. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!currentMembership) return;
    if (!window.confirm('Are you sure you want to cancel your VIP membership? You will lose access to on-demand deal requests.')) return;
    setIsProcessing(true);
    try {
      await cancelMembership(currentMembership.id);
      onMembershipUpdated({ ...currentMembership, status: 'cancelled' });
      setSuccessMessage('Your membership has been cancelled.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to cancel membership.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border border-amber-400/40 dark:border-amber-500/30 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Decorative Top Accent Banner */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 p-6 text-gray-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-950 text-amber-400 flex items-center justify-center font-bold shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-tight uppercase">
                  DealScout VIP Membership
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-950 text-amber-300">
                  Exclusive
                </span>
              </div>
              <p className="text-xs text-gray-900 font-medium opacity-90 mt-0.5">
                On-demand personal deal hunting, secret promo codes, and constant updates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-gray-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successMessage ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                  VIP Membership Active!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  {successMessage}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {onRequestDealClick && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestDealClick();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Search className="w-4 h-4" />
                    <span>Request Your First Deal Now</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close &amp; Explore VIP Deals
                </button>
              </div>
            </div>
          ) : isMemberActive ? (
            /* Already a member status view */
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                    Current Plan
                  </span>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white capitalize">
                    VIP {currentMembership.plan} (${currentMembership.price}/{currentMembership.billingCycle === 'yearly' ? 'year' : 'month'})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Renews on: {new Date(currentMembership.renewsDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Member
                  </span>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                    <Search className="w-4 h-4" />
                    <span>Personal Deal Concierge</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Want a discount on a specific laptop, sneaker, flight, or store? Submit a request and our scouts hunt it down!
                  </p>
                  {onRequestDealClick && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestDealClick();
                      }}
                      className="mt-2 w-full py-2 px-3 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <span>Ask Us to Find a Deal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
                    <Bell className="w-4 h-4" />
                    <span>Constant VIP Updates</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Receive instant alerts for limited-quantity promo drops and high-value retailer coupons.
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Instant deal alerts enabled</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="text-red-500 hover:text-red-700 font-semibold cursor-pointer underline"
                >
                  Cancel Membership
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Signup & Comparison View */
            <>
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl max-w-sm mx-auto border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Monthly ($20/mo)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
                    billingCycle === 'yearly'
                      ? 'bg-amber-400 text-gray-950 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <span>Yearly</span>
                  <span className="text-[10px] font-black uppercase bg-gray-950 text-amber-300 px-1.5 py-0.5 rounded-full">
                    Save 10%
                  </span>
                </button>
              </div>

              {/* Pricing Callout Card */}
              <div className="text-center space-y-1">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-4xl font-black text-gray-950 dark:text-white">
                    {billingCycle === 'yearly' ? '$216' : '$20'}
                  </span>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    /{billingCycle === 'yearly' ? 'year ($18/mo)' : 'month'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    🎉 10% discount applied! You save $24 every year.
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cancel anytime. The free public version of DealScout always remains available for everyone.
                </p>
              </div>

              {/* Comparison Grid: Free vs VIP Member */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Free Tier */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                      Free Visitor
                    </span>
                    <span className="text-xs font-bold text-gray-500">$0 / forever</span>
                  </div>
                  <ul className="text-xs space-y-2 text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                      <span>Browse all public verified coupon codes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                      <span>Standard store &amp; deal search</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                      <span>Community comments &amp; deal ratings</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-400 line-through">
                      <X className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>On-demand custom deal finder</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-400 line-through">
                      <X className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>VIP secret drops &amp; flash codes</span>
                    </li>
                  </ul>
                </div>

                {/* VIP Member Tier */}
                <div className="p-4 rounded-2xl border-2 border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-400 text-gray-950 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                    Recommended
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>VIP Member</span>
                    </span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      {billingCycle === 'yearly' ? '$18/mo' : '$20/mo'}
                    </span>
                  </div>
                  <ul className="text-xs space-y-2 text-gray-900 dark:text-gray-100">
                    <li className="flex items-start gap-2 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Ask us to find deals for you:</strong> Request deals on whatever you want!
                      </span>
                    </li>
                    <li className="flex items-start gap-2 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>VIP &amp; Secret Deals:</strong> Early-access clearance and exclusive drops
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Constant Updates:</strong> Instant alerts for price drops &amp; flash promos
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Priority turnaround on custom requests</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Form Input for Signup */}
              <form onSubmit={handleSubscribe} className="space-y-4 pt-2">
                {!currentUser && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="e.g. Jordan Smith"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="your.email@example.com"
                          required
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Instant Alerts checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={instantAlerts}
                    onChange={(e) => setInstantAlerts(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400"
                  />
                  <span>Send me constant updates and instant deal alerts for new exclusive drops</span>
                </label>

                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4 text-gray-950" />
                  )}
                  <span>
                    Join DealScout VIP · {billingCycle === 'yearly' ? '$216/year (Save 10%)' : '$20/month'}
                  </span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
