import "./i18n/index";  
import i18n from "i18next";        // MUST be first — loads translations before anything renders
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";


const savedLang = localStorage.getItem("lang");
if (savedLang) {
  i18n.changeLanguage(savedLang);
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
