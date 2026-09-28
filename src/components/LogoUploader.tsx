import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Link2,
  Check,
  AlertCircle,
  Sparkles,
  FileCheck,
} from 'lucide-react';

interface LogoUploaderProps {
  value: string;
  onChange: (value: string) => void;
  merchantName?: string;
  websiteUrl?: string;
}

/**
 * Optimizes an uploaded image file by drawing to a canvas and exporting
 * a compact, high-quality WebP or PNG data URL (max 280x280).
 * This fits comfortably in Firestore document limits (<50KB) and avoids
 * hotlink protection or CORS issues from external image hosts.
 */
async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    // Direct SVG handling (preserve vector sharpness)
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Verify safe SVG without executable script tags
        if (result.toLowerCase().includes('<script')) {
          return reject(new Error('SVG contains unsafe script tags.'));
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 280;
        let { width, height } = img;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first; fallback to png to preserve alpha transparency
        try {
          const webpData = canvas.toDataURL('image/webp', 0.88);
          if (webpData && webpData.startsWith('data:image/webp')) {
            return resolve(webpData);
          }
        } catch {
          // Fall through to PNG
        }

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Could not decode image file.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  value,
  onChange,
  merchantName = '',
  websiteUrl = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [rawUrlInput, setRawUrlInput] = useState('');
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDataUrl = value?.startsWith('data:image/');
  const hasLogo = Boolean(value && value.trim().length > 0);

  // Approximate data size of attached logo
  const approximateSizeKb = isDataUrl
    ? Math.round((value.length * 0.75) / 1024)
    : null;

  const handleFileChange = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Image file is too large. Please choose an image under 8MB.');
      }
      const dataUrl = await processImageFile(file);
      onChange(dataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFileChange(file);
      }
    },
    [onChange]
  );

  const handleManualUrlApply = () => {
    if (!rawUrlInput.trim()) return;
    setErrorMessage(null);
    onChange(rawUrlInput.trim());
    setShowUrlInput(false);
  };

  const handleAutoFetchFromDomain = async () => {
    let domain = '';
    // Attempt 1: from affiliate or destination URL
    if (websiteUrl) {
      try {
        domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
      } catch {
        domain = '';
      }
    }
    // Attempt 2: from merchant name
    if (!domain && merchantName) {
      const clean = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean) {
        domain = `${clean}.com`;
      }
    }

    if (!domain) {
      setErrorMessage('Please enter a Store Name or Affiliate URL first to auto-fetch the logo.');
      return;
    }

    setIsAutoFetching(true);
    setErrorMessage(null);

    // Google high-resolution favicon service
    const fetchedLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    onChange(fetchedLogo);
    setIsAutoFetching(false);
  };

  const handleClear = () => {
    onChange('');
    setRawUrlInput('');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Company Logo
        </label>
        <div className="flex items-center gap-2">
          {!hasLogo && (
            <button
              type="button"
              onClick={handleAutoFetchFromDomain}
              disabled={isAutoFetching}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-yellow-400 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-detect</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
          >
            {showUrlInput ? 'Hide URL link' : 'Use web link'}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="company-logo-file-input"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileChange(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* When Logo is attached / configured */}
      {hasLogo ? (
        <div className="p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo Preview Container */}
            <div className="w-14 h-14 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1.5 flex items-center justify-center shadow-xs shrink-0 overflow-hidden relative">
              <img
                src={value}
                alt={merchantName ? `${merchantName} logo` : 'Company logo'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  setErrorMessage('Failed to load logo preview. Image may be blocked or invalid.');
                }}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {isDataUrl ? 'Attached Logo File' : 'Linked Logo'}
                </span>
                {approximateSizeKb !== null && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono px-1.5 py-0.2 rounded font-semibold">
                    {approximateSizeKb} KB
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {isDataUrl
                  ? 'Optimized for high-impact card display'
                  : value}
              </p>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Large display ready</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              id="change-company-logo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Replace</span>
            </button>
            <button
              type="button"
              id="remove-company-logo-btn"
              onClick={handleClear}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Remove logo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty State: Drag & Drop / Click to Upload */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 select-none ${
            isDragging
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-400/40'
              : 'border-gray-300 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-amber-500 shadow-2xs">
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            ) : (
              <Upload className="w-5 h-5 text-amber-500" />
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              <span className="text-amber-600 dark:text-yellow-400 underline decoration-amber-400 underline-offset-2">
                Click to attach logo
              </span>{' '}
              or drag &amp; drop file
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              PNG, JPG, WebP, SVG or GIF (displays prominently on cards)
            </p>
          </div>
        </div>
      )}

      {/* Secondary URL input field when explicitly requested */}
      {showUrlInput && (
        <div className="pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={rawUrlInput}
                onChange={(e) => setRawUrlInput(e.target.value)}
                placeholder="Or paste external image URL: https://..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={handleManualUrlApply}
              className="px-3 py-2 text-xs font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
