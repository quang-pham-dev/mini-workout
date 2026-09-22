'use client';

import { cn } from '@mini-workout/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasMobileMenuOpen = useRef(false);
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

  useEffect(() => {
    if (!isMobileMenuOpen) {
      if (wasMobileMenuOpen.current) {
        triggerRef.current?.focus();
      }
      wasMobileMenuOpen.current = false;
      return;
    }
    wasMobileMenuOpen.current = true;
    closeRef.current?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isMobileMenuOpen]);

  if (isOnboarding) {
    return null;
  }

  const isHome = pathname === '/home';
  const isWorkouts = pathname?.startsWith('/workouts');
  const isFavourites = pathname?.startsWith('/favourites');
  const isProfile = pathname?.startsWith('/profile');

  const mobileModal =
    isMobileMenuOpen && mounted
      ? createPortal(
          <div
            ref={dialogRef}
            className="fixed inset-0 z-[9999] flex h-[100dvh] min-h-screen w-screen flex-col justify-between overflow-y-auto overscroll-contain bg-background p-[clamp(1.25rem,5vw,2.5rem)] animate-mobile-menu-in motion-reduce:animate-none"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="flex items-center justify-between pb-6">
              <Link
                className="font-display text-[1.15rem] font-extrabold tracking-[-0.04em] text-text-primary no-underline"
                href="/home"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                mini / workout
              </Link>
              <button
                ref={closeRef}
                className="flex size-11 items-center justify-center rounded-full border border-border-subtle bg-surface text-xl leading-none text-text-primary transition-[background-color,transform] hover:scale-105 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center py-8">
              <span className="mb-6 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                Menu
              </span>
              <nav className="flex flex-col gap-3">
                <Link
                  className={cn(
                    'group flex items-center justify-between px-0 py-[0.6rem] font-display text-[clamp(2.25rem,8vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.05em] text-text-primary no-underline transition-[transform,color]',
                    isHome && 'translate-x-1 text-highlight-foreground',
                  )}
                  href="/home"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>Home</span>
                  <span
                    className="text-[1.5rem] font-normal text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
                <Link
                  className={cn(
                    'group flex items-center justify-between px-0 py-[0.6rem] font-display text-[clamp(2.25rem,8vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.05em] text-text-primary no-underline transition-[transform,color]',
                    isWorkouts && 'translate-x-1 text-highlight-foreground',
                  )}
                  href="/workouts"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>Explore</span>
                  <span
                    className="text-[1.5rem] font-normal text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
                <Link
                  className={cn(
                    'group flex items-center justify-between px-0 py-[0.6rem] font-display text-[clamp(2.25rem,8vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.05em] text-text-primary no-underline transition-[transform,color]',
                    isFavourites && 'translate-x-1 text-highlight-foreground',
                  )}
                  href="/favourites"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>Favourites</span>
                  <span
                    className="text-[1.5rem] font-normal text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
                <Link
                  className={cn(
                    'group flex items-center justify-between px-0 py-[0.6rem] font-display text-[clamp(2.25rem,8vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.05em] text-text-primary no-underline transition-[transform,color]',
                    isProfile && 'translate-x-1 text-highlight-foreground',
                  )}
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>Profile</span>
                  <span
                    className="text-[1.5rem] font-normal text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border-subtle pt-6">
              <Link
                className="flex items-center gap-[0.85rem] text-text-primary no-underline"
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div
                  className="flex size-[2.35rem] items-center justify-center rounded-full border-[1.5px] border-transparent bg-[color-mix(in_oklch,var(--color-highlight)_18%,transparent)] font-display text-[0.85rem] font-bold tracking-[-0.02em] text-highlight-foreground"
                  aria-hidden="true"
                >
                  <span>{userInitials}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.95rem] font-bold tracking-[-0.02em]">
                    {userName || 'Your Account'}
                  </span>
                  <span className="text-[0.8rem] text-text-tertiary">
                    {userEmail || 'Manage Profile'}
                  </span>
                </div>
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {/* Desktop Navigation Links */}
      <nav
        className="flex items-center gap-2 max-[768px]:hidden md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
        aria-label="Main Navigation"
      >
        <Link
          className={cn(
            'relative inline-flex items-center rounded-full px-4 py-[0.45rem] text-sm font-medium text-text-secondary no-underline transition-[color,background-color,box-shadow] hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
            isHome &&
              'bg-surface-raised font-semibold text-text-primary shadow-[0_1px_3px_oklch(0_0_0/0.08)]',
          )}
          href="/home"
        >
          Home
        </Link>
        <Link
          className={cn(
            'relative inline-flex items-center rounded-full px-4 py-[0.45rem] text-sm font-medium text-text-secondary no-underline transition-[color,background-color,box-shadow] hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
            isWorkouts &&
              'bg-surface-raised font-semibold text-text-primary shadow-[0_1px_3px_oklch(0_0_0/0.08)]',
          )}
          href="/workouts"
        >
          Explore
        </Link>
        <Link
          className={cn(
            'relative inline-flex items-center rounded-full px-4 py-[0.45rem] text-sm font-medium text-text-secondary no-underline transition-[color,background-color,box-shadow] hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
            isFavourites &&
              'bg-surface-raised font-semibold text-text-primary shadow-[0_1px_3px_oklch(0_0_0/0.08)]',
          )}
          href="/favourites"
        >
          Favourites
        </Link>
      </nav>

      {/* Desktop Right Action: Circular 2-letter Avatar - Glo style */}
      <div className="flex items-center gap-3 max-[768px]:hidden">
        <Link
          className={cn(
            'flex size-[2.35rem] items-center justify-center rounded-full border-[1.5px] border-transparent bg-[color-mix(in_oklch,var(--color-highlight)_18%,transparent)] font-display text-[0.85rem] font-bold tracking-[-0.02em] text-highlight-foreground no-underline transition-[transform,border-color,box-shadow] hover:scale-105 hover:border-border-strong hover:shadow-[0_2px_8px_oklch(0_0_0/0.1)] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
            isProfile &&
              'border-highlight shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-highlight)_25%,transparent)]',
          )}
          href="/profile"
          aria-label="View Profile"
          title={userName || 'Profile'}
        >
          <span>{userInitials}</span>
        </Link>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        ref={triggerRef}
        className="hidden size-10 items-center justify-center rounded-lg border border-border-default bg-surface p-0 text-text-primary max-[768px]:inline-flex"
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <span
          className="flex h-4 w-5 flex-col items-center justify-center gap-1"
          aria-hidden="true"
        >
          <span className="h-0.5 w-full rounded-sm bg-current" />
          <span className="h-0.5 w-full rounded-sm bg-current" />
          <span className="h-0.5 w-full rounded-sm bg-current" />
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
      <nav
        className="flex items-center gap-2 max-[768px]:hidden md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
        aria-label="Main Navigation"
      >
        <Link
          className="relative inline-flex items-center rounded-full px-4 py-[0.45rem] text-sm font-medium text-text-secondary no-underline"
          href="/home"
        >
          Home
        </Link>
        <Link
          className="relative inline-flex items-center rounded-full px-4 py-[0.45rem] text-sm font-medium text-text-secondary no-underline"
          href="/workouts"
        >
          Explore
        </Link>
        <Link
          className="relative inline-flex items-center rounded-full px-4 py-[0.45rem] text-sm font-medium text-text-secondary no-underline"
          href="/favourites"
        >
          Favourites
        </Link>
      </nav>

      <div className="flex items-center gap-3 max-[768px]:hidden">
        <div
          className="flex size-[2.35rem] items-center justify-center rounded-full border-[1.5px] border-transparent bg-[color-mix(in_oklch,var(--color-highlight)_18%,transparent)] font-display text-[0.85rem] font-bold text-highlight-foreground"
          aria-hidden="true"
        >
          <span>ME</span>
        </div>
      </div>

      <button
        className="hidden size-10 items-center justify-center rounded-lg border border-border-default bg-surface p-0 text-text-primary max-[768px]:inline-flex"
        type="button"
        aria-label="Open navigation menu"
        disabled
      >
        <span
          className="flex h-4 w-5 flex-col items-center justify-center gap-1"
          aria-hidden="true"
        >
          <span className="h-0.5 w-full rounded-sm bg-current" />
          <span className="h-0.5 w-full rounded-sm bg-current" />
          <span className="h-0.5 w-full rounded-sm bg-current" />
        </span>
      </button>
    </>
  );
}
