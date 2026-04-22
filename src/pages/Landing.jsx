import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { icon:"⊙", title:"Crop Scanner",    desc:"Point your camera at any plant. AI identifies crops, weeds, and trees — and diagnoses disease in 5 seconds with a full treatment plan in Naira." },
  { icon:"◈", title:"Soil Analysis",   desc:"Photo, 5 questions, or lab values. Get Allamanda Compost, Biochar, and Soil Supplement recommendations for your exact soil conditions." },
  { icon:"◎", title:"Irrigation Plan", desc:"7-day watering schedule built from your crop's growth stage, soil type, season, and live weather. Know exactly when and how much to water." },
  { icon:"❧", title:"Harvest Tracker", desc:"Log your harvest. Get live spoilage countdown and alerts before your produce is lost." },
  { icon:"◆", title:"Market Advisor",  desc:"Real Naira prices per kg and per tonne. Best markets near you. When to sell and how to negotiate." },
  { icon:"◉", title:"Cooperative",     desc:"Join a farmer group. Send disease and weather alerts to all members. React and comment on alerts." },
];

const STATS = [
  { value:"36M+",  label:"Nigerian Smallholder Farmers" },
  { value:"40%",   label:"Average Crop Loss to Disease"  },
  { value:"5 sec", label:"To Diagnose Any Crop Problem"  },
  { value:"4",     label:"Nigerian Languages Supported"  },
];

const ALLAMANDA = [
  { name:"Allamanda Compost",        desc:"Feeds the soil organically. Improves structure and water retention season after season." },
  { name:"Allamanda Biochar",        desc:"Locks nutrients in the soil so they don't wash away. Works for 10+ years after one application." },
  { name:"Allamanda Soil Supplement",desc:"Corrects specific mineral deficiencies found in your soil analysis. Targeted and precise." },
];

function LogoMark({ size = 36, radius }) {
  return (
    <img src="/icon.png" alt="TerraIQ+"
      style={{ width:size, height:size, borderRadius:radius ?? size*0.28,
        objectFit:"cover", flexShrink:0, display:"block" }} />
  );
}

