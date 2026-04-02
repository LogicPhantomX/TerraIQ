// ── PASTE THIS OVER THE LANDING PAGE NAVBAR SECTION ──────────────────
// Replace whatever nav/header you have at the top of Landing.jsx with this

import { useState } from "react";
import { Link } from "react-router-dom";

// ── Standalone nav for Landing page ──────────────────────────────────
function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:50,
      backgroundColor:"rgba(13,31,23,0.95)",
      backdropFilter:"blur(12px)",
      borderBottom:"1px solid rgba(30,138,76,0.2)",
      height:52,
      display:"flex", alignItems:"center",
      paddingLeft:"clamp(12px,4vw,32px)",
      paddingRight:"clamp(12px,4vw,32px)",
    }}>
      {/* Logo + wordmark */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <img src="/icon.png" alt="TerraIQ+"
          style={{ width:28, height:28, borderRadius:7, objectFit:"cover" }} />
        <span style={{ fontWeight:900, fontSize:14, color:"white", whiteSpace:"nowrap" }}>
          TerraIQ<span style={{ color:"#1E8A4C", fontSize:16 }}>+</span>
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex:1 }} />

      {/* Desktop links */}
      <div className="hidden sm:flex items-center gap-3">
        <Link to="/login"
          style={{ color:"#9CA3AF", fontSize:13, fontWeight:600, textDecoration:"none",
            padding:"6px 14px", borderRadius:8, whiteSpace:"nowrap" }}
          className="hover:text-white transition-colors">
          Sign in
        </Link>
        <Link to="/signup"
          style={{ backgroundColor:"#1E8A4C", color:"white", fontSize:13, fontWeight:700,
            padding:"7px 16px", borderRadius:9, textDecoration:"none", whiteSpace:"nowrap",
            boxShadow:"0 2px 8px rgba(30,138,76,0.4)" }}
          className="hover:bg-green-600 transition-colors">
          Get Started
        </Link>
      </div>

      {/* Mobile — just two buttons, no hamburger needed */}
      <div className="flex sm:hidden items-center gap-2">
        <Link to="/login"
          style={{ color:"#9CA3AF", fontSize:12, fontWeight:600, textDecoration:"none",
            padding:"5px 10px", borderRadius:7, whiteSpace:"nowrap", border:"1px solid rgba(255,255,255,0.12)" }}>
          Sign in
        </Link>
        <Link to="/signup"
          style={{ backgroundColor:"#1E8A4C", color:"white", fontSize:12, fontWeight:700,
            padding:"5px 12px", borderRadius:7, textDecoration:"none", whiteSpace:"nowrap" }}>
          Sign up
        </Link>
      </div>
    </nav>
  );
}

export default LandingNav;
// ── Usage in Landing.jsx ──────────────────────────────────────────────
// import LandingNav from "@/components/LandingNav"; (or inline it)
// Add <LandingNav /> as the very first element inside your Landing return
// Add style={{ paddingTop: 52 }} to whatever wraps the content below the nav
