import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Repeat,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Gift,
  ArrowRight,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Sliders,
  Wallet,
  Building,
  RefreshCw,
  Award,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Affiliate, AffiliateConversion, Deal } from '../types';
import {
  createOrGetAffiliate,
  getAffiliateByUserId,
  getAffiliateConversions,
  updateAffiliateProfile,
  recordAffiliateConversion,
} from '../services/affiliateService';
import { getDealShareUrl } from '../utils/shareUtils';

interface AffiliatePortalProps {
  deals: Deal[];
  onNavigateHome: () => void;
  onSelectDeal?: (deal: Deal) => void;
}

export const AffiliatePortal: React.FC<AffiliatePortalProps> = ({
  deals,
  onNavigateHome,
  onSelectDeal,
}) => {
  const {
    currentUser,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    authError,
    clearAuthError,
  } = useAuth();

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Affiliate Account State
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedDealForLink, setSelectedDealForLink] = useState<string>('');
  const [copiedDealLink, setCopiedDealLink] = useState(false);

  // Calculator State
  const [calcCustomers, setCalcCustomers] = useState<number>(30);
  const [calcAvgOrder, setCalcAvgOrder] = useState<number>(65);
  const [calcRepeatOrders, setCalcRepeatOrders] = useState<number>(3);

  // Payout Settings Form State
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'bank' | 'crypto'>('paypal');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutStatusMsg, setPayoutStatusMsg] = useState<string | null>(null);
  const [payoutRequested, setPayoutRequested] = useState(false);

  // Test Conversion Demo Simulator
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ isFirst: boolean; amount: number } | null>(null);

  // Fetch Affiliate Data
  const loadAffiliateData = async () => {
    if (!currentUser) return;
    setLoadingAffiliate(true);
    try {
      let aff = await getAffiliateByUserId(currentUser.uid);
      if (!aff && currentUser.email) {
        aff = await createOrGetAffiliate({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
        });
      }
      setAffiliate(aff);
      if (aff) {
        setPayoutMethod(aff.payoutMethod || 'paypal');
        setPayoutDetails(aff.payoutDetails || aff.email);
        const convList = await getAffiliateConversions(aff.id, aff.affiliateCode);
        setConversions(convList);
      }
    } catch (err) {
      console.error('Failed to load affiliate profile:', err);
    } finally {
      setLoadingAffiliate(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAffiliateData();
    } else {
      setAffiliate(null);
      setConversions([]);
    }
  }, [currentUser]);

  // Handle Email Sign In or Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    if (!emailInput.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (authMode === 'signup') {
        const pwd = passwordInput || 'Affiliate2026!';
        await signUpWithEmail(emailInput.trim(), pwd, nameInput.trim());
      } else {
        await signInWithEmail(emailInput.trim(), passwordInput || undefined);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Copy Main Referral Link
  const handleCopyLink = () => {
    if (!affiliate) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?ref=${affiliate.affiliateCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Copy Affiliate Code
  const handleCopyCode = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(affiliate.affiliateCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  // Copy specific deal promo link
  const handleCopyDealLink = () => {
    if (!affiliate || !selectedDealForLink) return;
    const deal = deals.find((d) => d.id === selectedDealForLink);
    if (!deal) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const dealUrl = `${origin}/deals/${deal.id}?ref=${affiliate.affiliateCode}`;
    navigator.clipboard.writeText(dealUrl).then(() => {
      setCopiedDealLink(true);
      setTimeout(() => setCopiedDealLink(false), 2500);
    });
  };

  // Save Payout Settings
  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate) return;
    setSavingPayout(true);
    setPayoutStatusMsg(null);
    try {
      await updateAffiliateProfile(affiliate.id, {
        payoutMethod,
        payoutDetails: payoutDetails.trim(),
      });
      setAffiliate((prev) =>
        prev ? { ...prev, payoutMethod, payoutDetails: payoutDetails.trim() } : null
      );
      setPayoutStatusMsg('Payout settings saved successfully!');
      setTimeout(() => setPayoutStatusMsg(null), 3500);
    } catch (err: any) {
      setPayoutStatusMsg(err?.message || 'Failed to update payout settings.');
    } finally {
      setSavingPayout(false);
    }
  };

  // Simulate a live promo code use (to test 20% first purchase and 10% recurring)
  const handleSimulateConversion = async () => {
    if (!affiliate) return;
    setSimulating(true);
    setSimResult(null);

    const demoDeal = deals.length > 0 ? deals[0] : {
      id: 'demo-deal-1',
      title: '70% Off Premium Plan + 3 Extra Months',
      merchantName: 'NordVPN',
      discount: '70% OFF',
    };

    try {
      const res = await recordAffiliateConversion({
        affiliateCode: affiliate.affiliateCode,
        dealId: demoDeal.id,
        dealTitle: demoDeal.title,
        merchantName: demoDeal.merchantName,
        discount: demoDeal.discount,
        customOrderValue: calcAvgOrder,
      });

      if (res.success && res.conversion) {
        setSimResult({
          isFirst: res.isFirstUse,
          amount: res.commissionAmount,
        });
        // Reload conversions and totals
        await loadAffiliateData();
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Calculate Projected Earnings
  const firstOrderCommission = calcCustomers * calcAvgOrder * 0.20;
  const recurringOrdersCommission = calcCustomers * calcRepeatOrders * calcAvgOrder * 0.10;
  const totalProjectedEarnings = firstOrderCommission + recurringOrdersCommission;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors pb-20">
      {/* Top Breadcrumb & Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={onNavigateHome}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Deal Scout
            </button>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-amber-500 font-bold flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              Affiliate Partner Program
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline truncate max-w-xs">
                  {currentUser.email}
                </span>
                <button
                  onClick={() => logout()}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onNavigateHome}
                className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back to Deals
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section with Commission Highlights */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white py-12 sm:py-16 border-b border-gray-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FACC15_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>High-Yield Partner Program</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-balance max-w-3xl mx-auto leading-tight">
            Earn <span className="text-amber-400 underline decoration-amber-400/50 decoration-wavy underline-offset-4">20% First</span> +{' '}
            <span className="text-amber-300">10% Recurring</span> Commission
          </h1>

          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Share verified promo codes and discount deals from top brands. When your audience saves money, you earn instant commission on their first order and ongoing recurring income on every repeat purchase.
          </p>

          {/* Quick Highlight Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700/80 text-gray-200">
              <Award className="w-4 h-4 text-amber-400" />
              <span><strong>20%</strong> on Initial Order</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700/80 text-gray-200">
              <Repeat className="w-4 h-4 text-emerald-400" />
              <span><strong>10%</strong> Recurring Lifetime</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700/80 text-gray-200">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>30-Day Attribution Window</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700/80 text-gray-200">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span>PayPal &amp; Bank Direct Payouts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 space-y-8">
        {/* If user is NOT signed in: Display Sign In / Registration Card */}
        {!currentUser && (
          <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-400/30">
                <Gift className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl font-black text-gray-900 dark:text-white">
                {authMode === 'signin' ? 'Sign In to Your Affiliate Account' : 'Join the Affiliate Program'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter your email below to access your personal tracking code, conversion logs, and payouts.
              </p>
            </div>

            {/* Toggle Sign In vs Sign Up */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setFormError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setFormError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error notifications */}
            {(formError || authError) && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError || authError}</span>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Your Name or Channel Moniker
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Alex Rivera or TechSaver"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="partner@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Password (Optional for quick login)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password or leave blank for instant access"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
                  Leave blank to quickly register or log in with your email.
                </span>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>{authMode === 'signin' ? 'Sign In with Email' : 'Join & Get Affiliate Code'}</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
              <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 uppercase font-bold">Or</span>
            </div>

            {/* Google Sign In option */}
            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* If user IS signed in: Display Complete Affiliate Dashboard */}
        {currentUser && (
          <div className="space-y-8">
            {/* Affiliate Profile Header Banner */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-gray-950 font-black text-xl flex items-center justify-center shadow-xs">
                    {affiliate?.name ? affiliate.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
                        {affiliate?.name || 'Affiliate Partner'}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60">
                        Active Partner
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {affiliate?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1 text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <Award className="w-3.5 h-3.5" /> 20% First Purchase Commission
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <Repeat className="w-3.5 h-3.5" /> 10% Recurring Commission
                  </span>
                </div>
              </div>

              {/* Code & Direct Link Copy Strip */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-yellow-400 tracking-wider block">
                    Your Promo Referral Code
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-lg font-black text-gray-900 dark:text-white select-all">
                      {affiliate?.affiliateCode || 'GENERATING...'}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 text-gray-700 dark:text-gray-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                      title="Copy promo code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-amber-200 dark:border-amber-800/80 pt-3 sm:pt-0 sm:pl-4">
                  <button
                    onClick={handleCopyLink}
                    className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-gray-950" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Copy Partner Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Primary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span>Total Earned</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="font-mono text-2xl sm:text-3xl font-black text-gray-900 dark:text-white block tabular-nums">
                  ${(affiliate?.totalEarned || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                  Lifetime affiliate earnings
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <span>Pending Payout</span>
                  <Wallet className="w-4 h-4 text-amber-500" />
                </div>
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 block tabular-nums">
                  ${(affiliate?.pendingBalance || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                  Available for withdrawal
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  <span>Promo Conversions</span>
                  <Repeat className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-mono text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 block tabular-nums">
                  {affiliate?.totalConversions || conversions.length}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                  20% initial &amp; 10% repeat uses
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  <span>Referral Clicks</span>
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                </div>
                <span className="font-mono text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 block tabular-nums">
                  {affiliate?.totalClicks || 0}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                  Tracked visitors
                </span>
              </div>
            </div>

            {/* Live Interactive Commission Calculator */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-500" />
                    <span>Interactive Earnings Calculator</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    See how much recurring passive income you can generate with our 20% + 10% tiered affiliate model.
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-3 py-1 rounded-xl self-start sm:self-auto border border-amber-300/50">
                  Tier 1: 20% • Recurring: 10%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control 1: Referred Customers */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Referred Clients</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-black">{calcCustomers} people</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="200"
                    value={calcCustomers}
                    onChange={(e) => setCalcCustomers(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400">Audience members who use your code</span>
                </div>

                {/* Control 2: Average Order Value */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Average Order Value</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">${calcAvgOrder} USD</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="300"
                    step="5"
                    value={calcAvgOrder}
                    onChange={(e) => setCalcAvgOrder(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400">Typical checkout price per order</span>
                </div>

                {/* Control 3: Repeat Orders Per Client */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Recurring Orders/Year</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-black">{calcRepeatOrders} repeat uses</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={calcRepeatOrders}
                    onChange={(e) => setCalcRepeatOrders(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400">Subsequent renewals or purchases</span>
                </div>
              </div>

              {/* Calculator Results Breakdown */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold block">1st Orders (20%)</span>
                  <span className="font-mono text-xl font-black text-gray-900 dark:text-white mt-1 block">
                    ${firstOrderCommission.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {calcCustomers} clients × ${calcAvgOrder} × 20%
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold block">Recurring Orders (10%)</span>
                  <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    ${recurringOrdersCommission.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {calcCustomers * calcRepeatOrders} orders × ${calcAvgOrder} × 10%
                  </span>
                </div>

                <div className="p-3 bg-amber-400 text-gray-950 rounded-lg shadow-xs flex flex-col justify-center">
                  <span className="text-xs font-black uppercase tracking-wider block">Total Projected Revenue</span>
                  <span className="font-mono text-2xl font-black mt-1 block">
                    ${totalProjectedEarnings.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Specific Deal Promo Link Generator & Live Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deal Link Generator */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-amber-500" />
                  <span>Generate Deal-Specific Promo Links</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select any merchant deal to generate a direct affiliate link with your code automatically attached.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Choose Deal
                    </label>
                    <select
                      value={selectedDealForLink}
                      onChange={(e) => setSelectedDealForLink(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">Select a merchant deal...</option>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.merchantName} — {d.discount} ({d.title.slice(0, 35)}...)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDealForLink && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="text-[11px] font-mono text-gray-600 dark:text-gray-300 break-all select-all">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/deals/
                        {deals.find((d) => d.id === selectedDealForLink)?.id}?ref={affiliate?.affiliateCode}
                      </div>
                      <button
                        onClick={handleCopyDealLink}
                        className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                      >
                        {copiedDealLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDealLink ? 'Copied Specific Deal Link!' : 'Copy Specific Deal Link'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Conversion Simulator (Demonstrating 20% First & 10% Recurring) */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Instant Promo Test Simulator</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded">
                    Live Demo
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Simulate a customer using your promo code right now. The first time triggers <strong>20% commission</strong>, and every subsequent simulation triggers <strong>10% recurring commission</strong>!
                </p>

                <div className="pt-2 space-y-3">
                  <button
                    onClick={handleSimulateConversion}
                    disabled={simulating}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {simulating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Simulate Promo Code Order (${calcAvgOrder} basket)</span>
                  </button>

                  {simResult && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <strong>
                          {simResult.isFirst
                            ? 'First-Time Purchase Conversion Recorded!'
                            : 'Recurring Purchase Conversion Recorded!'}
                        </strong>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          {simResult.isFirst
                            ? `Earned 20% commission ($${simResult.amount.toFixed(2)})! Next purchase from this user will earn 10% recurring.`
                            : `Earned 10% recurring commission ($${simResult.amount.toFixed(2)})!`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Conversions Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">
                    Recent Promo Code Conversions &amp; Commissions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Orders attributed to your referral code ({conversions.length} total)
                  </p>
                </div>
                <button
                  onClick={loadAffiliateData}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  title="Refresh conversions"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingAffiliate ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {conversions.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <Gift className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    No promo code conversions recorded yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Share your promo code <strong className="font-mono text-amber-500">{affiliate?.affiliateCode}</strong> with your audience. When they activate a deal, your 20% first / 10% recurring commission will appear here automatically!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Merchant / Offer</th>
                        <th className="py-3 px-4 text-center">Commission Tier</th>
                        <th className="py-3 px-4 text-right">Order Basket</th>
                        <th className="py-3 px-4 text-right">Commission Earned</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {conversions.map((conv) => (
                        <tr key={conv.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(conv.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 dark:text-white block">
                              {conv.merchantName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                              {conv.dealTitle}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {conv.isFirstUse ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-yellow-400 border border-amber-300/60">
                                <Award className="w-3 h-3" /> 20% First Purchase
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60">
                                <Repeat className="w-3 h-3" /> 10% Recurring Use
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                            ${(conv.orderEstimatedValue || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +${conv.commissionAmount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {conv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout Details & Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-500" />
                    <span>Payout Method &amp; Withdrawal Settings</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Earnings are paid out monthly via PayPal, Direct Bank Transfer, or Crypto.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Available Balance:</span>
                  <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                    ${(affiliate?.pendingBalance || 0).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutRequested(true);
                      setTimeout(() => setPayoutRequested(false), 5000);
                    }}
                    disabled={(affiliate?.pendingBalance || 0) <= 0}
                    className="ml-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Request Payout
                  </button>
                </div>
              </div>

              {payoutRequested && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Payout request received! Our finance team will review and disburse your balance to {payoutDetails} within 2 business days.</span>
                </div>
              )}

              {payoutStatusMsg && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  {payoutStatusMsg}
                </div>
              )}

              <form onSubmit={handleSavePayout} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('paypal')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        payoutMethod === 'paypal'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-yellow-400 ring-2 ring-amber-400/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>PayPal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayoutMethod('bank')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        payoutMethod === 'bank'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-yellow-400 ring-2 ring-amber-400/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>Bank Wire</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayoutMethod('crypto')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        payoutMethod === 'crypto'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-yellow-400 ring-2 ring-amber-400/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Crypto (USDT)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    {payoutMethod === 'paypal'
                      ? 'PayPal Email Address'
                      : payoutMethod === 'bank'
                      ? 'Bank Account / IBAN / Routing'
                      : 'USDT (TRC20/ERC20) Wallet Address'}
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    placeholder={
                      payoutMethod === 'paypal'
                        ? 'your-paypal@email.com'
                        : payoutMethod === 'bank'
                        ? 'IBAN or Account Number + Bank Name'
                        : '0x... or T...'
                    }
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPayout}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingPayout ? 'Saving...' : 'Save Payout Details'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