function Wordmark({ size = 14, color = "#0F1F17" }) {
  return (
    <span style={{ fontWeight:900, fontSize:size, color, whiteSpace:"nowrap", letterSpacing:"-0.3px" }}>
      TerraIQ<span style={{ color:"#1E8A4C", fontSize:size*1.2, verticalAlign:"middle", marginLeft:1 }}>+</span>
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
    <div style={{ minHeight:"100vh", backgroundColor:bg, color:textMain,
      fontFamily:"Inter, sans-serif", transition:"all 0.3s" }}>

      {/* ── SINGLE NAVBAR ─────────────────────────────────────────── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:50,
        backgroundColor:"rgba(13,31,23,0.95)",
        backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(30,138,76,0.2)",
        height:52,
        display:"flex", alignItems:"center",
        paddingLeft:"clamp(10px, 4vw, 32px)",
        paddingRight:"clamp(10px, 4vw, 32px)",
        gap:8,
        minWidth:0,
        overflow:"hidden",
      }}>
        {/* Logo + wordmark */}
        <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
          <img src="/icon.png" alt="TerraIQ+"
            style={{ width:26, height:26, borderRadius:7, objectFit:"cover", flexShrink:0 }} />
          <span style={{ fontWeight:900, fontSize:13, color:"white", whiteSpace:"nowrap" }}>
            TerraIQ<span style={{ color:"#1E8A4C", fontSize:15 }}>+</span>
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex:1, minWidth:0 }} />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-2" style={{ flexShrink:0 }}>
          <Link to="/login" style={{
            color:"#9CA3AF", fontSize:13, fontWeight:600,
            textDecoration:"none", padding:"6px 14px", borderRadius:8, whiteSpace:"nowrap",
          }} className="hover:text-white transition-colors">Sign in</Link>
          <Link to="/signup" style={{
            backgroundColor:"#1E8A4C", color:"white", fontSize:13, fontWeight:700,
            padding:"7px 16px", borderRadius:9, textDecoration:"none", whiteSpace:"nowrap",
            boxShadow:"0 2px 8px rgba(30,138,76,0.4)",
          }} className="hover:bg-green-600 transition-colors">Get Started</Link>
        </div>

        {/* Mobile — compact buttons */}
        <div className="flex sm:hidden items-center gap-1.5" style={{ flexShrink:0 }}>
          <Link to="/login" style={{
            color:"#9CA3AF", fontSize:11, fontWeight:600, textDecoration:"none",
            padding:"5px 9px", borderRadius:7, whiteSpace:"nowrap",
            border:"1px solid rgba(255,255,255,0.15)",
          }}>In</Link>
          <Link to="/signup" style={{
            backgroundColor:"#1E8A4C", color:"white", fontSize:11, fontWeight:700,
            padding:"5px 10px", borderRadius:7, textDecoration:"none", whiteSpace:"nowrap",
          }}>Sign up</Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section style={{ paddingTop:100, paddingBottom:80,
        paddingLeft:"clamp(16px,5vw,40px)", paddingRight:"clamp(16px,5vw,40px)",
        textAlign:"center" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
              <LogoMark size={80} radius={20} />
            </div>
            <span style={{
              display:"inline-block",
              backgroundColor: isDark ? "rgba(30,138,76,0.2)" : "#E8F5EE",
              color:"#1E8A4C", fontSize:12, fontWeight:600,
              padding:"5px 16px", borderRadius:999, marginBottom:20,
              border:`1px solid ${isDark ? "rgba(30,138,76,0.3)" : "#B7DFC8"}`,
            }}>
              Built for Nigerian Farmers · Powered by AI
            </span>
            <h1 style={{
              fontSize:"clamp(28px, 7vw, 58px)", fontWeight:900,
              lineHeight:1.15, marginBottom:20, color:textMain,
            }}>
              Intelligent Agriculture.<br />
              <span style={{ color:"#1E8A4C" }}>Real Impact.</span>
            </h1>
            <p style={{
              fontSize:"clamp(14px, 2.5vw, 18px)", color:textSub,
              maxWidth:520, margin:"0 auto 36px", lineHeight:1.7,
            }}>
              Detect crop diseases in 5 seconds. Analyse your soil without a lab. Plan irrigation.
              Track harvests. Sell at the right price. All in your language.
            </p>
            <div style={{
              display:"flex", gap:10, justifyContent:"center",
              flexWrap:"wrap", padding:"0 8px",
            }}>
              <Link to="/signup" style={{
                backgroundColor:"#1E8A4C", color:"white",
                padding:"14px 32px", borderRadius:14, textDecoration:"none",
                fontSize:"clamp(13px,2vw,16px)", fontWeight:700,
                boxShadow:"0 4px 16px rgba(30,138,76,0.35)", display:"inline-block",
              }}>Start Free Today</Link>
              <Link to="/login" style={{
                backgroundColor: isDark ? "#243B2C" : "white", color:textMain,
                padding:"14px 32px", borderRadius:14, textDecoration:"none",
                fontSize:"clamp(13px,2vw,16px)", fontWeight:700,
                border:`2px solid ${border}`, display:"inline-block",
              }}>Sign In</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <section style={{
        backgroundColor:bgMid,
        borderTop:`1px solid ${border}`, borderBottom:`1px solid ${border}`,
        padding:"40px clamp(16px,5vw,40px)",
      }}>
        <div style={{
          maxWidth:800, margin:"0 auto",
          display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"28px 32px",
        }}>
          {STATS.map((s,i) => (
            <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.1 }} style={{ textAlign:"center" }}>
              <div style={{ color:"#1E8A4C", fontSize:"clamp(22px,4vw,32px)", fontWeight:900 }}>{s.value}</div>
              <div style={{ color:textSub, fontSize:"clamp(11px,1.5vw,13px)", marginTop:4 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section style={{ padding:"72px clamp(16px,5vw,40px)" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <h2 style={{
            fontSize:"clamp(20px,4vw,34px)", fontWeight:900,
            textAlign:"center", marginBottom:10, color:textMain,
          }}>Everything a Nigerian farmer needs</h2>
          <p style={{
            color:textSub, textAlign:"center", maxWidth:480,
            margin:"0 auto 48px", fontSize:"clamp(13px,1.8vw,15px)", lineHeight:1.6,
          }}>
            One platform. Every tool. Built for Nigerian soil, crops, markets, and languages.
          </p>
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,260px), 1fr))",
            gap:16,
          }}>
            {FEATURES.map((f,i) => (
              <motion.div key={i}
                initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
                transition={{ delay:i*0.06 }} viewport={{ once:true }}
                style={{
                  backgroundColor:bgCard, padding:"20px 18px", borderRadius:18,
                  border:`1px solid ${border}`,
                  boxShadow: isDark ? "none" : "0 1px 6px rgba(0,0,0,0.06)",
                }}>
                <div style={{
                  width:40, height:40, borderRadius:11, marginBottom:14, fontSize:18,
                  backgroundColor: isDark ? "rgba(30,138,76,0.2)" : "#E8F5EE",
                  color:"#1E8A4C", display:"flex", alignItems:"center", justifyContent:"center",
                }}>{f.icon}</div>
                <h3 style={{ color:textMain, fontWeight:700, fontSize:14, marginBottom:6 }}>{f.title}</h3>
                <p style={{ color:textSub, fontSize:12, lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALLAMANDA ─────────────────────────────────────────────── */}
      <section style={{
        backgroundColor: isDark ? "rgba(30,138,76,0.07)" : "#F0FBF4",
        borderTop:`1px solid ${isDark ? "rgba(30,138,76,0.2)" : "#C3E6D0"}`,
        borderBottom:`1px solid ${isDark ? "rgba(30,138,76,0.2)" : "#C3E6D0"}`,
        padding:"64px clamp(16px,5vw,40px)",
      }}>
        <div style={{ maxWidth:860, margin:"0 auto", textAlign:"center" }}>
          <span style={{
            display:"inline-block",
            backgroundColor: isDark ? "rgba(224,123,0,0.2)" : "#FFF3E0",
            color:"#E07B00", fontSize:11, fontWeight:700,
            padding:"4px 14px", borderRadius:999, marginBottom:18,
            border:"1px solid rgba(224,123,0,0.3)",
          }}>Recommended Partner</span>
          <h2 style={{
            fontSize:"clamp(20px,4vw,30px)", fontWeight:900,
            color:textMain, marginBottom:10,
          }}>Powered by Allamanda Innovations</h2>
          <p style={{
            color:textSub, maxWidth:460, margin:"0 auto 40px",
            fontSize:"clamp(13px,1.8vw,15px)", lineHeight:1.6,
          }}>
            Every soil analysis mandatorily recommends the complete Allamanda product range
            for healthier soil and better yields.
          </p>
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,220px), 1fr))",
            gap:14,
          }}>
            {ALLAMANDA.map((p,i) => (
              <div key={i} style={{
                backgroundColor:bgCard, padding:"20px 18px", borderRadius:16, textAlign:"left",
                border:`1px solid ${isDark ? "rgba(30,138,76,0.25)" : "#C3E6D0"}`,
              }}>
                <div style={{
                  width:34, height:34, borderRadius:9, marginBottom:12,
                  backgroundColor: isDark ? "rgba(30,138,76,0.25)" : "#E8F5EE",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#1E8A4C", fontWeight:900, fontSize:14,
                }}>A</div>
                <p style={{ color:textMain, fontWeight:700, fontSize:13, marginBottom:5 }}>{p.name}</p>
                <p style={{ color:textSub, fontSize:12, lineHeight:1.6, margin:0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding:"72px clamp(16px,5vw,40px)", textAlign:"center" }}>
        <h2 style={{ fontSize:"clamp(20px,4vw,34px)", fontWeight:900, color:textMain, marginBottom:10 }}>
          Ready to grow smarter?
        </h2>
        <p style={{ color:textSub, marginBottom:32, fontSize:"clamp(13px,1.8vw,15px)" }}>
          Join thousands of Nigerian farmers already using TerraIQ+.
        </p>
        <Link to="/signup" style={{
          display:"inline-block", backgroundColor:"#1E8A4C", color:"white",
          padding:"16px 48px", borderRadius:14, textDecoration:"none",
          fontSize:"clamp(14px,2vw,17px)", fontWeight:700,
          boxShadow:"0 4px 16px rgba(30,138,76,0.35)",
        }}>Create Free Account</Link>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${border}`, padding:"28px clamp(16px,5vw,40px)", backgroundColor:bgMid }}>
        <div style={{
          maxWidth:1060, margin:"0 auto",
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:10,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <LogoMark size={24} />
            <Wordmark size={13} color={textMain} />
          </div>
          <p style={{ color:textSub, fontSize:12, margin:0, textAlign:"center", flex:1, minWidth:0 }}>
            Built for Nigeria. Powered by AI. © 2026 TerraIQ+ · Allamanda Innovations
          </p>
        </div>
      </footer>
    </div>
  );
}