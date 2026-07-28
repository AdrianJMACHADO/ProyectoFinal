import { useNavigationChrome } from '@/contexts/NavigationChromeContext';
import React, { useCallback, useEffect, useRef } from 'react';

type Props = {
  tab: string;
  availableYears?: string[];
  selectedYear?: string | null;
  onYearChange?: (year: string | null) => void;
};

export function NavigationHeaderRegistration({
  tab,
  availableYears,
  selectedYear,
  onYearChange,
}: Props) {
  const { registerHeader } = useNavigationChrome();
  const onYearChangeRef = useRef(onYearChange);
  onYearChangeRef.current = onYearChange;
  const handleYearChange = useCallback((year: string | null) => {
    onYearChangeRef.current?.(year);
  }, []);

  useEffect(() => {
    registerHeader(tab, {
      availableYears,
      selectedYear,
      onYearChange: onYearChange ? handleYearChange : undefined,
    });
  }, [
    availableYears,
    handleYearChange,
    onYearChange !== undefined,
    registerHeader,
    selectedYear,
    tab,
  ]);

  return null;
}
