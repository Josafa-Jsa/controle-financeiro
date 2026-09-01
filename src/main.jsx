// // src/main.jsx
// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import App from './App.jsx'
// import './styles.css'

// // inicia o watcher de sessão (12h)
// import { initAuthWatcher } from './auth/auth.js'
// try { initAuthWatcher(); } catch (e) { console.error('auth watcher init failed', e); }

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
// )


// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './components/Visual/styles.css'
import './components/Visual/mobileExclusive2515.css'

import { initAuthWatcher } from './auth/auth.js'
import { initDeviceMode } from './utils/deviceMode.js'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'

try { 
  initAuthWatcher(); 
  initDeviceMode();

  // Configuração Nativa de StatusBar e Android
  if (typeof window !== 'undefined' && (Boolean(window.Capacitor) || window.location.protocol === 'capacitor:')) {
    document.body.classList.add('capacitor-native-app');
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#555a60' }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      }
    }).catch(() => {});
  }
} catch (e) { 
  console.error('startup init failed', e); 
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)