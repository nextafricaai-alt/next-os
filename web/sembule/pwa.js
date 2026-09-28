let installEvent;
export function initPWA(notify) {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; });
  window.addEventListener('appinstalled', () => { installEvent = null; notify('Sembule Media is installed.'); });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
      const announce = () => { if (registration.waiting) notify('An update is ready. Close all app windows and reopen to use it.'); };
      announce();
      registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', announce));
    }).catch(() => notify('Phone installation is unavailable right now. You can keep using this page.'));
  }
}
export async function installApp(notify) {
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return notify('Sembule Media is already open as an app.');
  if (installEvent) {
    const event = installEvent; installEvent = null;
    await event.prompt(); await event.userChoice;
  } else {
    document.getElementById('install-dialog').showModal();
  }
}
