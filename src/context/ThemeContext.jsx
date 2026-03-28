import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

// CSS for both themes injected directly into the page
// This bypasses Tailwind entirely so it always works
const LIGHT_CSS = `
  body { background-color: #F8FAFB !important; color: #0F1F17 !important; }
  .sidebar { background-color: #FFFFFF !important; border-color: #E8F0ED !important; }
  .card    { background-color: #FFFFFF !important; border-color: #E8F0ED !important; }
  .card-mid{ background-color: #F8FAFB !important; }
  .input   { background-color: #FFFFFF !important; color: #0F1F17 !important; border-color: #E8F0ED !important; }
  .text-main   { color: #0F1F17 !important; }
  .text-sub    { color: #5A6B62 !important; }
  .nav-inactive { color: #5A6B62 !important; }
  .nav-inactive:hover { background-color: #F1F7F4 !important; color: #0F1F17 !important; }
`;

const DARK_CSS = `
  body { background-color: #0D1F17 !important; color: #FFFFFF !important; }
  .sidebar { background-color: #162E1F !important; border-color: #1E4230 !important; }
  .card    { background-color: #243B2C !important; border-color: #1E4230 !important; }
  .card-mid{ background-color: #162E1F !important; }
  .input   { background-color: #162E1F !important; color: #FFFFFF !important; border-color: #1E4230 !important; }
  .text-main   { color: #FFFFFF !important; }
  .text-sub    { color: #9CA3AF !important; }
  .nav-inactive { color: #9CA3AF !important; }
  .nav-inactive:hover { background-color: #243B2C !important; color: #FFFFFF !important; }
`;

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("terraiq-theme") === "dark");

  useEffect(() => {
    // Inject CSS directly — works regardless of Tailwind
    let styleEl = document.getElementById("terraiq-theme-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "terraiq-theme-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = isDark ? DARK_CSS : LIGHT_CSS;
    localStorage.setItem("terraiq-theme", isDark ? "dark" : "light");

    // Also set Tailwind dark class as backup
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
