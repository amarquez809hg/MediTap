import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  adminChartFallback,
  chartPageGoBackFallback,
  navigatePortalHard,
  pathKey,
  resolveGoBackTarget,
} from './portalGoBack';

export { adminChartFallback, chartPageGoBackFallback, navigatePortalHard, resolveGoBackTarget };

type PortalHistoryContextValue = {
  /** Navigate to the previous in-app page, or `fallback` when there is none. */
  goBack: (fallback: string) => void;
  canGoBack: boolean;
};

const PortalHistoryContext = createContext<PortalHistoryContextValue | null>(null);

const MAX_STACK = 40;
const STORAGE_KEY = 'meditap:portal-nav-stack';

function readStoredStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredStack(stack: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-MAX_STACK)));
  } catch {
    /* ignore */
  }
}

/**
 * Tracks in-app route history so “Go back” returns to the previous page
 * (not always the dashboard). Wrap portal route trees with this provider.
 *
 * Leave always uses hard assign — see docs/PORTAL_GO_BACK_MATRIX.md.
 */
export function PortalHistoryProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const stackRef = useRef<string[]>(readStoredStack());
  const skippingRef = useRef(false);

  useEffect(() => {
    const key = pathKey(location.pathname, location.search, location.hash);
    if (skippingRef.current) {
      skippingRef.current = false;
      const stack = stackRef.current;
      if (stack[stack.length - 1] !== key) {
        stack.push(key);
        writeStoredStack(stack);
      }
      return;
    }
    const stack = stackRef.current;
    if (stack[stack.length - 1] === key) return;
    stack.push(key);
    if (stack.length > MAX_STACK) {
      stackRef.current = stack.slice(-MAX_STACK);
    }
    writeStoredStack(stackRef.current);
  }, [location.pathname, location.search, location.hash]);

  const canGoBack = stackRef.current.length > 1;

  const goBack = useCallback(
    (fallback: string) => {
      const stack = stackRef.current;
      const current = pathKey(location.pathname, location.search, location.hash);
      const target = resolveGoBackTarget(
        stack,
        location.pathname,
        current,
        fallback
      );

      // Mutate stack to match resolveGoBackTarget pops (same rules).
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (
          top === current ||
          top.split(/[?#]/)[0] === location.pathname
        ) {
          stack.pop();
        } else {
          break;
        }
      }
      writeStoredStack(stack);

      skippingRef.current = true;
      navigatePortalHard(target);
    },
    [location.hash, location.pathname, location.search],
  );

  const value = useMemo(() => ({ goBack, canGoBack }), [goBack, canGoBack]);

  return <PortalHistoryContext.Provider value={value}>{children}</PortalHistoryContext.Provider>;
}

export function usePortalHistory(): PortalHistoryContextValue {
  const ctx = useContext(PortalHistoryContext);
  if (ctx) return ctx;
  // Outside provider: still hard-assign so leave never soft-stacks in Ionic.
  return {
    canGoBack: typeof window !== 'undefined' && window.history.length > 1,
    goBack: (fallback: string) => {
      navigatePortalHard(fallback);
    },
  };
}
