import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  Search,
  Sparkles,
  ArrowUpRight,
  Database,
  MessageSquare,
  Clock,
  Shield,
  Gift,
  Award,
  Repeat,
  DollarSign,
  Wallet,
  Check,
  Lock,
  Crown,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Deal, SupportComment, Affiliate, AffiliateConversion, Membership, DealRequest } from '../types';
import {
  getAllDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  isDealExpired,
  clearAllDeals,
  purgeSampleDeals,
} from '../services/dealService';
import {
  getSupportComments,
  deleteSupportComment,
} from '../services/commentService';
import {
  getAllAffiliates,
  getAllConversions,
  updateConversionStatus,
  confirmConversion,
  rejectConversion,
} from '../services/affiliateService';
import {
  getAllMemberships,
  getAllDealRequests,
  respondToDealRequest,
} from '../services/membershipService';
import { testFirestoreConnection } from '../firebase';
import { LogoUploader } from '../components/LogoUploader';
import { DealScoutLogo } from '../components/DealScoutLogo';

export const AdminDashboard: React.FC<{ onNavigateHome: () => void }> = ({ onNavigateHome }) => {
  const {
    currentUser,
    isOwner,
    isSigningIn,
    popupBlocked,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInAsOwner,
    logout,
    authError,
    clearAuthError,
  } = useAuth();

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'add' | 'manage' | 'expired' | 'analytics' | 'comments' | 'affiliates' | 'settings'
  >('overview');

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter / search inside manage table
  const [tableSearch, setTableSearch] = useState('');

  // Editing state
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Community Comments Moderation state
  const [comments, setComments] = useState<SupportComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');
  const [commentToDelete, setCommentToDelete] = useState<SupportComment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Affiliate Program Admin State
  const [affiliatesList, setAffiliatesList] = useState<Affiliate[]>([]);
  const [conversionsList, setConversionsList] = useState<AffiliateConversion[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState('');

  // Form State for Add / Edit
  const emptyFormState = {
    merchantName: '',
    merchantLogo: '',
    title: '',
    discount: '',
    couponCode: '',
    description: '',
    terms: '',
    affiliateUrl: '',
    startDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    featured: false,
    published: true,
  };

  const [formData, setFormData] = useState(emptyFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Admin Passcode Security Login State
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) {
      setPasscodeError('Please enter your administrator email.');
      return;
    }
    if (!adminPasscode.trim()) {
      setPasscodeError('Please enter your administrator passcode.');
      return;
    }
    setPasscodeError(null);
    setIsVerifyingPasscode(true);
    try {
      const ok = await signInAsOwner(adminPasscode.trim(), adminEmailInput.trim());
      if (!ok) {
        setPasscodeError('Access denied: Incorrect administrator email or passcode.');
      }
    } catch (err: any) {
      setPasscodeError(err?.message || 'Verification connection failed.');
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  // Load all deals for admin
  const fetchDeals = async () => {
    if (!isOwner) return;
    setLoading(true);
    setDbError(null);
    try {
      const data = await getAllDeals();
      setDeals(data);
    } catch (err: any) {
      console.error('Error fetching deals for admin:', err);
      setDbError(err.message || 'Failed to load deals from Firestore');
    } finally {
      setLoading(false);
    }
  };

  // Load community support comments for moderation
  const fetchComments = async () => {
    if (!isOwner) return;
    setLoadingComments(true);
    try {
      const data = await getSupportComments();
      setComments(data);
    } catch (err: any) {
      console.error('Error fetching comments for admin:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Load Affiliates & Conversions for admin review
  const fetchAffiliatesAndConversions = async () => {
    if (!isOwner) return;
    setLoadingAffiliates(true);
    try {
      const [affs, convs] = await Promise.all([
        getAllAffiliates(),
        getAllConversions(),
      ]);
      setAffiliatesList(affs);
      setConversionsList(convs);
    } catch (err) {
      console.error('Error fetching affiliates data for admin:', err);
    } finally {
      setLoadingAffiliates(false);
    }
  };

  // VIP Memberships & Custom Deal Concierge Requests
  const [dealRequests, setDealRequests] = useState<DealRequest[]>([]);
  const [membershipsList, setMembershipsList] = useState<Membership[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequestForReply, setSelectedRequestForReply] = useState<DealRequest | null>(null);
  const [replyResponseText, setReplyResponseText] = useState('');
  const [replyCouponCode, setReplyCouponCode] = useState('');
  const [replyDealUrl, setReplyDealUrl] = useState('');
  const [replyStatus, setReplyStatus] = useState<DealRequest['status']>('deal_found');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Payment Gateway Configuration State (Stripe / Bank Payouts)
  const [stripeMonthlyUrl, setStripeMonthlyUrl] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('dealscout_stripe_monthly_url') || '' : '';
  });
  const [stripeYearlyUrl, setStripeYearlyUrl] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('dealscout_stripe_yearly_url') || '' : '';
  });
  const [payoutSaveNotice, setPayoutSaveNotice] = useState<string | null>(null);

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dealscout_stripe_monthly_url', stripeMonthlyUrl.trim());
      localStorage.setItem('dealscout_stripe_yearly_url', stripeYearlyUrl.trim());
    }
    setPayoutSaveNotice('Payment gateway configuration saved! Real funds will route directly to your account.');
    setTimeout(() => setPayoutSaveNotice(null), 4000);
  };

  const fetchMembershipsAndRequests = async () => {
    if (!isOwner) return;
    setLoadingRequests(true);
    try {
      const [reqs, mems] = await Promise.all([
        getAllDealRequests(),
        getAllMemberships(),
      ]);
      setDealRequests(reqs);
      setMembershipsList(mems);
    } catch (err) {
      console.error('Error fetching memberships and requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleOpenReplyModal = (req: DealRequest) => {
    setSelectedRequestForReply(req);
    setReplyResponseText(
      req.adminResponse ||
        `Hi ${req.userName || 'Member'}, our scout team found an exclusive verified discount for ${req.productOrStore}!`
    );
    setReplyCouponCode(req.foundCouponCode || '');
    setReplyDealUrl(req.foundDealUrl || req.productUrl || '');
    setReplyStatus(req.status === 'pending' ? 'deal_found' : req.status);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForReply) return;
    setReplySubmitting(true);
    try {
      await respondToDealRequest(selectedRequestForReply.id, {
        status: replyStatus,
        adminResponse: replyResponseText,
        foundCouponCode: replyCouponCode.trim() || undefined,
        foundDealUrl: replyDealUrl.trim() || undefined,
      });

      setStatusMessage({
        type: 'success',
        text: `Response sent to ${selectedRequestForReply.userEmail} for "${selectedRequestForReply.productOrStore}"!`,
      });
      setSelectedRequestForReply(null);
      await fetchMembershipsAndRequests();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to update request.' });
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleMarkConversionPaid = async (conversionId: string) => {
    try {
      await updateConversionStatus(conversionId, 'paid');
      setConversionsList((prev) =>
        prev.map((c) => (c.id === conversionId ? { ...c, status: 'paid' } : c))
      );
      setStatusMessage({ type: 'success', text: 'Conversion marked as Paid.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to update status.' });
    }
  };

  const handleConfirmConversion = async (conversionId: string) => {
    try {
      const ok = await confirmConversion(conversionId);
      if (ok) {
        setConversionsList((prev) =>
          prev.map((c) => (c.id === conversionId ? { ...c, status: 'approved' } : c))
        );
        setStatusMessage({
          type: 'success',
          text: 'Conversion confirmed & approved! It is now visible to the promoter with commission credited.',
        });
        await fetchAffiliatesAndConversions();
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to confirm conversion.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error confirming conversion.' });
    }
  };

  const handleRejectConversion = async (conversionId: string) => {
    if (!window.confirm('Are you sure you want to decline/reject this conversion? It will not be credited or shown to the promoter.')) return;
    try {
      const ok = await rejectConversion(conversionId);
      if (ok) {
        setConversionsList((prev) =>
          prev.map((c) => (c.id === conversionId ? { ...c, status: 'rejected' } : c))
        );
        setStatusMessage({
          type: 'success',
          text: 'Conversion declined. It will not be credited or shown to the promoter.',
        });
        await fetchAffiliatesAndConversions();
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to decline conversion.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error declining conversion.' });
    }
  };

  // Remove harmful comment handler
  const handleDeleteCommentConfirm = async () => {
    if (!commentToDelete) return;
    setDeletingCommentId(commentToDelete.id);
    try {
      await deleteSupportComment(commentToDelete.id);
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
      setStatusMessage({ type: 'success', text: 'Comment removed in accordance with moderation policy.' });
      setCommentToDelete(null);
    } catch (err: any) {
      console.error('Error removing comment:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to remove comment.' });
    } finally {
      setDeletingCommentId(null);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchDeals();
      fetchComments();
      fetchAffiliatesAndConversions();
      fetchMembershipsAndRequests();
    }
  }, [isOwner]);

  // URL Validation helper
  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Submit Add Deal or Update Deal
  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.merchantName.trim()) {
      setFormError('Merchant / Store name is required.');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Deal title is required.');
      return;
    }
    if (!formData.discount.trim()) {
      setFormError('Discount amount is required (e.g. 20% OFF or $50 OFF).');
      return;
    }
    if (!formData.affiliateUrl.trim()) {
      setFormError('Affiliate / Promo destination URL is required.');
      return;
    }
    if (!isValidUrl(formData.affiliateUrl.trim())) {
      setFormError('Affiliate URL must be a valid URL starting with http:// or https://');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingDeal) {
        // Update existing deal
        await updateDeal(editingDeal.id, {
          merchantName: formData.merchantName.trim(),
          merchantLogo: formData.merchantLogo.trim(),
          title: formData.title.trim(),
          discount: formData.discount.trim(),
          couponCode: formData.couponCode.trim(),
          description: formData.description.trim(),
          terms: formData.terms.trim(),
          affiliateUrl: formData.affiliateUrl.trim(),
          startDate: formData.startDate,
          expirationDate: formData.expirationDate,
          featured: formData.featured,
          published: formData.published,
        });

        setStatusMessage({ type: 'success', text: `Deal "${formData.title}" updated successfully!` });
        setEditingDeal(null);
      } else {
        // Create new deal
        await createDeal({
          merchantName: formData.merchantName.trim(),
          merchantLogo: formData.merchantLogo.trim(),
          title: formData.title.trim(),
          discount: formData.discount.trim(),
          couponCode: formData.couponCode.trim(),
          description: formData.description.trim(),
          terms: formData.terms.trim(),
          affiliateUrl: formData.affiliateUrl.trim(),
          startDate: formData.startDate,
          expirationDate: formData.expirationDate,
          featured: formData.featured,
          published: formData.published,
        });

        setStatusMessage({ type: 'success', text: `New deal "${formData.title}" published successfully!` });
      }

      setFormData(emptyFormState);
      await fetchDeals();
      setActiveTab('manage');
    } catch (err: any) {
      console.error('Error saving deal:', err);
      setFormError(err.message || 'Error saving deal to Firestore');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditClick = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      merchantName: deal.merchantName,
      merchantLogo: deal.merchantLogo || '',
      title: deal.title,
      discount: deal.discount,
      couponCode: deal.couponCode || '',
      description: deal.description || '',
      terms: deal.terms || '',
      affiliateUrl: deal.affiliateUrl,
      startDate: deal.startDate || '',
      expirationDate: deal.expirationDate || '',
      featured: deal.featured,
      published: deal.published,
    });
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfirm = async () => {
    if (!dealToDelete) return;
    try {
      await deleteDeal(dealToDelete.id);
      setStatusMessage({ type: 'success', text: `Deal "${dealToDelete.title}" deleted.` });
      setDealToDelete(null);
      await fetchDeals();
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete deal' });
    }
  };

  const handleTogglePublished = async (deal: Deal) => {
    try {
      await updateDeal(deal.id, { published: !deal.published });
      setDeals((prev) =>
        prev.map((d) => (d.id === deal.id ? { ...d, published: !d.published } : d))
      );
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to toggle published status' });
    }
  };

  const handleToggleFeatured = async (deal: Deal) => {
    try {
      await updateDeal(deal.id, { featured: !deal.featured });
      setDeals((prev) =>
        prev.map((d) => (d.id === deal.id ? { ...d, featured: !d.featured } : d))
      );
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to toggle featured status' });
    }
  };

  // Clear all deals button (so user can start adding their own)
  const handleClearAllDeals = async () => {
    if (!confirm('Are you sure you want to remove ALL deals from the database so you can start fresh with your own links? This cannot be undone.')) return;
    setLoading(true);
    try {
      const count = await clearAllDeals();
      setStatusMessage({ type: 'success', text: `Cleaned database! Removed ${count} deal(s). You can now add your own deals.` });
      await fetchDeals();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to clear deals' });
    } finally {
      setLoading(false);
    }
  };

  // 1. If not authenticated at all -> Login Prompt
  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F9FAFB] dark:bg-gray-950 transition-colors">
        <div className="bg-white dark:bg-gray-900 max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FACC15]/20 border border-[#FACC15]/40 text-gray-900 dark:text-[#FACC15] flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Admin Login</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in with your authorized Google Account to manage verified deals and promo codes.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 text-left space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Restricted Administrator Access</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
              This management area is strictly for the Deal Scout channel owner. Deals and promo codes can be browsed freely by visitors without signing in.
            </p>
          </div>

          {/* Support callout */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 text-left flex items-start gap-2.5">
            <MessageSquare className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
              <span className="font-bold block">Community Support &amp; Moderation</span>
              <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                Visitors can post anonymous questions and deal reports on the app. Administrators moderate and remove any harmful comments directly in this dashboard.
              </p>
            </div>
          </div>

          {authError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs p-3.5 rounded-xl text-left space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{authError}</span>
                <button
                  onClick={clearAuthError}
                  className="text-amber-700 dark:text-amber-300 hover:text-amber-900 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Iframe or popup-blocked advisory banner */}
          {(popupBlocked || isInIframe) && (
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs p-3.5 rounded-xl text-left space-y-2.5">
              <p className="font-medium text-blue-950 dark:text-blue-100">
                {popupBlocked
                  ? 'Browser blocked the Google sign-in window.'
                  : 'Running in live preview iframe:'}
              </p>
              <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                Google Authentication works most reliably in a direct browser tab without iframe sandboxing.
              </p>
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-colors shadow-2xs"
              >
                <span>Open Deal Scout in New Tab</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="space-y-3">
            <button
              id="admin-google-signin-btn"
              onClick={signInWithGoogle}
              disabled={isSigningIn}
              className={`w-full ${
                isSigningIn
                  ? 'bg-gray-700 cursor-not-allowed opacity-80'
                  : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 dark:text-gray-900 cursor-pointer'
              } text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xs text-xs uppercase tracking-wider`}
            >
              {isSigningIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {!isInIframe && (
              <button
                type="button"
                onClick={signInWithGoogleRedirect}
                disabled={isSigningIn}
                className="w-full text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-1.5 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Having trouble? Try redirect sign-in</span>
              </button>
            )}

            {/* Secure Admin Passcode Authentication */}
            <form onSubmit={handlePasscodeLogin} className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin Passcode Verification</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Enter your authorized owner email and administrator security passcode to unlock management controls.
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="Enter administrator email..."
                  required
                  autoComplete="email"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Admin Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="Enter admin passcode..."
                    required
                    className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passcodeError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
                  {passcodeError}
                </div>
              )}

              <button
                type="submit"
                id="admin-verify-passcode-btn"
                disabled={isSigningIn || isVerifyingPasscode}
                className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isVerifyingPasscode ? (
                  <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-gray-950" />
                )}
                <span>Verify &amp; Unlock Admin Panel</span>
              </button>
            </form>
          </div>

          <button
            onClick={onNavigateHome}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Return to public website
          </button>
        </div>
      </div>
    );
  }

  // 2. If signed in, but NOT the authorized owner -> ACCESS DENIED
  if (!isOwner) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="bg-white dark:bg-gray-900 max-w-lg w-full rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Access Denied</h1>
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-800 dark:text-red-300 leading-relaxed">
              Access denied. You are not authorized to access the Deal Scout admin dashboard.
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This account does not have administrator privileges for Deal Scout.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => logout()}
              className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Google Account / Sign Out</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Return to public website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Owner Dashboard
  const now = Date.now();
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  const totalDeals = deals.length;
  const expiredDealsList = deals.filter((d) => isDealExpired(d));
  const activeDealsList = deals.filter((d) => d.published && !isDealExpired(d));
  const totalClicks = deals.reduce((sum, d) => sum + (d.clicks || 0), 0);
  const dealsAddedThisMonth = deals.filter((d) => d.createdAt && d.createdAt.startsWith(currentMonthStr)).length;

  // Filter for table
  const filteredDeals = deals.filter((deal) => {
    if (activeTab === 'expired' && !isDealExpired(deal)) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchName = deal.merchantName.toLowerCase().includes(q);
      const matchTitle = deal.title.toLowerCase().includes(q);
      const matchCode = (deal.couponCode || '').toLowerCase().includes(q);
      return matchName || matchTitle || matchCode;
    }
    return true;
  });

  // Filter for community comments moderation
  const filteredComments = comments.filter((comment) => {
    if (!commentSearch.trim()) return true;
    const q = commentSearch.toLowerCase().trim();
    return (
      comment.text.toLowerCase().includes(q) ||
      (comment.name || '').toLowerCase().includes(q) ||
      (comment.merchantName || '').toLowerCase().includes(q) ||
      (comment.dealTitle || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors pb-16">
      {/* Top Admin Bar */}
      <header className="bg-gray-950 text-white border-b border-gray-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-gray-950 font-bold flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-extrabold text-base tracking-tight text-white block leading-none">
                  Deal Scout <span className="text-amber-400 font-semibold">Admin</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Verified Admin Session
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateHome}
                className="text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors flex items-center gap-1.5"
              >
                <span>View Public Site</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                className="text-xs font-semibold text-gray-400 hover:text-red-400 p-1.5 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Toast status message */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm shadow-sm transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold underline ml-4 hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200/80 dark:border-gray-800 pb-3">
          <button
            id="admin-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            id="admin-tab-add"
            onClick={() => {
              setEditingDeal(null);
              setFormData(emptyFormState);
              setActiveTab('add');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{editingDeal ? 'Edit Deal' : 'Add Deal'}</span>
          </button>

          <button
            id="admin-tab-manage"
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Manage Deals ({deals.length})</span>
          </button>

          <button
            id="admin-tab-expired"
            onClick={() => setActiveTab('expired')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'expired'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Expired Deals ({expiredDealsList.length})</span>
          </button>

          <button
            id="admin-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            id="admin-tab-comments"
            onClick={() => {
              setActiveTab('comments');
              fetchComments();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comments &amp; Moderation ({comments.length})</span>
          </button>

          <button
            id="admin-tab-affiliates"
            onClick={() => {
              setActiveTab('affiliates');
              fetchAffiliatesAndConversions();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'affiliates'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-500" />
            <span>Affiliates &amp; Commissions ({affiliatesList.length})</span>
          </button>

          <button
            id="admin-tab-concierge"
            onClick={() => {
              setActiveTab('concierge');
              fetchMembershipsAndRequests();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'concierge'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>VIP Members &amp; Concierge ({dealRequests.length})</span>
            {dealRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            id="admin-tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Total Deals
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1.5 block tabular-nums">
                  {totalDeals}
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Active Deals
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block tabular-nums">
                  {activeDealsList.length}
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                  Expired Deals
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-1.5 block tabular-nums">
                  {expiredDealsList.length}
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  Total Clicks
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400 mt-1.5 block tabular-nums">
                  {totalClicks}
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs col-span-2 sm:col-span-1">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Added This Month
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1.5 block tabular-nums">
                  {dealsAddedThisMonth}
                </span>
              </div>
            </div>

            {/* Quick Actions banner */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Quick Deal Management
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Publish YouTube video partner deals or promo codes in under 60 seconds.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  id="overview-add-deal-btn"
                  onClick={() => {
                    setEditingDeal(null);
                    setFormData(emptyFormState);
                    setActiveTab('add');
                  }}
                  className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Add New Deal</span>
                </button>
                <button
                  onClick={fetchDeals}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-pointer"
                  title="Refresh deals"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Top performing deals preview */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">
                  Top Clicked Affiliate Deals
                </h3>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  View full analytics →
                </button>
              </div>

              {deals.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your deal catalog is empty and ready for your own links!</p>
                  <button
                    onClick={() => {
                      setEditingDeal(null);
                      setFormData(emptyFormState);
                      setActiveTab('add');
                    }}
                    className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-950 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Your First Deal</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase font-bold text-gray-500">
                        <th className="pb-3">Merchant</th>
                        <th className="pb-3">Offer Title</th>
                        <th className="pb-3">Code</th>
                        <th className="pb-3 text-right">Clicks</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {[...deals]
                        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
                        .slice(0, 5)
                        .map((deal) => (
                          <tr key={deal.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                            <td className="py-3 font-bold text-gray-900 dark:text-white">{deal.merchantName}</td>
                            <td className="py-3 text-gray-600 dark:text-gray-300 truncate max-w-xs">{deal.title}</td>
                            <td className="py-3 font-mono text-xs font-bold text-amber-900 dark:text-yellow-400">
                              {deal.couponCode || '—'}
                            </td>
                            <td className="py-3 text-right font-bold text-gray-900 dark:text-white">{deal.clicks || 0}</td>
                            <td className="py-3 text-right">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  deal.published
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {deal.published ? 'Published' : 'Draft'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ADD / EDIT DEAL TAB */}
        {activeTab === 'add' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {editingDeal ? 'Edit Deal' : 'Add New Deal'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter merchant details and paste your affiliate/promo link.
                </p>
              </div>
              {editingDeal && (
                <button
                  onClick={() => {
                    setEditingDeal(null);
                    setFormData(emptyFormState);
                  }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDeal} className="space-y-6">
              {/* Row 1: Merchant Name & Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Store / Merchant Name *
                  </label>
                  <input
                    id="deal-form-merchantName"
                    type="text"
                    required
                    value={formData.merchantName}
                    onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                    placeholder="e.g. NordVPN, Nike, Hostinger"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <LogoUploader
                    value={formData.merchantLogo}
                    onChange={(logo) => setFormData({ ...formData, merchantLogo: logo })}
                    merchantName={formData.merchantName}
                    websiteUrl={formData.affiliateUrl}
                  />
                </div>
              </div>

              {/* Row 2: Deal Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Deal Title / Headline *
                </label>
                <input
                  id="deal-form-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 70% Off 2-Year Plan + 3 Extra Months Free"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Row 3: Discount Amount & Coupon Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Discount Amount / Offer *
                  </label>
                  <input
                    id="deal-form-discount"
                    type="text"
                    required
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="e.g. 20% OFF, $100 OFF, FREE TRIAL"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Coupon / Promo Code (Optional)
                  </label>
                  <input
                    id="deal-form-couponCode"
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                    placeholder="e.g. SAVE70 (leave empty if no code)"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
                    If no code is required, leave blank for direct activation.
                  </span>
                </div>
              </div>

              {/* Row 4: Affiliate / Promo URL (CRITICAL) */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/90 dark:border-amber-900/50">
                <label className="block text-xs font-black uppercase tracking-wider text-amber-900 dark:text-yellow-400 mb-1">
                  Affiliate / Promo Destination URL *
                </label>
                <input
                  id="deal-form-affiliateUrl"
                  type="url"
                  required
                  value={formData.affiliateUrl}
                  onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
                  placeholder="https://merchant.com/?ref=your_affiliate_id"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <span className="text-[11px] text-amber-800/90 dark:text-amber-300 mt-1.5 block">
                  ★ When users click &quot;GET DEAL&quot;, they will be redirected to this exact URL. Validated before saving.
                </span>
              </div>

              {/* Row 5: Schedule / Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    id="deal-form-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Expiration Date
                  </label>
                  <input
                    id="deal-form-expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Leave blank for ongoing</span>
                </div>
              </div>

              {/* Row 6: Description & Terms */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Short Description
                </label>
                <textarea
                  id="deal-form-description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain the perks or what's included in this offer..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  id="deal-form-terms"
                  rows={2}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="e.g. Valid for new subscribers only; excludes certain styles."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Toggles: Featured & Published */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="deal-form-featured"
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Featured Deal (Pin to top grid)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="deal-form-published"
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Published (Visible to public visitors)
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDeal(null);
                    setFormData(emptyFormState);
                    setActiveTab('manage');
                  }}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="deal-form-submit-btn"
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting
                    ? 'Saving Deal...'
                    : editingDeal
                    ? 'Update Deal'
                    : 'Publish Deal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. MANAGE DEALS TAB & 4. EXPIRED DEALS TAB */}
        {(activeTab === 'manage' || activeTab === 'expired') && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs overflow-hidden">
            {/* Table Search and Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/60 dark:bg-gray-900/50">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter store, title, or code..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setEditingDeal(null);
                    setFormData(emptyFormState);
                    setActiveTab('add');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Deal</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {filteredDeals.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">
                No deals match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Store</th>
                      <th className="py-3 px-4">Offer / Discount</th>
                      <th className="py-3 px-4">Coupon Code</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Clicks</th>
                      <th className="py-3 px-4">Expiration</th>
                      <th className="py-3 px-4 text-center">Featured</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredDeals.map((deal) => {
                      const expired = isDealExpired(deal);
                      return (
                        <tr key={deal.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                          {/* Store */}
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {deal.merchantLogo ? (
                                <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                  <img
                                    src={deal.merchantLogo}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-xs font-black text-gray-500 uppercase shrink-0">
                                  {deal.merchantName.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-bold">{deal.merchantName}</span>
                            </div>
                          </td>

                          {/* Offer */}
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-semibold text-gray-900 dark:text-white block truncate" title={deal.title}>
                              {deal.title}
                            </span>
                            <span className="text-xs text-amber-800 dark:text-yellow-400 font-bold block truncate" title={deal.discount}>
                              {deal.discount}
                            </span>
                          </td>

                          {/* Code */}
                          <td className="py-3 px-4 font-mono text-xs font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {deal.couponCode ? (
                              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                {deal.couponCode}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 font-normal">None</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleTogglePublished(deal)}
                              className={`text-xs px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                                expired
                                  ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                                  : deal.published
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                              }`}
                              title="Click to toggle publish status"
                            >
                              {expired ? 'Expired' : deal.published ? 'Published' : 'Draft'}
                            </button>
                          </td>

                          {/* Clicks */}
                          <td className="py-3 px-4 text-center font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {deal.clicks || 0}
                          </td>

                          {/* Expiration */}
                          <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {deal.expirationDate || 'No expiry'}
                          </td>

                          {/* Featured */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggleFeatured(deal)}
                              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                                deal.featured ? 'text-amber-500 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                              }`}
                              title="Toggle featured status"
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open link */}
                              <a
                                href={deal.affiliateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Test destination affiliate URL"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>

                              {/* Edit */}
                              <button
                                id={`edit-deal-${deal.id}`}
                                onClick={() => handleEditClick(deal)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                                title="Edit deal"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                id={`delete-deal-${deal.id}`}
                                onClick={() => setDealToDelete(deal)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Delete deal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">Click Analytics</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Simple overview of clicks generated to your affiliate partner links.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-amber-800 dark:text-yellow-400 uppercase block">Total Clicks Recorded</span>
                  <span className="text-3xl font-black text-amber-950 dark:text-white mt-1 block">{totalClicks}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase block">Average Clicks per Deal</span>
                  <span className="text-3xl font-black text-gray-900 dark:text-white mt-1 block">
                    {deals.length > 0 ? (totalClicks / deals.length).toFixed(1) : 0}
                  </span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase block">Active Deal Count</span>
                  <span className="text-3xl font-black text-emerald-950 dark:text-white mt-1 block">{activeDealsList.length}</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Most Clicked Deals Ranking
              </h3>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                {deals.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No clicks recorded yet. Add deals and share your links to begin tracking!
                  </div>
                ) : (
                  [...deals]
                    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
                    .map((deal, idx) => (
                      <div key={deal.id} className="p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center font-bold text-gray-400 dark:text-gray-500 text-sm">{idx + 1}</span>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{deal.merchantName}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm">{deal.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-base text-gray-900 dark:text-white block">{deal.clicks || 0}</span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">clicks</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. COMMENTS & MODERATION TAB */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Header & Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                    Community Support &amp; Comment Moderation
                  </h2>
                  <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/80 tabular-nums">
                    {comments.length} Comments
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Anonymous feedback, discount code inquiries, and promo reports submitted by visitors on the app.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={fetchComments}
                  disabled={loadingComments}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingComments ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Moderation Policy Quick Banner */}
            <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/50 dark:border-amber-900/40 rounded-2xl text-xs space-y-1.5 text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Moderation Policy Guidelines</span>
              </div>
              <p className="text-amber-900 dark:text-amber-300 leading-relaxed text-[11px]">
                Remove any comment containing profanity, harassment, personal attacks, spam links, scam vouchers, or unauthorized affiliate redirects. Deletions are logged and permanent.
              </p>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Search comments by text, author moniker, or store name..."
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {commentSearch && (
                <button
                  onClick={() => setCommentSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Comments Feed */}
            {loadingComments ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500">Loading comments...</p>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto" />
                <h4 className="font-display text-base font-bold text-gray-900 dark:text-white">
                  {commentSearch ? 'No matching comments found' : 'No comments submitted yet'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {commentSearch
                    ? 'Try searching with different keywords.'
                    : 'When visitors submit questions or code reports in the Support area, they will appear here for review.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 p-5 shadow-xs hover:border-gray-300 dark:hover:border-gray-700 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/50">
                          {comment.name ? comment.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white block">
                            {comment.name || 'Anonymous Scout'}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(comment.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {(comment.merchantName || comment.dealTitle) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-semibold border border-gray-200 dark:border-gray-700">
                            🏷️ {comment.merchantName || comment.dealTitle}
                          </span>
                        )}
                        <button
                          onClick={() => setCommentToDelete(comment)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-200 dark:border-red-900/60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Harmful Comment</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line break-words">
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AFFILIATES & COMMISSIONS TAB */}
        {activeTab === 'affiliates' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-gray-950 font-bold flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                    Affiliate Program &amp; Commission Management
                  </h2>
                  <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-yellow-400 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-amber-300/60 tabular-nums">
                    20% + 10% Recurring Model
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Partners earn 20% commission on a customer&apos;s first promo code use, and 10% recurring on all subsequent purchases.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={fetchAffiliatesAndConversions}
                  disabled={loadingAffiliates}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAffiliates ? 'animate-spin' : ''}`} />
                  <span>Refresh Affiliates</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            {(() => {
              const pendingConversions = conversionsList.filter((c) => c.status === 'pending');
              const approvedConversions = conversionsList.filter((c) => c.status === 'approved' || c.status === 'paid');

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        Registered Affiliates
                      </span>
                      <span className="font-mono text-2xl font-black text-gray-900 dark:text-white mt-1 block">
                        {affiliatesList.length}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border-2 border-amber-400/70 dark:border-amber-500/50 shadow-xs bg-amber-50/20 dark:bg-amber-950/20">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Pending Confirmations
                      </span>
                      <span className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                        {pendingConversions.length}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                        Approved Conversions
                      </span>
                      <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                        {approvedConversions.length}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Confirmed Commissions
                      </span>
                      <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                        ${affiliatesList.reduce((sum, a) => sum + (a.totalEarned || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* PENDING CONVERSIONS AWAITING CONFIRMATION SECTION */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-amber-400/80 dark:border-amber-500/60 shadow-md overflow-hidden">
                    <div className="p-5 border-b border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-400 text-gray-950 font-bold flex items-center justify-center shrink-0 shadow-xs">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                              Pending Conversions Requiring Approval ({pendingConversions.length})
                            </h3>
                            {pendingConversions.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-gray-950 animate-pulse">
                                Action Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            Conversions remain hidden from the promoter until you click <strong>Confirm &amp; Approve</strong>.
                          </p>
                        </div>
                      </div>
                    </div>

                    {pendingConversions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          All caught up! No pending conversions waiting for review.
                        </span>
                        <span className="text-[11px] text-gray-400">
                          When shoppers click affiliate links and use promo codes, conversions will queue here for your confirmation.
                        </span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-amber-50/50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-xs uppercase font-bold border-b border-amber-200/60 dark:border-gray-800">
                            <tr>
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4">Affiliate Code</th>
                              <th className="py-3 px-4">Store &amp; Offer</th>
                              <th className="py-3 px-4 text-center">Tier</th>
                              <th className="py-3 px-4 text-right">Order Basket</th>
                              <th className="py-3 px-4 text-right">Commission ($)</th>
                              <th className="py-3 px-4 text-center">Admin Decision</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 dark:divide-gray-800">
                            {pendingConversions.map((conv) => (
                              <tr key={conv.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors">
                                <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {new Date(conv.timestamp).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-xs font-black text-amber-700 dark:text-yellow-400">
                                  {conv.affiliateCode}
                                </td>
                                <td className="py-3.5 px-4 max-w-xs">
                                  <span className="font-bold text-gray-900 dark:text-white block">{conv.merchantName}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{conv.dealTitle}</span>
                                  {conv.couponCode && (
                                    <span className="inline-block mt-0.5 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300/50">
                                      Code: {conv.couponCode}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  {conv.isFirstUse ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-yellow-400 border border-amber-300/50">
                                      <Award className="w-3 h-3" /> 20% Initial
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
                                      <Repeat className="w-3 h-3" /> 10% Recurring
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                                  ${(conv.orderEstimatedValue || 0).toFixed(2)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  +${conv.commissionAmount.toFixed(2)}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmConversion(conv.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Confirm this conversion, credit promoter, and show in their portal"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Confirm &amp; Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectConversion(conv.id)}
                                      className="px-2.5 py-1.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                      title="Decline this conversion"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Affiliates List Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="font-display text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Affiliate Partner Accounts ({affiliatesList.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={affiliateSearch}
                    onChange={(e) => setAffiliateSearch(e.target.value)}
                    placeholder="Search name, email, or code..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {affiliatesList.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                  No affiliates registered yet. Visitors can join via the Affiliate Program link.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="py-3 px-4">Partner Name &amp; Email</th>
                        <th className="py-3 px-4">Promo Code</th>
                        <th className="py-3 px-4 text-center">Conversions</th>
                        <th className="py-3 px-4 text-right">Lifetime Earned</th>
                        <th className="py-3 px-4 text-right">Pending Balance</th>
                        <th className="py-3 px-4">Payout Info</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {affiliatesList
                        .filter((a) => {
                          if (!affiliateSearch.trim()) return true;
                          const q = affiliateSearch.toLowerCase();
                          return (
                            a.name.toLowerCase().includes(q) ||
                            a.email.toLowerCase().includes(q) ||
                            a.affiliateCode.toLowerCase().includes(q)
                          );
                        })
                        .map((aff) => (
                          <tr key={aff.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                            <td className="py-3 px-4">
                              <span className="font-bold text-gray-900 dark:text-white block">{aff.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono block">{aff.email}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs font-bold text-amber-900 dark:text-yellow-400">
                              <span className="bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300/50">
                                {aff.affiliateCode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-gray-900 dark:text-white">
                              {aff.totalConversions || 0}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ${(aff.totalEarned || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              ${(aff.pendingBalance || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-gray-600 dark:text-gray-300">
                              <span className="uppercase text-[10px] font-bold text-gray-400 block">{aff.payoutMethod || 'paypal'}</span>
                              <span>{aff.payoutDetails || aff.email}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                {aff.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Confirmed Conversions Log Table */}
            {(() => {
              const confirmedList = conversionsList.filter((c) => c.status !== 'pending');

              return (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Confirmed Promo Code Conversions &amp; Payout Log ({confirmedList.length})
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Approved conversions visible to promoters with commission credited.
                      </p>
                    </div>
                  </div>

                  {confirmedList.length === 0 ? (
                    <div className="text-center py-10 text-xs text-gray-500">
                      No confirmed conversions yet. Click &quot;Confirm &amp; Approve&quot; in the section above to approve pending conversions.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Affiliate Code</th>
                            <th className="py-3 px-4">Store &amp; Deal</th>
                            <th className="py-3 px-4 text-center">Tier</th>
                            <th className="py-3 px-4 text-right">Basket ($)</th>
                            <th className="py-3 px-4 text-right">Commission ($)</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {confirmedList.map((conv) => (
                            <tr key={conv.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                              <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {new Date(conv.timestamp).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 font-mono text-xs font-bold text-amber-900 dark:text-yellow-400">
                                {conv.affiliateCode}
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <span className="font-bold text-gray-900 dark:text-white block">{conv.merchantName}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{conv.dealTitle}</span>
                                {conv.couponCode && (
                                  <span className="inline-block mt-0.5 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50">
                                    Code: {conv.couponCode}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {conv.isFirstUse ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-yellow-400 border border-amber-300/50">
                                    <Award className="w-3 h-3" /> 20% Initial
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
                                    <Repeat className="w-3 h-3" /> 10% Recurring
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
                                <span
                                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    conv.status === 'paid'
                                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                      : conv.status === 'rejected'
                                      ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  }`}
                                >
                                  {conv.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {conv.status === 'approved' ? (
                                  <button
                                    onClick={() => handleMarkConversionPaid(conv.id)}
                                    className="px-2.5 py-1 text-xs font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
                                  >
                                    Mark Paid
                                  </button>
                                ) : conv.status === 'paid' ? (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Paid Out</span>
                                ) : (
                                  <span className="text-xs text-red-500 font-semibold">Declined</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 7. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Admin & Security Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Owner account validation, security rules, and clean slate tools.
              </p>
            </div>

            {/* Owner Email Check */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-gray-900 dark:text-white">Authorized Owner Account</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Only the registered Google Account administrator can access the dashboard and modify deals:
              </p>
              <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span>●●●●●●●●●●●●●● (Admin Account Active)</span>
                <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-300">Protected</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                To update the owner email, change the <code className="font-mono">OWNER_EMAIL</code> environment variable.
              </span>
            </div>

            {/* Payment Gateway & Bank Payouts Configuration */}
            <div className="p-5 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-950/30 dark:via-gray-800 dark:to-gray-800 rounded-xl border border-amber-300 dark:border-amber-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  Payment Gateway &amp; Direct Bank Payouts
                </h3>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                <p>
                  <strong>Where does the money go?</strong> When users subscribe to DealScout VIP, payments process through your merchant gateway (such as <strong>Stripe</strong> or <strong>PayPal</strong>).
                </p>
                <p>
                  <strong>How do you get it?</strong> Stripe and PayPal automatically transfer funds directly into your linked personal or business bank account on a regular schedule (daily or weekly).
                </p>
              </div>

              <form onSubmit={handleSavePaymentSettings} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Stripe / PayPal Payment Link — Monthly ($20/mo)
                  </label>
                  <input
                    type="url"
                    value={stripeMonthlyUrl}
                    onChange={(e) => setStripeMonthlyUrl(e.target.value)}
                    placeholder="https://buy.stripe.com/... or https://paypal.me/..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Create a $20 recurring payment link on dashboard.stripe.com/payment-links
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Stripe / PayPal Payment Link — Yearly ($216/yr)
                  </label>
                  <input
                    type="url"
                    value={stripeYearlyUrl}
                    onChange={(e) => setStripeYearlyUrl(e.target.value)}
                    placeholder="https://buy.stripe.com/... or https://paypal.me/..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Create a $216 recurring yearly payment link (10% discount)
                  </span>
                </div>

                {payoutSaveNotice && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold">
                    {payoutSaveNotice}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Save Payment Gateway Links
                </button>
              </form>
            </div>

            {/* Database connection test */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">Firestore Cloud Database</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                  Connected
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Database ID: <code className="font-mono text-gray-800 dark:text-gray-200">ai-studio-f3cdf1ae-cb17-4c6e-8696-bd58f39ed6ad</code>
              </p>
            </div>

            {/* Security Rules Status */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-gray-900 dark:text-white">Firestore Security Rules Status</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Rules enforced: Read-only access for public visitors on published deals.
                Create, update, delete, and unpublish operations restricted exclusively to the verified administrator account.
              </p>
            </div>

            {/* Clear All Deals (Clean Slate) */}
            <div className="p-4 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 space-y-3">
              <div>
                <h4 className="font-bold text-sm text-red-950 dark:text-red-300">Remove All Deals (Start Fresh)</h4>
                <p className="text-xs text-red-800 dark:text-red-400 mt-0.5">
                  Wipe all deals currently in the Firestore database so you can start adding your own affiliate links and promo codes from scratch.
                </p>
              </div>
              <button
                onClick={handleClearAllDeals}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove All Deals Now</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete the deal{' '}
              <strong className="text-gray-900 dark:text-white">&quot;{dealToDelete.title}&quot;</strong> for{' '}
              <strong className="text-gray-900 dark:text-white">{dealToDelete.merchantName}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDealToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Delete Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Harmful Comment Confirmation Modal */}
      {commentToDelete && (
        <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Remove Comment?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Moderator Action
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/70 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 italic max-h-28 overflow-y-auto">
              &quot;{commentToDelete.text}&quot;
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Are you sure you want to permanently remove this comment from {commentToDelete.name || 'Anonymous Scout'} in accordance with the Comment Moderation Policy?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCommentToDelete(null)}
                disabled={deletingCommentId !== null}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCommentConfirm}
                disabled={deletingCommentId !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {deletingCommentId ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
