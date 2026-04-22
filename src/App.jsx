import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState, Suspense, lazy } from "react";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { useLanguageSync } from "@/hooks/useLanguage";

// Lazy load pages
const HarvestPage = lazy(() => import("@/pages/HarvestPage"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const CoopPage = lazy(() => import("@/pages/Cooperative"));
const LandingPage = lazy(() => import("@/pages/Landing"));
const LoginPage = lazy(() => import("@/pages/Login"));
const SignupPage = lazy(() => import("@/pages/Signup"));
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));
const DemoPage = lazy(() => import("@/pages/Demo"));
const ScannerPage = lazy(() => import("@/pages/Scanner"));
const ScanHistoryPage = lazy(() => import("@/pages/ScanHistory"));
const SmartSoilPage = lazy(() => import("@/pages/SmartSoil"));
const OnboardingPage = lazy(() => import("@/pages/Onboarding"));
const IrrigationPage = lazy(() => import("@/pages/IrrigationPage"));
const MarketPage = lazy(() => import("@/pages/AIPages").then(module => ({ default: module.MarketPage })));
const AnalyticsPage = lazy(() => import("@/pages/AIPages").then(module => ({ default: module.AnalyticsPage })));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const CropGrowthPage = lazy(() => import("@/pages/CropGrowthPage"));

// ── Syncs farmer's saved language from Supabase into the whole app ────
function LanguageSync() {
  useLanguageSync();
  return null;
}

function Protected({ children }) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center">
      <div style={{ textAlign: "center" }}>
        <img src="/icon.png" alt="TerraIQ+" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", margin: "0 auto 16px", display: "block" }} />
        <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
  return session ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageSync />
        <Toaster position="top-center" gutter={12} toastOptions={{
          duration: 3500,
          style: { background: "#1E8A4C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 12, padding: "12px 18px", boxShadow: "0 4px 16px rgba(30,138,76,0.35)" },
          success: { iconTheme: { primary: "#fff", secondary: "#1E8A4C" } },
          error:   { style: { background: "#C0392B" }, iconTheme: { primary: "#fff", secondary: "#C0392B" } },
          loading: { style: { background: "#243B2C" } },
        }} />
        <Suspense fallback={
          <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center">
            <div style={{ textAlign: "center" }}>
              <img src="/icon.png" alt="TerraIQ+" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", margin: "0 auto 16px", display: "block" }} />
              <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </div>
        }>
          <Routes>
            {/* Public */}
            <Route path="/"        element={<LandingPage />} />
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/signup"  element={<SignupPage />} />
            <Route path="/demo"    element={<DemoPage />} />
            <Route path="/welcome" element={<OnboardingPage />} />

            {/* Protected */}
            <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
            <Route path="/dashboard"     element={<Protected><DashboardPage /></Protected>} />
            <Route path="/scanner"       element={<Protected><ScannerPage /></Protected>} />
            <Route path="/scans"         element={<Protected><ScanHistoryPage /></Protected>} />
            <Route path="/soil"          element={<Protected><SmartSoilPage /></Protected>} />
            <Route path="/irrigation"    element={<Protected><IrrigationPage /></Protected>} />
            <Route path="/harvest"       element={<Protected><HarvestPage /></Protected>} />
            <Route path="/market"        element={<Protected><MarketPage /></Protected>} />
            <Route path="/analytics"     element={<Protected><AnalyticsPage /></Protected>} />
            <Route path="/cooperative"   element={<Protected><CoopPage /></Protected>} />
            <Route path="/profile"       element={<Protected><ProfilePage /></Protected>} />
            <Route path="/history"       element={<Protected><HistoryPage /></Protected>} />
            <Route path="/growth"        element={<Protected><CropGrowthPage /></Protected>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    </AuthProvider>
  );
}
