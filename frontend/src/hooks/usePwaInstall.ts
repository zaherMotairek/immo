import { useCallback, useEffect, useState } from 'react';
import {
  getDeferredInstallPrompt,
  isPwaInstalled,
  subscribePwaInstall,
  triggerPwaInstall,
  waitForInstallPrompt,
} from '@/lib/pwaInstallBridge';

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

/**
 * Installation PWA : priorise la boîte native du navigateur (Chrome / Edge / Android).
 */
export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(() => Boolean(getDeferredInstallPrompt()) && !isPwaInstalled());
  const [installed, setInstalled] = useState(() => isPwaInstalled());
  const [ios] = useState(() => isIosDevice());

  useEffect(() => {
    return subscribePwaInstall(() => {
      setInstalled(isPwaInstalled());
      setCanPrompt(Boolean(getDeferredInstallPrompt()) && !isPwaInstalled());
    });
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (getDeferredInstallPrompt()) {
      return triggerPwaInstall();
    }
    const ev = await waitForInstallPrompt(2800);
    if (!ev) return 'unavailable';
    return triggerPwaInstall();
  }, []);

  return {
    installed,
    canPrompt,
    needsIosGuide: ios && !installed,
    showInstallUi: !installed,
    promptInstall,
    isIos: ios,
  };
}
