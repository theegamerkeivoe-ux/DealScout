import React from 'react';
import { X, Shield, FileText, MessageSquare } from 'lucide-react';
import { SupportSection } from './SupportSection';
import { Deal } from '../types';

interface LegalModalProps {
  type: 'privacy' | 'terms' | 'support' | null;
  onClose: () => void;
  deals?: Deal[];
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose, deals = [] }) => {
  if (!type) return null;

  return (
    <div
      id="legal-modal-overlay"
      className="fixed inset-0 z-50 bg-gray-950/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="legal-modal-content"
        className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          type === 'support' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-950/70 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {type === 'privacy' && <Shield className="w-5 h-5 text-amber-500" />}
            {type === 'terms' && <FileText className="w-5 h-5 text-amber-500" />}
            {type === 'support' && <MessageSquare className="w-5 h-5 text-amber-500" />}
            <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
              {type === 'privacy' && 'Privacy Policy'}
              {type === 'terms' && 'Terms of Service'}
              {type === 'support' && 'Community Support & Comments'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {type === 'privacy' && (
            <>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Last updated: September 2026
                </p>
                <p>
                  Welcome to <strong>Deal Scout</strong>. We respect your privacy and are committed
                  to transparency regarding any information collected when you browse verified deals
                  and promo codes on our platform.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  1. Information We Collect
                </h3>
                <p>
                  Deal Scout is designed for frictionless browsing without requiring viewer registration
                  or personal accounts. We do not collect names, phone numbers, or private emails from
                  general visitors. We only record anonymous aggregate usage metrics (such as click
                  counters on deal links) to identify which discounts are most popular.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  2. Affiliate Links &amp; External Merchant Sites
                </h3>
                <p>
                  When you click a &quot;GET DEAL&quot; link or copy a promo code, you are redirected
                  to third-party merchant platforms. These external stores maintain their own independent
                  privacy policies and tracking cookies to attribute orders. Deal Scout does not control
                  or store any financial, payment, or shipping information entered on external websites.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  3. Cookies &amp; Local Storage
                </h3>
                <p>
                  We use minimal local browser storage strictly for essential interface preferences, such
                  as preserving your light or dark mode theme selection.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  4. Anonymous Support &amp; Community Comments
                </h3>
                <p className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                  <strong>Need help or found an expired deal?</strong> You can post anonymously directly on the app
                  in our Community Support section. No email or login is required. To keep the community clean and safe,
                  all comments are subject to our active Comment Moderation Policy.
                </p>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Last updated: September 2026
                </p>
                <p>
                  By accessing and using <strong>Deal Scout</strong>, you agree to these Terms of
                  Service. If you do not agree with any part of these terms, please do not use the service.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  1. Nature of the Service
                </h3>
                <p>
                  Deal Scout aggregates, curates, and shares promotional discount codes, coupon vouchers,
                  and affiliate links provided by merchants. Deal Scout is not a seller, manufacturer,
                  or distributor of the products featured.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  2. Coupon Code Accuracy &amp; Disclaimer
                </h3>
                <p>
                  While our team actively verifies codes and expiration dates, merchants reserve the right
                  to alter, expire, or limit promotional campaigns without prior notice. Deals are provided
                  on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind.
                  Always verify final cart prices and terms on the merchant&apos;s checkout page prior to purchase.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  3. FTC Affiliate Disclosure
                </h3>
                <p>
                  Some links featured on Deal Scout are affiliate links. If you click through and finalize
                  a purchase, Deal Scout may receive a referral commission at absolutely zero additional
                  cost to you. This helps support our work and keeps deal curation active for everyone.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  4. Intellectual Property &amp; Trademarks
                </h3>
                <p>
                  All merchant brand names, logos, and trademarks displayed remain the property of their
                  respective copyright owners. Their appearance does not imply endorsement by or affiliation
                  with Deal Scout beyond standard affiliate partnership programs.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  5. Community Support &amp; Moderation Policy
                </h3>
                <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                  For support, reporting expired codes, or inquiries, visitors can post anonymously via Community Support.
                  All submissions are governed by our Comment Moderation Policy. Deal Scout administrators reserve the right
                  to remove any comment deemed harmful, abusive, fraudulent, or harassing.
                </p>
              </div>
            </>
          )}

          {type === 'support' && (
            <SupportSection deals={deals} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

