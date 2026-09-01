// src/utils/deviceMode.js

/**
 * Detecta se a aplicação está sendo acessada estritamente na porta 2515 (Modo de teste emulado)
 */
export function isMobilePort() {
  if (typeof window === 'undefined') return false;
  const port = String(window.location.port || '');
  const search = window.location.search || '';
  return port === '2515' || search.includes('port=2515');
}

/**
 * Inicializa a classe no body apenas se estiver estritamente na porta 2515
 */
export function initDeviceMode() {
  if (typeof window === 'undefined') return;
  
  const applyMode = () => {
    const isMob = isMobilePort();
    if (isMob) {
      document.body.classList.add('mode-mobile-2515');
      document.documentElement.setAttribute('data-device-mode', 'mobile');
      document.documentElement.setAttribute('data-port', '2515');
    } else {
      document.body.classList.remove('mode-mobile-2515');
      document.documentElement.removeAttribute('data-device-mode');
      document.documentElement.removeAttribute('data-port');
    }
  };

  applyMode();
  window.addEventListener('popstate', applyMode);
}
