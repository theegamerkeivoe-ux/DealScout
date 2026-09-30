import React from 'react';
import { Tag, ShieldCheck, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
  onOpenLegal: (type: 'privacy' | 'terms' | 'support') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200/80 dark:border-gray-800/80 pt-12 pb-8 text-gray-500 dark:text-gray-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-gray-950 font-bold shadow-xs">
                <Tag className="w-4 h-4 -rotate-45" />
              </div>
              <span className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white">
                Deal<span className="text-amber-500 dark:text-amber-400">Scout</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Find verified coupon codes, exclusive promo discounts, and seasonal offers from top brands. Hand-tested and curated for viewers.
            </p>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/80 p-3 rounded-xl border border-gray-200/80 dark:border-gray-800 leading-relaxed">
              <strong className="text-gray-800 dark:text-gray-200 font-semibold block mb-0.5">
                Affiliate Disclosure:
              </strong>
              When you click our links and make a purchase, we may earn an affiliate commission at no extra cost to you.
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3.5">
              Explore Deals
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  All Verified Deals
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Latest Promo Codes
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

          {/* Community Support Col */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3.5">
              Community Support
            </h4>
            <div className="bg-amber-500/5 dark:bg-gray-900/80 p-4 rounded-2xl border border-amber-300/40 dark:border-amber-900/30 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold">
                <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Anonymous Support</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Found an expired discount or have questions? Post anonymously right here in the app!
              </p>
              <button
                type="button"
                onClick={() => onOpenLegal('support')}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Open Community Support</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Admin Access Col */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3.5">
              Administration
            </h4>
            <div className="space-y-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  onNavigate('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 font-bold transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Admin Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('affiliates');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-900 dark:text-yellow-400 font-bold transition-all cursor-pointer"
              >
                <span className="text-amber-500">🎁</span>
                <span>Affiliate Program (20% + 10%)</span>
              </button>
              <p className="text-gray-400 dark:text-gray-500 text-[11px] leading-relaxed">
                Publish new affiliate codes, manage deals, and moderate comments.
              </p>
            </div>
          </div>
        </div>

        {/* Sleek bottom bar */}
        <div className="pt-6 border-t border-gray-200/80 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex flex-wrap items-center gap-5">
            <span>&copy; {new Date().getFullYear()} Deal Scout</span>
            <span aria-hidden="true">&bull;</span>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">&bull;</span>
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              Terms of Service
            </button>
            <span aria-hidden="true">&bull;</span>
            <button
              type="button"
              onClick={() => onOpenLegal('support')}
              className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              Community Support
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Curated &amp; Tested for Viewers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
