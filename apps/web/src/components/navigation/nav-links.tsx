'use client';

import styles from './app-header.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type NavLinksProps = {
  userInitials?: string;
  userName?: string;
  userEmail?: string;
};

export function NavLinks({
  userInitials = 'ME',
  userName,
  userEmail,
}: NavLinksProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isOnboarding = pathname?.startsWith('/onboarding');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when full-screen mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileMenuOpen]);

  if (isOnboarding) {
    return null;
  }

  const isHome = pathname === '/home';
  const isFavourites = pathname?.startsWith('/favourites');
  const isProfile = pathname?.startsWith('/profile');

  const mobileModal =
    isMobileMenuOpen && mounted ? (
      createPortal(
        <div
          className={styles.fullscreenMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div className={styles.fullscreenHeader}>
            <Link
              className={styles.brand}
              href="/home"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              mini / workout
            </Link>
            <button
              className={styles.closeBtn}
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className={styles.menuBody}>
            <span className={styles.menuLabel}>Menu</span>
            <nav className={styles.menuList}>
              <Link
                className={`${styles.menuItem} ${isHome ? styles.active : ''}`}
                href="/home"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>Home</span>
                <span className={styles.menuChevron} aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                className={`${styles.menuItem} ${isFavourites ? styles.active : ''}`}
                href="/favourites"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>Favourites</span>
                <span className={styles.menuChevron} aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                className={`${styles.menuItem} ${isProfile ? styles.active : ''}`}
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>Profile</span>
                <span className={styles.menuChevron} aria-hidden="true">
                  ›
                </span>
              </Link>
            </nav>
          </div>

          <div className={styles.fullscreenFooter}>
            <Link
              className={styles.userSummary}
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className={styles.avatarCircle} aria-hidden="true">
                <span>{userInitials}</span>
              </div>
              <div className={styles.userSummaryText}>
                <span className={styles.userSummaryName}>
                  {userName || 'Your Account'}
                </span>
                <span className={styles.userSummarySub}>
                  {userEmail || 'Manage Profile'}
                </span>
              </div>
            </Link>
          </div>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <>
      {/* Desktop Navigation Links */}
      <nav className={styles.desktopNav} aria-label="Main Navigation">
        <Link
          className={`${styles.navLink} ${isHome ? styles.active : ''}`}
          href="/home"
        >
          Home
        </Link>
        <Link
          className={`${styles.navLink} ${isFavourites ? styles.active : ''}`}
          href="/favourites"
        >
          Favourites
        </Link>
      </nav>

      {/* Desktop Right Action: Circular 2-letter Avatar - Glo style */}
      <div className={styles.desktopActions}>
        <Link
          className={`${styles.avatarCircle} ${isProfile ? styles.active : ''}`}
          href="/profile"
          aria-label="View Profile"
          title={userName || 'Profile'}
        >
          <span>{userInitials}</span>
        </Link>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className={styles.hamburgerBtn}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <span className={styles.hamburgerIcon} aria-hidden="true">
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </span>
      </button>

      {/* Full-Screen Mobile Menu Modal - Portal to document.body */}
      {mobileModal}
    </>
  );
}

export function NavLinksFallback() {
  return (
    <>
      <nav className={styles.desktopNav} aria-label="Main Navigation">
        <Link className={styles.navLink} href="/home">
          Home
        </Link>
        <Link className={styles.navLink} href="/favourites">
          Favourites
        </Link>
      </nav>

      <div className={styles.desktopActions}>
        <div className={styles.avatarCircle} aria-hidden="true">
          <span>ME</span>
        </div>
      </div>

      <button
        className={styles.hamburgerBtn}
        type="button"
        aria-label="Open navigation menu"
        disabled
      >
        <span className={styles.hamburgerIcon} aria-hidden="true">
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </span>
      </button>
    </>
  );
}
