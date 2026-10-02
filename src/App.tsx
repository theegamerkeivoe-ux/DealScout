import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AffiliatePortal } from './pages/AffiliatePortal';
import { DealDetailModal } from './components/DealDetailModal';
import { LegalModal } from './components/LegalModal';
import { Deal, Membership } from './types';
import {
  getPublishedDeals,
  getDealById,
} from './services/dealService';
import { extractDealIdFromLocation } from './utils/shareUtils';
import {
  setStoredAffiliateCode,
  recordAffiliateClick,
} from './services/affiliateService';
import { MembershipModal } from './components/MembershipModal';
import { DealConciergeModal } from './components/DealConciergeModal';
import { getUserMembership } from './services/membershipService';

function MainApp() {
  const { currentUser, isOwner } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'home' | 'admin' | 'deal' | 'affiliates'
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'deal' | 'affiliates'>('home');
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [modalDeal, setModalDeal] = useState<Deal | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'support' | null>(null);

  // VIP Membership & Concierge state
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);

  // Sync VIP Membership status for logged in user or local storage
  useEffect(() => {
    const userIdentifier = currentUser?.email || currentUser?.uid;
    if (userIdentifier) {
      getUserMembership(userIdentifier)
        .then((mem) => {
          if (mem) setMembership(mem);
        })
        .catch(() => {});
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dealscout_vip_membership');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMembership(parsed);
        } catch {}
      }
    }
  }, [currentUser]);

  // Global Admin Access Keyboard Shortcut (Ctrl+Shift+A or Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        handleNavigate('admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check URL query parameters for affiliate referral code (?ref=... or ?aff=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('aff');
      if (refCode) {
        setStoredAffiliateCode(refCode);
        recordAffiliateClick(refCode);
      }
    }
  }, []);

  // Parse path and shared links from window.location
  const parseCurrentPath = useCallback((dealsList: Deal[]) => {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
      setCurrentView('admin');
      return;
    }

    if (path.startsWith('/affiliates') || path.startsWith('/affiliate')) {
      setCurrentView('affiliates');
      return;
    }

    if (path === '/privacy') {
      setLegalModalType('privacy');
      setCurrentView('home');
      return;
    }

    if (path === '/terms') {
      setLegalModalType('terms');
      setCurrentView('home');
      return;
    }

    if (path === '/support') {
      setLegalModalType('support');
      setCurrentView('home');
      return;
    }

    // Extract deal ID from pathname, query param, or hash
    const dealIdOrSlug = extractDealIdFromLocation();

    if (dealIdOrSlug) {
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      const searchTarget = normalize(dealIdOrSlug);

      const found = dealsList.find(
        (d) =>
          d.id === dealIdOrSlug ||
          normalize(d.id) === searchTarget ||
          normalize(d.merchantName) === searchTarget
      );

      if (found) {
        setActiveDeal(found);
        setModalDeal(found);
        setCurrentView('home');
        return;
      } else {
        // Asynchronously fetch this deal directly so mobile links open immediately
        getDealById(dealIdOrSlug)
          .then((deal) => {
            if (deal) {
              setActiveDeal(deal);
              setModalDeal(deal);
            }
          })
          .catch((err) => {
            console.warn('Failed to load shared deal:', err);
          });
        setCurrentView('home');
        return;
      }
    } else {
      // If we are on home and not in a deal, close deal modal
      setModalDeal(null);
    }

    // Default to home
    setCurrentView('home');
  }, []);

  // Fetch verified deals from Firestore
  const loadDeals = async () => {
    setLoading(true);
    try {
      const list = await getPublishedDeals();
      setDeals(list);
      parseCurrentPath(list);
    } catch (err) {
      console.warn('Failed to load verified deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Immediate parse on mount
    const immediateDealId = extractDealIdFromLocation();
    if (immediateDealId) {
      getDealById(immediateDealId)
        .then((directDeal) => {
          if (directDeal) {
            setActiveDeal(directDeal);
            setModalDeal(directDeal);
          }
        })
        .catch(() => {});
    }

    loadDeals();
  }, []);

  // Re-parse when back/forward button is clicked
  useEffect(() => {
    const handlePopState = () => {
      parseCurrentPath(deals);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [deals, parseCurrentPath]);

  // Navigate helper that updates URL cleanly
  const handleNavigate = (
    view: string,
    dealId?: string
  ) => {
    if (view === 'admin') {
      setCurrentView('admin');
      window.history.pushState(null, '', '/admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'affiliates') {
      setCurrentView('affiliates');
      window.history.pushState(null, '', '/affiliates');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'deal' && dealId) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal) {
        setActiveDeal(deal);
        setModalDeal(deal);
        window.history.pushState(null, '', `/deals/${deal.id}`);
      }
      return;
    }

    // Home view
    setCurrentView('home');
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDeal = (deal: Deal) => {
    setActiveDeal(deal);
    setModalDeal(deal);
    window.history.pushState(null, '', `/deals/${deal.id}`);
  };

  const handleCloseDealModal = () => {
    setModalDeal(null);
    window.history.pushState(null, '', '/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 font-sans antialiased selection:bg-[#FACC15] selection:text-gray-900">
      {/* Header / Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSupport={() => setLegalModalType('support')}
        onOpenMembership={() => setIsMembershipOpen(true)}
        onOpenConcierge={() => setIsConciergeOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'admin' ? (
          <AdminDashboard onNavigateHome={() => handleNavigate('home')} />
        ) : currentView === 'affiliates' ? (
          <AffiliatePortal
            deals={deals}
            onNavigateHome={() => handleNavigate('home')}
            onSelectDeal={handleSelectDeal}
          />
        ) : (
          <HomePage
            deals={deals}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectDeal={handleSelectDeal}
            onNavigateAdmin={() => handleNavigate('admin')}
            onOpenMembership={() => setIsMembershipOpen(true)}
            onOpenConcierge={() => setIsConciergeOpen(true)}
            membership={membership}
          />
        )}
      </main>

      {/* Deal Detail Modal */}
      {modalDeal && (
        <DealDetailModal
          deal={modalDeal}
          onClose={handleCloseDealModal}
          isVip={membership?.status === 'active'}
          onOpenMembership={() => {
            handleCloseDealModal();
            setIsMembershipOpen(true);
          }}
          onOpenSupport={() => {
            handleCloseDealModal();
            setLegalModalType('support');
          }}
        />
      )}

      {/* VIP Membership Modal ($20/mo or Save 10% on Yearly Plan) */}
      <MembershipModal
        isOpen={isMembershipOpen}
        onClose={() => setIsMembershipOpen(false)}
        currentMembership={membership}
        onMembershipUpdated={(newMem) => setMembership(newMem)}
        onRequestDealClick={() => {
          setIsMembershipOpen(false);
          setIsConciergeOpen(true);
        }}
      />

      {/* VIP Deal Concierge Modal (Ask us to find deals for whatever you want) */}
      <DealConciergeModal
        isOpen={isConciergeOpen}
        onClose={() => setIsConciergeOpen(false)}
        membership={membership}
        onOpenMembership={() => {
          setIsConciergeOpen(false);
          setIsMembershipOpen(true);
        }}
      />

      {/* Legal & Support Modal (Privacy Policy / Terms of Service / Support) */}
      <LegalModal
        type={legalModalType}
        deals={deals}
        onClose={() => {
          setLegalModalType(null);
          if (['/privacy', '/terms', '/support'].includes(window.location.pathname)) {
            window.history.pushState(null, '', '/');
          }
        }}
      />

      {/* Footer (Only on public views) */}
      {currentView !== 'admin' && (
        <Footer
          onNavigate={(view) => handleNavigate(view)}
          onOpenLegal={(type) => setLegalModalType(type)}
          onOpenMembership={() => setIsMembershipOpen(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
