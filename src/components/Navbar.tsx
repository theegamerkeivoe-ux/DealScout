import React, { useState } from 'react';
import {
  Tag,
  Search,
  Menu,
  X,
  ShieldCheck,
  Sun,
  Moon,
  MessageSquare,
  Gift,
  Award,
  Crown,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DealScoutLogo } from './DealScoutLogo';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentView: string;
  onNavigate: (view: string, dealId?: string) => void;
  onOpenSupport?: () => void;
  onOpenMembership?: () => void;
  onOpenConcierge?: () => void;
  isVipMember?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  currentView,
  onNavigate,
  onOpenSupport,
  onOpenMembership,
  onOpenConcierge,
  isVipMember = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, isOwner, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleNavClick = (view: string, dealId?: string) => {
    onNavigate(view, dealId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo matching dee.JPG */}
          <div
            id="nav-brand-logo"
            onClick={(e) => {
              if (e.altKey) {
                handleNavClick('admin');
              } else {
                handleNavClick('home');
              }
            }}
            title={isOwner ? 'DealScout Home' : 'DealScout — Verified Promo Codes (Alt+Click for Admin Sign In)'}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group"
          >
            <DealScoutLogo size={36} />
            <div className="flex flex-col">
              <span className="font-display text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                Deal<span className="text-amber-500 dark:text-amber-400 font-bold">Scout</span>
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                Verified Promo Codes
              </span>
            </div>
          </div>

          {/* Search bar - Desktop center */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (currentView !== 'home') {
                    onNavigate('home');
                  }
                }}
                placeholder="Search stores, brands, or coupon codes..."
                className="w-full bg-gray-100/80 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 border border-transparent dark:border-gray-800 rounded-xl py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium shrink-0">
            <button
              id="nav-all-deals-btn"
              onClick={() => handleNavClick('home')}
              className={`transition-colors cursor-pointer relative py-1 ${
                currentView === 'home'
                  ? 'text-gray-900 dark:text-white font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Deals
              {currentView === 'home' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>

            {/* VIP Membership Trigger Button */}
            {isVipMember ? (
              <button
                type="button"
                id="nav-vip-concierge-btn"
                onClick={onOpenConcierge}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="VIP Member Concierge: Ask us to find deals for you"
              >
                <Crown className="w-3.5 h-3.5 text-gray-950" />
                <span>VIP Concierge</span>
              </button>
            ) : onOpenMembership ? (
              <button
                type="button"
                id="nav-vip-club-btn"
                onClick={onOpenMembership}
                className="px-3 py-1.5 rounded-xl border border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20 text-amber-900 dark:text-yellow-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Join VIP Membership"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>VIP Club</span>
              </button>
            ) : null}

            {onOpenSupport && (
              <button
                id="nav-support-btn"
                onClick={onOpenSupport}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 py-1"
                title="Anonymous Community Support & Feedback"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Support</span>
              </button>
            )}

            {/* Dark Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700" />
              )}
            </button>

            {/* Admin Access: Only authenticated owner sees 'Admin Panel' button */}
            {isOwner ? (
              <>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />
                <button
                  id="nav-admin-btn"
                  onClick={() => handleNavClick('admin')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-amber-400 hover:bg-amber-500 text-gray-950 shadow-xs"
                  title="Owner Admin Dashboard"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </button>
              </>
            ) : (
              <button
                id="nav-admin-signin-btn"
                onClick={() => handleNavClick('admin')}
                className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-400/5 dark:text-gray-500 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                title="Owner / Admin Sign In (Shortcut: Alt+A)"
                aria-label="Admin Sign In"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                <span className="hidden lg:inline text-[11px] font-semibold">Admin Sign In</span>
              </button>
            )}
          </nav>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              id="mobile-theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700" />
              )}
            </button>

            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input bar */}
        <div className="md:hidden pb-3 pt-1">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              id="mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'home') {
                  onNavigate('home');
                }
              }}
              placeholder="Search stores, brands, or coupon codes..."
              className="w-full bg-gray-100/90 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 border border-transparent dark:border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {mobileMenuOpen && (
        <div id="mobile-nav-panel" className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleNavClick('home')}
              className="text-left px-3 py-2.5 rounded-lg text-base font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              All Deals
            </button>

            {/* VIP Mobile Button */}
            {isVipMember ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenConcierge?.();
                }}
                className="text-left px-3 py-2.5 rounded-lg text-base font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer flex items-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span>VIP Concierge · Request Deals</span>
              </button>
            ) : onOpenMembership ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenMembership();
                }}
                className="text-left px-3 py-2.5 rounded-lg text-base font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Join VIP Club</span>
              </button>
            ) : null}

            {onOpenSupport && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSupport();
                }}
                className="text-left px-3 py-2.5 rounded-lg text-base font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-[#FACC15]" />
                <span>Community Support &amp; Comments</span>
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
            {isOwner ? (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-gray-950" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Owner &amp; Admin Sign In</span>
              </button>
            )}
          </div>

          {currentUser && (
            <div className="pt-2">
              <button
                onClick={() => logout()}
                className="w-full py-2 text-xs text-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

