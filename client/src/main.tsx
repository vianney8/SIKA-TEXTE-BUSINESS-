import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, showInstallPrompt } from "./registerSW";

registerServiceWorker();
showInstallPrompt();

createRoot(document.getElementById("root")!).render(<App />);
