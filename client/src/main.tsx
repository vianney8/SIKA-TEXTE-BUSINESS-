import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
      })
      .catch(error => {
        console.log('Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

let deferredPrompt: any;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('💡 L\'application peut être installée! Un bouton "Installer" apparaîtra dans le navigateur.');
});

window.addEventListener('appinstalled', () => {
  console.log('✅ Application installée avec succès!');
  deferredPrompt = null;
});

createRoot(document.getElementById("root")!).render(<App />);
