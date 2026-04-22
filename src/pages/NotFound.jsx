import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

export default function NotFoundPage() {
  const { isDark } = useTheme();
  const bg      = isDark ? "#0D1F17" : "#F8FAFB";
  const textMain= isDark ? "#FFFFFF" : "#0F1F17";
  const textSub = isDark ? "#9CA3AF" : "#6B7280";
  const bgCard  = isDark ? "#243B2C" : "#FFFFFF";
  const border  = isDark ? "#1E4230" : "#E5E7EB";

  return (
    <div style={{ minHeight:"100vh", backgroundColor:bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Inter, sans-serif" }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} style={{ textAlign:"center", maxWidth:480 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:32 }}>
          <img src="/icon.png" alt="TerraIQ+" style={{ width:72, height:72, borderRadius:18, objectFit:"cover" }} />
        </div>
        <div style={{ fontSize:"clamp(80px, 20vw, 140px)", fontWeight:900, color:"#1E8A4C", lineHeight:1, marginBottom:8 }}>404</div>
        <h1 style={{ fontSize:24, fontWeight:800, color:textMain, marginBottom:12 }}>Page not found</h1>
        <p style={{ color:textSub, fontSize:15, lineHeight:1.7, marginBottom:40, maxWidth:340, margin:"0 auto 40px" }}>
          This page doesn't exist or was moved. Head back to your dashboard and keep farming smart.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <Link to="/dashboard" style={{ backgroundColor:"#1E8A4C", color:"white", padding:"14px 32px", borderRadius:14, textDecoration:"none", fontSize:15, fontWeight:700, boxShadow:"0 4px 14px rgba(30,138,76,0.3)" }}>Go to Dashboard</Link>
          <Link to="/" style={{ backgroundColor:bgCard, color:textMain, padding:"14px 32px", borderRadius:14, textDecoration:"none", fontSize:15, fontWeight:700, border:`2px solid ${border}` }}>Home</Link>
        </div>
        <p style={{ color:textSub, fontSize:13, marginTop:48 }}>🌱 While you're here — remember to check your soil pH.</p>
      </motion.div>
    </div>
  );
}
