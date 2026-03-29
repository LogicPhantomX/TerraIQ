import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { icon:"⊙", title:"Crop Scanner",    desc:"Point your camera at any crop. AI diagnoses disease, weeds, and pests in 5 seconds with a full treatment plan in Naira." },
  { icon:"◈", title:"Soil Analysis",   desc:"Enter soil readings. Get Allamanda Compost, Allamanda Biochar, and Allamanda Soil Supplement recommendations for your exact soil." },
  { icon:"◎", title:"Irrigation Plan", desc:"GPS-based 7-day watering schedule built from your live weather forecast. Know exactly when and how much to water." },
  { icon:"❧", title:"Harvest Tracker", desc:"Log your harvest. Get shelf-life predictions and WhatsApp alerts before your produce spoils." },
  { icon:"◆", title:"Market Advisor",  desc:"Real Naira prices. Best markets near you. When to sell and how to negotiate a better deal." },
  { icon:"◉", title:"Cooperative",     desc:"Join a farmer group. See disease outbreaks on a live map. Get instant alerts from your cooperative admin." },
];

const STATS = [
  { value:"36M+",  label:"Nigerian Smallholder Farmers" },
  { value:"40%",   label:"Average Crop Loss to Disease"  },
  { value:"5 sec", label:"To Diagnose Any Crop Problem"  },
  { value:"4",     label:"Languages Supported"           },
];

const ALLAMANDA = [
  { name:"Allamanda Compost",         desc:"Feeds the soil organically. Improves structure and water retention season after season." },
  { name:"Allamanda Biochar",          desc:"Locks nutrients in the soil so they don't wash away. Works for 10+ years after one application." },
  { name:"Allamanda Soil Supplement",  desc:"Corrects specific mineral deficiencies found in your soil test. Targeted and precise." },
];

function LogoMark({ size = 36, radius }) {
  return <img src="/icon.png" alt="TerraIQ+" style={{ width:size, height:size, borderRadius:radius??size*0.28, objectFit:"cover", flexShrink:0, display:"block" }} />;
}

function Wordmark({ size = 28, color = "#0F1F17" }) {
  return (
    <span style={{ fontWeight:900, fontSize:size, color, letterSpacing:"-0.5px" }}>
      TerraIQ<span style={{ color:"#1E8A4C", fontSize:size*1.15, verticalAlign:"middle", marginLeft:1 }}>+</span>
    </span>
  );
}

