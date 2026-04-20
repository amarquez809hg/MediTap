import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyMediTapDarkMode,
  persistMediTapDarkMode,
  readMediTapDarkMode,
} from '../theme/darkModeSync';

type DarkModeContextValue = {
  dark: boolean;
  setDark: (enabled: boolean) => void;
};

const DarkModeContext = createContext<DarkModeContextValue | null>(null);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dark, setDarkState] = useState(() => readMediTapDarkMode());

  useEffect(() => {
    applyMediTapDarkMode(dark);
  }, [dark]);

  const setDark = useCallback((enabled: boolean) => {
    setDarkState(enabled);
    persistMediTapDarkMode(enabled);
  }, []);

  const value = useMemo(() => ({ dark, setDark }), [dark, setDark]);

  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>;
};

export function useDarkMode(): DarkModeContextValue {
  const ctx = useContext(DarkModeContext);
  if (!ctx) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return ctx;
}
