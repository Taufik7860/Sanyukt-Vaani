import React, { useState } from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";
import { LanguageProvider } from "./context/LanguageContext";

const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);