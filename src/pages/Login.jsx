import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate  = useNavigate();
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass,setShowPass]= useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !pass) { toast.error("Enter your email and password"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate("/dashboard");
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
            Welcome back to{" "}
            <span style={{ color:"#1E8A4C" }}>
              TerraIQ<span style={{ fontSize:32 }}>+</span>
            </span>
          </h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm">
            Sign in to your farm account
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 border border-deep-light dark:border-dark-light shadow-card">
          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">
                Email address
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
                Password
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
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>
        </div>

        <p className="text-center text-ink-500 dark:text-gray-400 mt-6 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-terra font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
