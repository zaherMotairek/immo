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

/** Chrome n’émet `beforeinstallprompt` que en contexte sécurisé (HTTPS ou localhost). */
function isInstallableContext(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

/**
 * Installation PWA : priorise la boîte native du navigateur (Chrome / Edge / Android).
 */
export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(() => Boolean(getDeferredInstallPrompt()) && !isPwaInstalled());
  const [installed, setInstalled] = useState(() => isPwaInstalled());
  const [ios] = useState(() => isIosDevice());
  const [secure] = useState(() => isInstallableContext());

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
    const ev = await waitForInstallPrompt(3200);
    if (!ev) return 'unavailable';
    return triggerPwaInstall();
  }, []);

  return {
    installed,
    canPrompt,
    /** Contexte HTTPS / localhost : l’API d’install peut fonctionner. */
    isSecureContext: secure,
    needsIosGuide: ios && !installed,
    showInstallUi: !installed,
    promptInstall,
    isIos: ios,
  };
}
