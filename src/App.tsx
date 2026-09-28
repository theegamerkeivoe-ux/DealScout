import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { DealDetailModal } from './components/DealDetailModal';
import { LegalModal } from './components/LegalModal';
import { Deal } from './types';
import {
  getPublishedDeals,
  getDealById,
} from './services/dealService';
import { extractDealIdFromLocation } from './utils/shareUtils';

function MainApp() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'home' | 'admin' | 'deal'
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'deal'>('home');
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [modalDeal, setModalDeal] = useState<Deal | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'support' | null>(null);

  // Parse path and shared links from window.location
  const parseCurrentPath = useCallback((dealsList: Deal[]) => {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
      setCurrentView('admin');
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
      // If we are on home and not in a deal, close deal modal (e.g. user pressed back on mobile)
      setModalDeal(null);
    }

    // Default to home
    setCurrentView('home');
  }, []);

  // Fetch verified deals from Firestore
  const loadDeals = async () => {
    setLoading(true);
    try {
      // Pre-check for direct deal link on mobile so user gets instant response
      const targetDeal = extractDealIdFromLocation();
      if (targetDeal) {
        getDealById(targetDeal).then((directDeal) => {
          if (directDeal) {
            setActiveDeal(directDeal);
            setModalDeal(directDeal);
          }
        });
      }

      // Get published deals directly from Firestore
      const fetched = await getPublishedDeals();

      setDeals(fetched);
      parseCurrentPath(fetched);
    } catch (err) {
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  // Handle browser back/forward buttons (essential for Android back button & mobile gestures)
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
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'admin' ? (
          <AdminDashboard onNavigateHome={() => handleNavigate('home')} />
        ) : (
          <HomePage
            deals={deals}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectDeal={handleSelectDeal}
            onNavigateAdmin={() => handleNavigate('admin')}
          />
        )}
      </main>

      {/* Deal Detail Modal */}
      {modalDeal && (
        <DealDetailModal
          deal={modalDeal}
          onClose={handleCloseDealModal}
          onOpenSupport={() => {
            handleCloseDealModal();
            setLegalModalType('support');
          }}
        />
      )}

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

