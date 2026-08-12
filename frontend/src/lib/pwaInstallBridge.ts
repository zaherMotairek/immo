/**
 * Capture précoce de `beforeinstallprompt` (avant le montage React),
 * sinon Chrome peut l’émettre trop tôt et le bouton ne peut plus installer.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferred: BeforeInstallPromptEvent | null = null;
let installed =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribePwaInstall(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function isPwaInstalled(): boolean {
  return installed;
}

export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  notify();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === 'accepted') {
    installed = true;
    notify();
  }
  return outcome;
}

/** Attendre un peu que Chrome émette l’événement (après SW + manifeste). */
export function waitForInstallPrompt(timeoutMs = 2500): Promise<BeforeInstallPromptEvent | null> {
  if (deferred) return Promise.resolve(deferred);
  return new Promise((resolve) => {
    const t = window.setTimeout(() => {
      unsub();
      resolve(deferred);
    }, timeoutMs);
    const unsub = subscribePwaInstall(() => {
      if (!deferred) return;
      window.clearTimeout(t);
      unsub();
      resolve(deferred);
    });
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}
