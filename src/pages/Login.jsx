import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate  = useNavigate();
  const { t } = useTranslation();
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass,setShowPass]= useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !pass) { toast.error(t("auth.enterEmailPassword")); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const returnTo = sessionStorage.getItem("terraiq_return_to") || "/dashboard";
    sessionStorage.removeItem("terraiq_return_to");
    navigate(returnTo);
  };

  const iClass = "w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm";

  return (
    <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <img
            src="/icon.png"
            alt="TerraIQ+"
            style={{ width:72, height:72, borderRadius:18, objectFit:"cover", margin:"0 auto 16px", display:"block" }}
          />
          <h1 className="text-ink dark:text-white font-black" style={{ fontSize:28 }}>
            {t("auth.welcomeBack")}{" "}
            <span style={{ color:"#1E8A4C" }}>
              TerraIQ<span style={{ fontSize:32 }}>+</span>
            </span>
          </h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm">
            {t("auth.signInAccount")}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 border border-deep-light dark:border-dark-light shadow-card">
          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={iClass}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  className={`${iClass} pr-12`}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 dark:text-gray-400 hover:text-ink dark:hover:text-white text-sm"
                >
                  {showPass ? "Hide" : t("auth.show")}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Signing in..." : t("auth.signIn")}
            </button>

          </form>
        </div>

        <p className="text-center text-ink-500 dark:text-gray-400 mt-6 text-sm">
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="text-terra font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
