import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check, Copy, MessageCircle, Mail, ExternalLink, X } from 'lucide-react';
import { Deal } from '../types';
import { getDealShareUrl } from '../utils/shareUtils';

interface ShareButtonProps {
  deal: Deal;
  variant?: 'card' | 'modal' | 'header';
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  deal,
  variant = 'card',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const shareUrl = getDealShareUrl(deal);
  const shareText = `Check out this deal for ${deal.merchantName}: ${deal.discount || deal.title}!`;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${deal.merchantName} Deal - DealScout`,
          text: shareText,
          url: shareUrl,
        });
        setIsOpen(false);
        return;
      } catch (err: any) {
        // If aborted by user, do nothing
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback if not available or failed: copy link
    handleCopyLink();
  };

  const handleSocialShare = (platform: 'whatsapp' | 'twitter' | 'email', e: React.MouseEvent) => {
    e.stopPropagation();
    let url = '';

    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    } else if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'email') {
      const subject = encodeURIComponent(`Great deal on ${deal.merchantName}`);
      const body = encodeURIComponent(
        `Hey!\n\nI thought you might like this deal for ${deal.merchantName}:\n\n${deal.title}\nOffer: ${deal.discount}\n${deal.couponCode ? `Coupon Code: ${deal.couponCode}\n` : ''}\nCheck it out here:\n${shareUrl}\n\nFound on DealScout`
      );
      url = `mailto:?subject=${subject}&body=${body}`;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsOpen(false);
    }
  };

  const toggleDropdown = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // On mobile devices with navigator.share, trigger native share directly for the smoothest mobile UX
    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth < 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: `${deal.merchantName} - ${deal.discount || deal.title}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    setIsOpen(!isOpen);
  };

  // Button styles based on variant
  const getButtonClass = () => {
    if (variant === 'modal') {
      return 'h-12 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-gray-700 shrink-0 cursor-pointer shadow-xs';
    }
    if (variant === 'header') {
      return 'p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer';
    }
    // Standard 'card' variant: sleek button beside GET DEAL
    return 'h-11 w-11 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center transition-colors border border-gray-200/80 dark:border-gray-700/80 shrink-0 cursor-pointer shadow-2xs group-hover:border-gray-300 dark:group-hover:border-gray-600';
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        id={`share-btn-${deal.id}`}
        type="button"
        onClick={toggleDropdown}
        title="Share deal with friends"
        aria-label={`Share ${deal.merchantName} deal`}
        aria-expanded={isOpen}
        className={getButtonClass()}
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in duration-200" />
        ) : (
          <Share2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        )}
        {variant === 'modal' && (
          <span className="hidden sm:inline">
            {copied ? 'Link Copied!' : 'Share Deal'}
          </span>
        )}
        {variant === 'header' && (
          <span>{copied ? 'Copied!' : 'Share'}</span>
        )}
      </button>

      {/* Floating Share Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Share options"
          className={`absolute z-50 ${
            variant === 'header' ? 'top-full right-0 mt-2' : 'bottom-full right-0 mb-2'
          } w-72 sm:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-4 text-gray-900 dark:text-white animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-[#FACC15] flex items-center justify-center">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs leading-none">Share Deal</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[170px]">
                  {deal.merchantName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Close share menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Copy Link Box */}
          <div className="pt-3 pb-3">
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Copy Direct Link
            </label>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 focus-within:ring-2 focus-within:ring-[#FACC15]">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full text-xs bg-transparent text-gray-600 dark:text-gray-300 px-2 outline-none select-all truncate font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-md text-xs font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#FACC15] hover:bg-yellow-400 text-gray-900'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3 h-3" />
                Link copied to clipboard! Ready to send to friends.
              </p>
            )}
          </div>

          {/* Social Share Options */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Send via
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={(e) => handleSocialShare('whatsapp', e)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 dark:bg-gray-800/80 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer text-center"
              >
                <MessageCircle className="w-4 h-4 mb-1 text-emerald-500" />
                <span className="text-[10px] font-semibold">WhatsApp</span>
              </button>

              {/* X / Twitter */}
              <button
                type="button"
                onClick={(e) => handleSocialShare('twitter', e)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-sky-50 dark:bg-gray-800/80 dark:hover:bg-sky-950/40 text-gray-700 dark:text-gray-300 hover:text-sky-700 dark:hover:text-sky-400 border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-800 transition-colors cursor-pointer text-center"
              >
                <span className="w-4 h-4 mb-1 font-black text-xs leading-none flex items-center justify-center">
                  𝕏
                </span>
                <span className="text-[10px] font-semibold">Post / X</span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={(e) => handleSocialShare('email', e)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-amber-50 dark:bg-gray-800/80 dark:hover:bg-amber-950/40 text-gray-700 dark:text-gray-300 hover:text-amber-800 dark:hover:text-yellow-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-800 transition-colors cursor-pointer text-center"
              >
                <Mail className="w-4 h-4 mb-1 text-amber-500" />
                <span className="text-[10px] font-semibold">Email</span>
              </button>
            </div>

            {/* Native Share button (if supported on mobile/browser) */}
            {hasNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full mt-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>More options (System Share)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
