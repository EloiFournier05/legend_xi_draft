import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GameSessionProvider } from "./session/GameSessionProvider";
import "./index.css";
import "./homeCover.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameSessionProvider>
      <App />
    </GameSessionProvider>
  </StrictMode>,
);
