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
 * Installation PWA : boîte native du navigateur (Chrome / Edge / Android / desktop).
 * iOS Safari : pas d’API d’installation programmatique — le bouton reste masqué.
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
    const ev = await waitForInstallPrompt(6000);
    if (!ev) return 'unavailable';
    return triggerPwaInstall();
  }, []);

  /** Afficher le bouton seulement si l’install native est possible (pas iOS, HTTPS/localhost, pas déjà installé). */
  const showInstallUi = !installed && !ios && secure;

  return {
    installed,
    canPrompt,
    isSecureContext: secure,
    showInstallUi,
    promptInstall,
    isIos: ios,
  };
}
