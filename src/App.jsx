import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

import { HarvestPage } from "@/pages/HarvestPage";
import NotificationsPage from "@/pages/Notifications";
import CoopPage from "@/pages/Cooperative";
import LandingPage    from "@/pages/Landing";
import LoginPage      from "@/pages/Login";
import SignupPage     from "@/pages/Signup";
import DashboardPage  from "@/pages/Dashboard";   // ← new dashboard with weather + ticker
import ProfilePage    from "@/pages/Profile";
import NotFoundPage   from "@/pages/NotFound";
import DemoPage       from "@/pages/Demo";
import ScannerPage    from "@/pages/Scanner";
import ScanHistoryPage from "@/pages/ScanHistory";
import SmartSoilPage  from "@/pages/SmartSoil";   // ← replaces old Soil page
import OnboardingPage from "@/pages/Onboarding";
 import IrrigationPage from "@/pages/IrrigationPage";
import {MarketPage, AnalyticsPage} from "@/pages/AIPages";
import HistoryPage from "@/pages/HistoryPage";

function Protected({ children }) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center">
      <div style={{ textAlign:"center" }}>
        <img src="/icon.png" alt="TerraIQ+" style={{ width:56, height:56, borderRadius:14, objectFit:"cover", margin:"0 auto 16px", display:"block" }} />
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
      <Toaster position="top-center" gutter={12} toastOptions={{
        duration: 3500,
        style: { background:"#1E8A4C", color:"#fff", fontWeight:600, fontSize:14, borderRadius:12, padding:"12px 18px", boxShadow:"0 4px 16px rgba(30,138,76,0.35)" },
        success: { iconTheme: { primary:"#fff", secondary:"#1E8A4C" } },
        error:   { style:{ background:"#C0392B" }, iconTheme: { primary:"#fff", secondary:"#C0392B" } },
        loading: { style:{ background:"#243B2C" } },
      }} />
      <Routes>
        {/* Public */}
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/signup"    element={<SignupPage />} />
        <Route path="/demo"      element={<DemoPage />} />
        <Route path="/welcome"   element={<OnboardingPage />} />

        {/* Protected */}
        <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="/dashboard"   element={<Protected><DashboardPage /></Protected>} />
        <Route path="/scanner"     element={<Protected><ScannerPage /></Protected>} />
        <Route path="/scans"       element={<Protected><ScanHistoryPage /></Protected>} />
        <Route path="/soil"        element={<Protected><SmartSoilPage /></Protected>} />
        <Route path="/irrigation"  element={<Protected><IrrigationPage /></Protected>} />
        <Route path="/harvest"     element={<Protected><HarvestPage /></Protected>} />
        <Route path="/market"      element={<Protected><MarketPage /></Protected>} />
        <Route path="/analytics"   element={<Protected><AnalyticsPage /></Protected>} />
        <Route path="/cooperative" element={<Protected><CoopPage /></Protected>} />
        <Route path="/profile"     element={<Protected><ProfilePage /></Protected>} />
        <Route path="/history"     element={<Protected><HistoryPage /></Protected>} />
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ThemeProvider>
    </AuthProvider>
  );
}
