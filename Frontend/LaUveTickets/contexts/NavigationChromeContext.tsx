import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type HeaderConfiguration = {
  availableYears?: string[];
  selectedYear?: string | null;
  onYearChange?: (year: string | null) => void;
};

type NavigationChromeValue = {
  activeTab: string;
  activeHeader: HeaderConfiguration;
  setActiveTab: (tab: string) => void;
  registerHeader: (tab: string, config: HeaderConfiguration) => void;
};

const NavigationChromeContext = createContext<NavigationChromeValue | null>(null);

export function NavigationChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState('Tickets');
  const [headers, setHeaders] = useState<Record<string, HeaderConfiguration>>({});
  const registerHeader = useCallback(
    (tab: string, config: HeaderConfiguration) => {
      setHeaders(current => ({ ...current, [tab]: config }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      activeTab,
      activeHeader: headers[activeTab] ?? {},
      setActiveTab,
      registerHeader,
    }),
    [activeTab, headers, registerHeader],
  );

  return (
    <NavigationChromeContext.Provider value={value}>
      {children}
    </NavigationChromeContext.Provider>
  );
}

export function useNavigationChrome() {
  const context = useContext(NavigationChromeContext);
  if (!context) {
    throw new Error(
      'useNavigationChrome debe utilizarse dentro de NavigationChromeProvider',
    );
  }
  return context;
}
