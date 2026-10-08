import React, { useEffect, useRef } from 'react';

interface AdSenseBannerProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const adInitialized = useRef(false);

  useEffect(() => {
    // Only attempt push once per mount
    if (adInitialized.current) return;

    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adInitialized.current = true;
      }
    } catch (err) {
      // Non-blocking: AdSense may throw if ad blockers are active or already rendered
      console.warn('AdSense slot initialization:', err);
    }
  }, []);

  return (
    <div
      className={`w-full overflow-hidden my-4 py-2 flex flex-col items-center justify-center text-center ${className}`}
      aria-label="Advertisement"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-gray-50/60 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-800/60 p-2 sm:p-3 overflow-hidden">
        <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500 mb-1 text-center select-none">
          Advertisement
        </div>
        <ins
          ref={adRef}
          className="adsbygoogle block"
          style={{ display: 'block', minHeight: '90px' }}
          data-ad-client="ca-pub-8053822432788288"
          data-ad-slot={slot || 'default'}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};
