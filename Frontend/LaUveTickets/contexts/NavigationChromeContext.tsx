import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  isTabBarCompact: boolean;
  reportScroll: (tab: string, offsetY: number) => void;
};

const NavigationChromeContext = createContext<NavigationChromeValue | null>(null);

export function NavigationChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState('Tickets');
  const [isTabBarCompact, setIsTabBarCompact] = useState(false);
  const compactRef = useRef(false);
  const [headers, setHeaders] = useState<Record<string, HeaderConfiguration>>({});
  const scrollAnchor = useRef<Record<string, number>>({});
  const registerHeader = useCallback(
    (tab: string, config: HeaderConfiguration) => {
      setHeaders(current => ({ ...current, [tab]: config }));
    },
    [],
  );

  const activateTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setIsTabBarCompact(false);
    compactRef.current = false;
    scrollAnchor.current[tab] = 0;
  }, []);

  const reportScroll = useCallback(
    (tab: string, offsetY: number) => {
      if (tab !== activeTab) return;

      const y = Math.max(0, offsetY);
      const anchor = scrollAnchor.current[tab] ?? y;

      if (y <= 12) {
        setIsTabBarCompact(false);
        compactRef.current = false;
        scrollAnchor.current[tab] = y;
        return;
      }

      const distance = y - anchor;
      if (!compactRef.current && distance >= 24) {
        setIsTabBarCompact(true);
        compactRef.current = true;
        scrollAnchor.current[tab] = y;
      } else if (compactRef.current && distance <= -44) {
        setIsTabBarCompact(false);
        compactRef.current = false;
        scrollAnchor.current[tab] = y;
      }
    },
    [activeTab],
  );

  const value = useMemo(
    () => ({
      activeTab,
      activeHeader: headers[activeTab] ?? {},
      setActiveTab: activateTab,
      registerHeader,
      isTabBarCompact,
      reportScroll,
    }),
    [
      activeTab,
      activateTab,
      headers,
      isTabBarCompact,
      registerHeader,
      reportScroll,
    ],
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
