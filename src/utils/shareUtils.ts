import { Deal } from '../types';

// The verified public preview URL for sharing outside AI Studio
const DEFAULT_PUBLIC_URL = 'https://ais-pre-udrionmm3z54wdabpo3zlu-17721073259.europe-west2.run.app';

/**
 * Returns the public origin suitable for sharing links to other devices (e.g. mobile phones).
 * Handles AI Studio dev environment, localhost testing, and production domains.
 */
export function getPublicOrigin(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_PUBLIC_URL;
  }

  const origin = window.location.origin;

  // If in AI Studio development container, convert to the public shared URL
  // so people opening the link on their phone don't get blocked by developer session cookies
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }

  // If testing on localhost / local IP, localhost URLs cannot open on a phone.
  // Fall back to the public cloud URL
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  ) {
    return DEFAULT_PUBLIC_URL;
  }

  return origin;
}

/**
 * Generates the definitive share URL for a deal, fully compatible with mobile browsers,
 * messengers (WhatsApp, Telegram, SMS), social media, and QR codes.
 */
export function getDealShareUrl(deal: Deal): string {
  const origin = getPublicOrigin();
  return `${origin}/deals/${deal.id}`;
}

/**
 * Robustly parses a deal ID or slug from the current browser location,
 * checking pathname (/deals/:id), query parameters (?deal=:id or ?d=:id), and hash (#/deals/:id).
 * Handles trailing slashes, encoding, and messenger tracking parameters.
 */
export function extractDealIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Pathname check: /deals/:id or /deals/:slug (ignoring trailing slash)
    const pathname = window.location.pathname;
    const pathMatch = pathname.match(/\/deals\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      const id = decodeURIComponent(pathMatch[1]).trim().replace(/\/+$/, '');
      if (id) return id;
    }

    // 2. Query param check: ?deal=:id or ?d=:id
    const searchParams = new URLSearchParams(window.location.search);
    const param = searchParams.get('deal') || searchParams.get('d') || searchParams.get('id');
    if (param) {
      const id = decodeURIComponent(param).trim().replace(/\/+$/, '');
      if (id) return id;
    }

    // 3. Hash check: #/deals/:id or #deals/:id
    const hash = window.location.hash;
    const hashMatch = hash.match(/deals\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) {
      const id = decodeURIComponent(hashMatch[1]).trim().replace(/\/+$/, '');
      if (id) return id;
    }
  } catch (err) {
    console.warn('Error extracting deal ID from location:', err);
  }

  return null;
}
