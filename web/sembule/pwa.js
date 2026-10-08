let installEvent;
export function initPWA(notify) {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; });
  window.addEventListener('appinstalled', () => { installEvent = null; notify('Sembule Media is installed.'); });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) notify('A Sembule Media update is ready. Refresh this page to load the latest features.');
      hadController = true;
    });
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
      const announce = () => { if (registration.waiting) notify('An update is ready. Refresh this page to load it.'); };
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
