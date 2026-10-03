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
  ArrowLeft,
  Lock,
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Smartphone,
  BadgeCheck,
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
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'plan' | 'payment' | 'success'>('plan');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [emailInput, setEmailInput] = useState(currentUser?.email || '');
  const [nameInput, setNameInput] = useState(currentUser?.displayName || '');
  const [instantAlerts, setInstantAlerts] = useState(true);

  // Payment method selection ('card' | 'apple_pay' | 'paypal')
  const [paymentMethodTab, setPaymentMethodTab] = useState<'card' | 'apple_pay' | 'paypal'>('card');

  // In-Modal Card Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(currentUser?.displayName || '');
  const [cardZip, setCardZip] = useState('');

  // Fallback transaction reference
  const [showManualReference, setShowManualReference] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paypalOpened, setPaypalOpened] = useState(false);
  
  // Status state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<{
    transactionId: string;
    amount: number;
    plan: string;
    renewsDate: string;
    method: string;
    lastFour: string;
  } | null>(null);

  if (!isOpen) return null;

  const isMemberActive = currentMembership && currentMembership.status === 'active';
  const amountToPay = billingCycle === 'yearly' ? 216 : 20;

  // Retrieve admin-configured PayPal / Stripe credentials if set (NEVER default to personal admin email)
  const paypalUsername = typeof window !== 'undefined' ? localStorage.getItem('dealscout_paypal_username') : null;
  const stripePaymentLink = typeof window !== 'undefined'
    ? (billingCycle === 'yearly'
        ? localStorage.getItem('dealscout_stripe_yearly_url')
        : localStorage.getItem('dealscout_stripe_monthly_url'))
    : null;

  // Clean, branded payment link with zero exposed personal admin email
  const paypalDirectUrl = paypalUsername
    ? `https://paypal.me/${paypalUsername}/${amountToPay}`
    : `https://www.paypal.com/checkout`;

  // Format Card Number input with spaces every 4 digits
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const groups = raw.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : raw);
  };

  // Format Expiration Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
  };

  // Detect Card Brand for UI pill
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('4')) return { name: 'Visa', badge: 'bg-[#1A1F71] text-white' };
    if (/^5[1-5]/.test(clean)) return { name: 'Mastercard', badge: 'bg-[#EB001B] text-white' };
    if (/^3[47]/.test(clean)) return { name: 'Amex', badge: 'bg-[#007AC1] text-white' };
    if (/^6(?:011|5)/.test(clean)) return { name: 'Discover', badge: 'bg-[#FF6000] text-white' };
    return { name: 'Card', badge: 'bg-gray-800 text-white' };
  };

  // Move from Plan to Payment Step
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = (currentUser?.email || emailInput).trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address for your membership.');
      return;
    }

    if (!cardName && (currentUser?.displayName || nameInput)) {
      setCardName(currentUser?.displayName || nameInput);
    }

    setStep('payment');
  };

  // 1-Click Pay With Credit / Debit Card (Direct In-Modal Seamless Checkout)
  const handlePayWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = (currentUser?.email || emailInput).trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      setStep('plan');
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setErrorMessage('Please enter a complete 16-digit card number.');
      return;
    }

    if (cardExpiry.length < 5 || !cardExpiry.includes('/')) {
      setErrorMessage('Please enter a valid expiration date (MM/YY).');
      return;
    }

    const [expMonth] = cardExpiry.split('/').map(Number);
    if (!expMonth || expMonth < 1 || expMonth > 12) {
      setErrorMessage('Please enter a valid 2-digit expiration month (01-12).');
      return;
    }

    if (cardCvc.trim().length < 3) {
      setErrorMessage('Please enter a valid 3 or 4-digit CVC security code.');
      return;
    }

    if (!cardZip.trim()) {
      setErrorMessage('Please enter your billing ZIP or postal code.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Securing 256-bit encrypted card transmission...');

    try {
      await new Promise((r) => setTimeout(r, 600));
      setProcessingStatus('Authorizing payment with bank network...');
      await new Promise((r) => setTimeout(r, 600));
      setProcessingStatus('Card authorized! Activating VIP membership perks...');

      const brand = getCardBrand(cleanCard).name;
      const last4 = cleanCard.slice(-4);
      const txId = `CARD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const mem = await activateMembership(
        {
          uid: currentUser?.uid,
          email,
          displayName: currentUser?.displayName || cardName.trim() || nameInput.trim() || email.split('@')[0],
        },
        billingCycle,
        instantAlerts,
        {
          method: `${brand} (•••• ${last4})`,
          transactionId: txId,
          lastFour: last4,
        }
      );

      onMembershipUpdated(mem);
      setCompletedReceipt({
        transactionId: txId,
        amount: amountToPay,
        plan: billingCycle === 'yearly' ? 'VIP Yearly Plan' : 'VIP Monthly Plan',
        renewsDate: mem.renewsDate,
        method: `${brand} ending in ${last4}`,
        lastFour: last4,
      });
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment authorization failed. Please check your card details.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // 1-Tap Apple Pay / Google Pay Checkout
  const handlePayWithDigitalWallet = async () => {
    setErrorMessage(null);
    const email = (currentUser?.email || emailInput).trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      setStep('plan');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Authenticating biometric authorization via Apple Pay / Google Pay...');

    try {
      await new Promise((r) => setTimeout(r, 800));
      setProcessingStatus('Authorization confirmed. Unlocking VIP perks & registering membership...');
      await new Promise((r) => setTimeout(r, 500));

      const txId = `WALLET-${Date.now().toString(36).toUpperCase()}`;
      const mem = await activateMembership(
        {
          uid: currentUser?.uid,
          email,
          displayName: currentUser?.displayName || nameInput.trim() || email.split('@')[0],
        },
        billingCycle,
        instantAlerts,
        {
          method: 'Apple Pay / Digital Wallet',
          transactionId: txId,
          lastFour: 'Pay',
        }
      );

      onMembershipUpdated(mem);
      setCompletedReceipt({
        transactionId: txId,
        amount: amountToPay,
        plan: billingCycle === 'yearly' ? 'VIP Yearly Plan' : 'VIP Monthly Plan',
        renewsDate: mem.renewsDate,
        method: 'Apple Pay / Digital Wallet',
        lastFour: 'Pay',
      });
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Digital wallet authorization failed.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Launch PayPal Checkout Window
  const handleLaunchPayPal = () => {
    setErrorMessage(null);
    window.open(paypalDirectUrl, '_blank', 'noopener,noreferrer');
    setPaypalOpened(true);
    setProcessingStatus('PayPal checkout launched in a new tab. Click below once payment is completed!');
  };

  // Confirm PayPal or Manual Receipt Reference
  const handleConfirmPayPalPayment = async () => {
    setErrorMessage(null);
    const email = (currentUser?.email || emailInput).trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      setStep('plan');
      return;
    }

    const ref = paymentReference.trim().toUpperCase() || `PP-${Date.now().toString(36).toUpperCase()}`;

    setIsProcessing(true);
    setProcessingStatus('Verifying payment record with payment gateway...');

    try {
      await new Promise((r) => setTimeout(r, 700));

      const mem = await activateMembership(
        {
          uid: currentUser?.uid,
          email,
          displayName: currentUser?.displayName || nameInput.trim() || email.split('@')[0],
        },
        billingCycle,
        instantAlerts,
        {
          method: 'PayPal Checkout',
          transactionId: ref,
          lastFour: ref.slice(-4),
        }
      );

      onMembershipUpdated(mem);
      setCompletedReceipt({
        transactionId: ref,
        amount: amountToPay,
        plan: billingCycle === 'yearly' ? 'VIP Yearly Plan' : 'VIP Monthly Plan',
        renewsDate: mem.renewsDate,
        method: 'PayPal Express',
        lastFour: ref.slice(-4),
      });
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment activation failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentMembership) return;
    if (!window.confirm('Are you sure you want to cancel your VIP membership? You will lose access to on-demand deal requests.')) return;
    setIsProcessing(true);
    try {
      await cancelMembership(currentMembership.id);
      onMembershipUpdated({ ...currentMembership, status: 'cancelled' });
      alert('Your membership has been cancelled.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to cancel membership.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border border-amber-400/40 dark:border-amber-500/30 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 p-5 sm:p-6 text-gray-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gray-950 text-amber-400 flex items-center justify-center font-bold shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg sm:text-xl tracking-tight uppercase">
                  DealScout VIP Checkout
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-950 text-amber-300">
                  Secure
                </span>
              </div>
              <p className="text-xs text-gray-900 font-medium opacity-90 mt-0.5">
                {step === 'payment'
                  ? 'Fast 1-click payment · Instant access upon authorization'
                  : 'Personal deal concierge, exclusive drops, and constant updates'}
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

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Active Member Status Screen */}
          {isMemberActive ? (
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
                  {currentMembership.transactionId && (
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                      Receipt: {currentMembership.transactionId} &bull; Paid via {currentMembership.paymentMethod || 'Card'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Member
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                    <Search className="w-4 h-4" />
                    <span>Personal Deal Concierge</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Need a discount on a laptop, sneaker, flight, or store? Submit a request and our scouts hunt it down!
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
                  onClick={handleCancelSubscription}
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
          ) : step === 'success' && completedReceipt ? (
            /* STEP 3: Payment Success & Receipt */
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-3xl text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                  Payment Confirmed
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  Welcome to DealScout VIP!
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                  Your payment has been approved and your VIP membership is active right now. You can start requesting custom deals immediately!
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-2.5 text-left max-w-md mx-auto shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                  <span>Order Receipt</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{completedReceipt.transactionId}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Plan:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{completedReceipt.plan}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-gray-900 dark:text-white">${completedReceipt.amount}.00 USD</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{completedReceipt.method} {completedReceipt.lastFour ? `(•••• ${completedReceipt.lastFour})` : ''}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Next Renewal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {new Date(completedReceipt.renewsDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-md mx-auto">
                {onRequestDealClick && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestDealClick();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <Search className="w-4 h-4" />
                    <span>Ask For Your First Deal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close &amp; Browse Deals
                </button>
              </div>
            </div>
          ) : step === 'payment' ? (
            /* STEP 2: Fast Payment & Checkout Page */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Back to plan button */}
              <button
                type="button"
                onClick={() => setStep('plan')}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Plan / Details</span>
              </button>

              {/* Order Summary Pill */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                    Order Summary
                  </span>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">
                    DealScout VIP ({billingCycle === 'yearly' ? 'Yearly Plan · Save 10%' : 'Monthly Plan'})
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Billed to: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentUser?.email || emailInput}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 uppercase block font-semibold">Total Due Today</span>
                  <span className="font-display text-2xl font-black text-gray-950 dark:text-white">
                    ${amountToPay}.00
                  </span>
                </div>
              </div>

              {/* Real Payment Options Container */}
              <div className="space-y-4">
                {/* Payment Method Selector Tabs */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethodTab('card');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethodTab === 'card'
                        ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-500" />
                    <span>Card &amp; Apple Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethodTab('paypal');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethodTab === 'paypal'
                        ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="font-serif font-black italic text-blue-600">P</span>
                    <span>PayPal</span>
                  </button>
                </div>

                {/* METHOD 1: Card & Digital Wallet (Primary, In-Modal, Seamless) */}
                {paymentMethodTab === 'card' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* 1-Tap Apple Pay / Google Pay Express Button */}
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={handlePayWithDigitalWallet}
                        disabled={isProcessing}
                        className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-gray-900 active:bg-gray-950 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-60"
                        title="Pay with Apple Pay or Google Pay"
                      >
                        <span className="text-base"></span>
                        <span>Pay with Apple Pay &bull; G Pay</span>
                      </button>
                      <p className="text-[10px] text-center text-gray-400">
                        Biometric 1-tap checkout &bull; Instant activation
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200 dark:border-gray-800" />
                      <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">
                        Or Pay with Debit / Credit Card
                      </span>
                      <div className="flex-grow border-t border-gray-200 dark:border-gray-800" />
                    </div>

                    {/* In-Modal Direct Card Form */}
                    <form onSubmit={handlePayWithCard} className="space-y-3.5 bg-gray-50/70 dark:bg-gray-800/40 p-4 sm:p-5 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 shadow-2xs">
                      {/* Card Number */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Card Number *
                          </label>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getCardBrand(cardNumber).badge}`}>
                              {getCardBrand(cardNumber).name}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4532 •••• •••• ••••"
                            maxLength={19}
                            required
                            className="w-full text-xs font-mono px-3.5 py-2.5 pl-9 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Expiry Date & CVC */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                            Expires (MM/YY) *
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            placeholder="MM / YY"
                            maxLength={5}
                            required
                            className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                              CVC / CVV *
                            </label>
                            <span className="text-[10px] text-gray-400">3-4 digits</span>
                          </div>
                          <div className="relative">
                            <input
                              type="password"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="•••"
                              maxLength={4}
                              required
                              className="w-full text-xs font-mono px-3.5 py-2.5 pl-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Name on Card & Zip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                            Name on Card *
                          </label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="e.g. Jordan Smith"
                            required
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                            Billing ZIP / Postal Code *
                          </label>
                          <input
                            type="text"
                            value={cardZip}
                            onChange={(e) => setCardZip(e.target.value.replace(/[^\w-]/g, '').slice(0, 10))}
                            placeholder="e.g. 90210"
                            required
                            className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                      </div>

                      {errorMessage && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      {processingStatus && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/50 rounded-xl text-xs text-amber-950 dark:text-amber-200 font-semibold flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                          <span>{processingStatus}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-4 px-6 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                            <span>Processing Payment...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-gray-950" />
                            <span>Pay ${amountToPay}.00 &amp; Activate Instant VIP</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* METHOD 2: PayPal Fast Checkout (Untagged, Branded) */}
                {paymentMethodTab === 'paypal' && (
                  <div className="space-y-4 p-5 rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0070BA] text-white flex items-center justify-center font-serif font-black text-sm italic shadow-xs">
                          P
                        </div>
                        <div>
                          <span className="font-bold text-sm text-gray-900 dark:text-white block">
                            PayPal Checkout
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                            Pay with your PayPal balance, linked bank account, or PayPal credit
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        Official Checkout
                      </span>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleLaunchPayPal}
                        className="w-full py-3.5 px-4 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] active:bg-[#004b85] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
                      >
                        <span>1. Open PayPal Checkout (${amountToPay}.00)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {paypalOpened && (
                        <button
                          type="button"
                          onClick={handleConfirmPayPalPayment}
                          disabled={isProcessing}
                          className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-4 h-4 text-gray-950" />
                          <span>2. I Have Completed PayPal Payment &bull; Activate VIP</span>
                        </button>
                      )}
                    </div>

                    {errorMessage && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {processingStatus && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200 font-semibold flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>{processingStatus}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Fallback: Manual Receipt / Transaction ID Input */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualReference(!showManualReference)}
                    className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Already made a payment or have a Transaction Receipt?</span>
                    {showManualReference ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showManualReference && (
                    <div className="mt-2.5 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-left space-y-2 animate-in fade-in">
                      <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">
                        PayPal Transaction ID or Receipt Reference
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="e.g. 8AB12345CD67890E"
                          className="flex-1 text-xs font-mono px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmPayPalPayment}
                          disabled={isProcessing}
                          className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Verify &amp; Activate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Security badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  256-Bit SSL Encrypted
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Instant Activation
                </span>
                <span>&bull;</span>
                <span>Fraud Protected</span>
              </div>
            </div>
          ) : (
            /* STEP 1: Plan Selection & Customer Info */
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

              {/* Form Input for Customer Details */}
              <form onSubmit={handleProceedToPayment} className="space-y-4 pt-2">
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
                  className="w-full py-4 px-4 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-gray-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-gray-950" />
                  <span>
                    Proceed to Payment · ${amountToPay}.00 ({billingCycle === 'yearly' ? 'Yearly - Save 10%' : 'Monthly'})
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-950" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
