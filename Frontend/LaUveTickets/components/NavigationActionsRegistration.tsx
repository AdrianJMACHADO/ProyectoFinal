import { useNavigationChrome } from '@/contexts/NavigationChromeContext';
import React, { useCallback, useEffect, useRef } from 'react';

type Props = {
  tab: string;
  onCreate?: () => void;
  onScan?: () => void;
};

export function NavigationActionsRegistration({
  tab,
  onCreate,
  onScan,
}: Props) {
  const { registerActions } = useNavigationChrome();
  const createRef = useRef(onCreate);
  const scanRef = useRef(onScan);
  createRef.current = onCreate;
  scanRef.current = onScan;

  const handleCreate = useCallback(() => createRef.current?.(), []);
  const handleScan = useCallback(() => scanRef.current?.(), []);

  useEffect(() => {
    registerActions(tab, {
      onCreate: onCreate ? handleCreate : undefined,
      onScan: onScan ? handleScan : undefined,
    });
  }, [
    handleCreate,
    handleScan,
    onCreate !== undefined,
    onScan !== undefined,
    registerActions,
    tab,
  ]);

  return null;
}