export default function LandingPage() {
  const { isDark } = useTheme();
  const bg      = isDark ? "#0D1F17" : "#FFFFFF";
  const bgMid   = isDark ? "#162E1F" : "#F8FAFB";
  const bgCard  = isDark ? "#243B2C" : "#FFFFFF";
  const border  = isDark ? "#1E4230" : "#E5E7EB";
  const textMain= isDark ? "#FFFFFF" : "#0F1F17";
  const textSub = isDark ? "#9CA3AF" : "#6B7280";

  return (
    <div style={{ minHeight:"100vh", backgroundColor:bg, color:textMain, fontFamily:"Inter, sans-serif", transition:"all 0.3s" }}>

      {/* Navbar */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:999, backgroundColor: isDark ? "rgba(13,31,23,0.95)" : "rgba(255,255,255,0.97)", backdropFilter:"blur(12px)", borderBottom:`1px solid ${border}` }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 20px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LogoMark size={36} />
            <Wordmark size={18} color={textMain} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <ThemeToggle />
            <Link to="/login" style={{ color:textSub, textDecoration:"none", fontSize:14, fontWeight:500, padding:"8px 14px", whiteSpace:"nowrap" }}>Sign In</Link>
            <Link to="/signup" style={{ backgroundColor:"#1E8A4C", color:"white", padding:"9px 20px", borderRadius:12, textDecoration:"none", fontSize:14, fontWeight:700, whiteSpace:"nowrap", boxShadow:"0 2px 8px rgba(30,138,76,0.3)" }}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop:100, paddingBottom:80, paddingLeft:20, paddingRight:20, textAlign:"center" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
              <LogoMark size={88} radius={22} />
            </div>
            <span style={{ display:"inline-block", backgroundColor: isDark ? "rgba(30,138,76,0.2)" : "#E8F5EE", color:"#1E8A4C", fontSize:13, fontWeight:600, padding:"6px 18px", borderRadius:999, marginBottom:24, border:`1px solid ${isDark ? "rgba(30,138,76,0.3)" : "#B7DFC8"}` }}>
              Built for Nigerian Farmers · Powered by AI
            </span>
            <h1 style={{ fontSize:"clamp(32px, 6vw, 60px)", fontWeight:900, lineHeight:1.15, marginBottom:24, color:textMain }}>
              Intelligent Agriculture.<br />
              <span style={{ color:"#1E8A4C" }}>Real Impact.</span>
            </h1>
            <p style={{ fontSize:"clamp(15px, 2vw, 19px)", color:textSub, maxWidth:560, margin:"0 auto 40px", lineHeight:1.7 }}>
              Detect crop diseases in 5 seconds. Analyse your soil. Plan irrigation. Track harvests. Sell smarter.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", padding:"0 16px" }}>
              <Link to="/signup" style={{ backgroundColor:"#1E8A4C", color:"white", padding:"16px 36px", borderRadius:16, textDecoration:"none", fontSize:16, fontWeight:700, boxShadow:"0 4px 16px rgba(30,138,76,0.35)", display:"inline-block" }}>Start Free Today</Link>
              <Link to="/login"  style={{ backgroundColor: isDark ? "#243B2C" : "white", color:textMain, padding:"16px 36px", borderRadius:16, textDecoration:"none", fontSize:16, fontWeight:700, border:`2px solid ${border}`, display:"inline-block" }}>Sign In</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ backgroundColor:bgMid, borderTop:`1px solid ${border}`, borderBottom:`1px solid ${border}`, padding:"48px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"32px 48px" }}>
          {STATS.map((s,i) => (
            <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }} style={{ textAlign:"center" }}>
              <div style={{ color:"#1E8A4C", fontSize:"clamp(24px, 4vw, 34px)", fontWeight:900 }}>{s.value}</div>
              <div style={{ color:textSub, fontSize:13, marginTop:6 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:"80px 20px" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(24px, 4vw, 36px)", fontWeight:900, textAlign:"center", marginBottom:12, color:textMain }}>Everything a Nigerian farmer needs</h2>
          <p style={{ color:textSub, textAlign:"center", maxWidth:500, margin:"0 auto 56px", fontSize:15, lineHeight:1.6 }}>One platform. Every tool. Built specifically for Nigerian soil, crops, markets, and languages.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:20 }}>
            {FEATURES.map((f,i) => (
              <motion.div key={i} initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }} viewport={{ once:true }}
                style={{ backgroundColor:bgCard, padding:24, borderRadius:20, border:`1px solid ${border}`, boxShadow: isDark ? "none" : "0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ width:44, height:44, borderRadius:12, marginBottom:16, fontSize:20, backgroundColor: isDark ? "rgba(30,138,76,0.2)" : "#E8F5EE", color:"#1E8A4C", display:"flex", alignItems:"center", justifyContent:"center" }}>{f.icon}</div>
                <h3 style={{ color:textMain, fontWeight:700, fontSize:15, marginBottom:8 }}>{f.title}</h3>
                <p style={{ color:textSub, fontSize:13, lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Allamanda */}
      <section style={{ backgroundColor: isDark ? "rgba(30,138,76,0.07)" : "#F0FBF4", borderTop:`1px solid ${isDark ? "rgba(30,138,76,0.2)" : "#C3E6D0"}`, borderBottom:`1px solid ${isDark ? "rgba(30,138,76,0.2)" : "#C3E6D0"}`, padding:"72px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", textAlign:"center" }}>
          <span style={{ display:"inline-block", backgroundColor: isDark ? "rgba(224,123,0,0.2)" : "#FFF3E0", color:"#E07B00", fontSize:12, fontWeight:700, padding:"5px 16px", borderRadius:999, marginBottom:20, border:"1px solid rgba(224,123,0,0.3)" }}>Recommended Partner</span>
          <h2 style={{ fontSize:"clamp(22px, 4vw, 32px)", fontWeight:900, color:textMain, marginBottom:12 }}>Powered by Allamanda Innovations</h2>
          <p style={{ color:textSub, maxWidth:500, margin:"0 auto 48px", fontSize:15, lineHeight:1.6 }}>Every soil analysis recommends the complete Allamanda Innovations product range for healthier soil and better yields.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:16 }}>
            {ALLAMANDA.map((p,i) => (
              <div key={i} style={{ backgroundColor:bgCard, padding:22, borderRadius:18, border:`1px solid ${isDark ? "rgba(30,138,76,0.25)" : "#C3E6D0"}`, textAlign:"left" }}>
                <div style={{ width:36, height:36, borderRadius:10, backgroundColor: isDark ? "rgba(30,138,76,0.25)" : "#E8F5EE", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14, color:"#1E8A4C", fontWeight:900, fontSize:15 }}>A</div>
                <p style={{ color:textMain, fontWeight:700, fontSize:14, marginBottom:6 }}>{p.name}</p>
                <p style={{ color:textSub, fontSize:13, lineHeight:1.6, margin:0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"80px 20px", textAlign:"center" }}>
        <h2 style={{ fontSize:"clamp(24px, 4vw, 36px)", fontWeight:900, color:textMain, marginBottom:12 }}>Ready to grow smarter?</h2>
        <p style={{ color:textSub, marginBottom:36, fontSize:15 }}>Join thousands of Nigerian farmers already using TerraIQ+.</p>
        <Link to="/signup" style={{ display:"inline-block", backgroundColor:"#1E8A4C", color:"white", padding:"18px 52px", borderRadius:16, textDecoration:"none", fontSize:17, fontWeight:700, boxShadow:"0 4px 16px rgba(30,138,76,0.35)" }}>Create Free Account</Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:`1px solid ${border}`, padding:"32px 20px", backgroundColor:bgMid }}>
        <div style={{ maxWidth:1060, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LogoMark size={28} />
            <Wordmark size={14} color={textMain} />
          </div>
          <p style={{ color:textSub, fontSize:13, margin:0 }}>Built for Nigeria. Powered by AI. © 2026 TerraIQ+ · Allamanda Innovations</p>
        </div>
      </footer>
    </div>
  );
}
