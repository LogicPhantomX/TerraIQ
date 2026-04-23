import "./i18n/index";  
import i18n from "i18next";        // MUST be first — loads translations before anything renders
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Read saved language on startup — check our key first, then i18next default
const VALID_LANGS = ["en", "yo", "ha", "ig"];
const savedLang =
  localStorage.getItem("terraiq-lang") ||
  localStorage.getItem("i18nextLng") ||
  "en";
const startLang = VALID_LANGS.includes(savedLang) ? savedLang : "en";
if (startLang !== "en") {
  i18n.changeLanguage(startLang);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
