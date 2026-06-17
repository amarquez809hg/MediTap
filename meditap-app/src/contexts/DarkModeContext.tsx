import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useProfileDarkMode } from './UserPreferencesContext';

type DarkModeContextValue = {
  dark: boolean;
  setDark: (enabled: boolean) => void;
};

const DarkModeContext = createContext<DarkModeContextValue | null>(null);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dark, setDark: setProfileDark } = useProfileDarkMode();

  const setDark = useCallback(
    (enabled: boolean) => {
      void setProfileDark(enabled);
    },
    [setProfileDark]
  );

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
