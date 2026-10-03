import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Crown,
  Tag,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Membership, DealRequest } from '../types';
import { submitDealRequest, getUserDealRequests } from '../services/membershipService';

interface DealConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  membership: Membership | null;
  onOpenMembership: () => void;
}

export const DealConciergeModal: React.FC<DealConciergeModalProps> = ({
  isOpen,
  onClose,
  membership,
  onOpenMembership,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'request' | 'my_requests'>('request');
  const [productOrStore, setProductOrStore] = useState('');
  const [targetBudget, setTargetBudget] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [userEmail, setUserEmail] = useState(currentUser?.email || membership?.email || '');
  const [userName, setUserName] = useState(currentUser?.displayName || membership?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [myRequests, setMyRequests] = useState<DealRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isMember = membership && membership.status === 'active';

  // Fetch requests when tab changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    const emailToFetch = currentUser?.email || membership?.email || userEmail;
    if (emailToFetch) {
      setLoadingRequests(true);
      getUserDealRequests(emailToFetch)
        .then((reqs) => setMyRequests(reqs))
        .catch(() => {})
        .finally(() => setLoadingRequests(false));
    }
  }, [isOpen, currentUser, membership, userEmail, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = (currentUser?.email || membership?.email || userEmail).trim().toLowerCase();
    if (!email) {
      setErrorMessage('Please enter your email so we can notify you when we find your deal.');
      return;
    }

    if (!productOrStore.trim()) {
      setErrorMessage('Please tell us what product, brand, or store you want a deal for.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitDealRequest({
        userId: currentUser?.uid || 'user_' + email.replace(/[^a-z0-9]/g, '_'),
        userEmail: email,
        userName: currentUser?.displayName || userName || email.split('@')[0],
        productOrStore,
        targetBudget,
        productUrl,
        notes,
      });

      setMyRequests((prev) => [created, ...prev]);
      setSuccessNotice(`Request submitted! Our deal scouts will search for "${productOrStore}" and send you verified promo codes.`);
      setProductOrStore('');
      setTargetBudget('');
      setProductUrl('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit deal request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-amber-50/60 dark:bg-amber-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-gray-950 flex items-center justify-center font-bold shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-lg text-gray-900 dark:text-white uppercase tracking-tight">
                  Personal Deal Concierge
                </h3>
                {isMember ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-gray-950 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> VIP Feature
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    VIP Preview
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Ask us to find deals for you for whatever you want!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 shrink-0 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'request'
                ? 'border-amber-400 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Submit New Deal Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_requests')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'my_requests'
                ? 'border-amber-400 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>My Requests</span>
            {myRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-gray-950 font-black">
                {myRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'request' ? (
            !isMember ? (
              /* Non-member Teaser */
              <div className="text-center py-6 px-4 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-400/30">
                  <Crown className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-display font-black text-xl text-gray-900 dark:text-white">
                    Unlock Personal Deal Hunting
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Our team of expert scouts actively researches, negotiates, and uncovers exclusive promo codes for whatever you want to buy. This concierge service is included with your VIP Membership.
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="font-bold text-gray-900 dark:text-white">
                    What VIP Members Get:
                  </div>
                  <ul className="space-y-1.5 text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Unlimited personal requests for any store, sneaker, gadget, or service</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Constant updates &amp; instant alerts on flash price drops</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>$20 / month or save 10% on the yearly plan ($216/yr)</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onOpenMembership}
                  className="w-full max-w-md py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
                >
                  Join VIP Club
                </button>
              </div>
            ) : (
              /* Member Request Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {successNotice && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{successNotice}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('my_requests')}
                        className="text-emerald-700 dark:text-emerald-400 underline font-semibold mt-1 block"
                      >
                        View status in &quot;My Requests&quot; tab →
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    What item or store are you shopping for? *
                  </label>
                  <input
                    type="text"
                    value={productOrStore}
                    onChange={(e) => setProductOrStore(e.target.value)}
                    placeholder="e.g. MacBook Pro M3, Nike Tech Fleece, Sephora skincare, Delta flights"
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Target Budget / Max Price
                    </label>
                    <input
                      type="text"
                      value={targetBudget}
                      onChange={(e) => setTargetBudget(e.target.value)}
                      placeholder="e.g. Under $250 or 20%+ off"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Product / Store Link (optional)
                    </label>
                    <input
                      type="url"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://store.com/item..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Specific Notes (Size, Color, Urgency)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tell us any specifics like sizes, acceptable colors, bundle requirements, or deadline..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-gray-950" />
                  )}
                  <span>Submit Deal Request to Scout Team</span>
                </button>
              </form>
            )
          ) : (
            /* My Requests List Tab */
            <div className="space-y-4">
              {loadingRequests ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  Loading your deal requests...
                </div>
              ) : myRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 space-y-2">
                  <Search className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="font-bold text-gray-700 dark:text-gray-300">
                    No deal requests submitted yet
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Tell us what you want to buy, and our team will scout verified coupon codes and retailer markdowns for you!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('request')}
                    className="mt-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Submit a Request
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                            {req.productOrStore}
                          </h4>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                            Submitted on {new Date(req.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            req.status === 'deal_found'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : req.status === 'researching'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {req.status === 'deal_found'
                            ? 'Deal Found 🎉'
                            : req.status === 'researching'
                            ? 'Scouting Deals 🔍'
                            : 'In Queue ⏳'}
                        </span>
                      </div>

                      {req.targetBudget && (
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          <strong className="text-gray-800 dark:text-gray-200">Budget:</strong> {req.targetBudget}
                        </div>
                      )}

                      {/* Admin Response Box */}
                      {req.adminResponse && (
                        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Deal Scout Response:</span>
                          </div>
                          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                            {req.adminResponse}
                          </p>

                          {/* Found Coupon Code */}
                          {req.foundCouponCode && (
                            <div className="pt-1 flex items-center gap-2">
                              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                                Code:
                              </span>
                              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 font-mono font-bold text-xs text-amber-600 dark:text-yellow-400">
                                <span>{req.foundCouponCode}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(req.foundCouponCode!)}
                                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer ml-1"
                                  title="Copy promo code"
                                >
                                  {copiedCode === req.foundCouponCode ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Direct Deal Link */}
                          {req.foundDealUrl && (
                            <div className="pt-1">
                              <a
                                href={req.foundDealUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <span>Open Verified Deal Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
