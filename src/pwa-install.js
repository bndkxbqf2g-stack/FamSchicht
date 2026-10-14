let deferredInstallPrompt = null;
const changeListeners = new Set();

export function detectPwaInstallContext({
  userAgent = '',
  platform = '',
  maxTouchPoints = 0,
  standalone = false,
  displayModeStandalone = false,
  canPrompt = false,
} = {}) {
  const ios = /iphone|ipad|ipod/i.test(userAgent) ||
    (platform === 'MacIntel' && Number(maxTouchPoints) > 1);
  return {
    isIos: ios,
    isInstalled: Boolean(standalone || displayModeStandalone),
    canPrompt: Boolean(canPrompt),
  };
}

export function pwaInstallState(context = {}) {
  const normalized = ['isIos', 'isInstalled', 'canPrompt'].some(key => Object.hasOwn(context, key))
    ? {
      isIos: Boolean(context.isIos),
      isInstalled: Boolean(context.isInstalled),
      canPrompt: Boolean(context.canPrompt),
    }
    : detectPwaInstallContext(context);
  if (normalized.isInstalled) {
    return {
      kind: 'installed',
      title: 'FamSchicht ist installiert',
      message: 'Die App ist bereits als eigene Anwendung geöffnet.',
    };
  }
  if (normalized.canPrompt) {
    return {
      kind: 'prompt',
      title: 'FamSchicht installieren',
      message: 'Installiere FamSchicht für einen direkten Start vom Home-Bildschirm.',
    };
  }
  if (normalized.isIos) {
    return {
      kind: 'ios',
      title: 'Auf dem iPhone installieren',
      message: 'Safari: Teilen öffnen und „Zum Home-Bildschirm“ wählen. Danach startet FamSchicht wie eine eigene App.',
    };
  }
  return {
    kind: 'manual',
    title: 'Als App installieren',
    message: 'Öffne das Browsermenü und wähle „Installieren“ oder „Zum Startbildschirm hinzufügen“, sofern dein Browser diese Funktion anbietet.',
  };
}

function browserContext() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: navigator.standalone === true,
    displayModeStandalone: window.matchMedia?.('(display-mode: standalone)').matches === true,
    canPrompt: Boolean(deferredInstallPrompt),
  };
}

export function getPwaInstallState() {
  return pwaInstallState(browserContext());
}

function notifyChange() {
  changeListeners.forEach(listener => listener());
}

export function initPwaInstall(onChange = () => {}) {
  if (typeof window === 'undefined') return () => {};
  changeListeners.add(onChange);
  const handleBeforeInstallPrompt = event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    notifyChange();
  };
  const handleInstalled = () => {
    deferredInstallPrompt = null;
    notifyChange();
  };
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleInstalled);
  return () => {
    changeListeners.delete(onChange);
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleInstalled);
  };
}

export async function promptPwaInstall() {
  if (!deferredInstallPrompt) return {outcome: 'unavailable'};
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    notifyChange();
    return choice;
  } catch {
    notifyChange();
    return {outcome: 'dismissed'};
  }
}

