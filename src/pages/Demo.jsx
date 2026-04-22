import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";

// Demo data
const SCANS = [
  { crop:"Cassava", scan_type:"disease", result:"Cassava Mosaic Virus",    confidence:87, severity:"high"     },
  { crop:"Maize",   scan_type:"disease", result:"Maize Streak Virus",      confidence:74, severity:"moderate" },
  { crop:"Tomato",  scan_type:"disease", result:"Early Blight",            confidence:91, severity:"high"     },
  { crop:"Rice",    scan_type:"disease", result:"Rice Blast",              confidence:83, severity:"critical" },
  { crop:"Maize",   scan_type:"weed",    result:"Striga Weed",             confidence:78, severity:"high"     },
  { crop:"Pepper",  scan_type:"disease", result:"Pepper Anthracnose",      confidence:65, severity:"moderate" },
  { crop:"Yam",     scan_type:"disease", result:"Yam Mosaic Virus",        confidence:72, severity:"high"     },
  { crop:"Cassava", scan_type:"disease", result:"Healthy — No Issues",     confidence:12, severity:"low"      },
  { crop:"Tomato",  scan_type:"weed",    result:"Purple Nutsedge",         confidence:69, severity:"moderate" },
  { crop:"Maize",   scan_type:"disease", result:"Healthy — No Issues",     confidence:8,  severity:"low"      },
];

const SOIL_TESTS = [
  { nitrogen:28, phosphorus:18, potassium:22, ph:6.2, moisture:48, temperature:27, weed_risk:"moderate", rating:"good"      },
  { nitrogen:15, phosphorus:10, potassium:14, ph:5.4, moisture:35, temperature:30, weed_risk:"high",     rating:"fair"      },
  { nitrogen:42, phosphorus:32, potassium:38, ph:7.1, moisture:58, temperature:25, weed_risk:"low",      rating:"excellent" },
  { nitrogen:20, phosphorus:14, potassium:18, ph:6.8, moisture:52, temperature:28, weed_risk:"low",      rating:"good"      },
];

const HARVESTS = [
  { crop:"Maize",   quantity_kg:320, storage_method:"barn",      temperature:28, humidity:62, shelf_life_days:21, days_remaining:14, urgency:"good"     },
  { crop:"Yam",     quantity_kg:180, storage_method:"underground",temperature:22, humidity:55, shelf_life_days:45, days_remaining:38, urgency:"good"     },
  { crop:"Tomato",  quantity_kg:95,  storage_method:"room_temp",  temperature:32, humidity:70, shelf_life_days:7,  days_remaining:2,  urgency:"urgent"   },
  { crop:"Cassava", quantity_kg:440, storage_method:"cool_dry",   temperature:24, humidity:50, shelf_life_days:14, days_remaining:9,  urgency:"moderate" },
  { crop:"Pepper",  quantity_kg:60,  storage_method:"room_temp",  temperature:30, humidity:65, shelf_life_days:10, days_remaining:5,  urgency:"moderate" },
];

const NOTIFICATIONS = [
  { type:"disease",  title:"Cassava Mosaic Outbreak Nearby",    body:"3 farms in your area reported Cassava Mosaic Virus. Check your crops and apply preventive treatment.", read:false },
  { type:"harvest",  title:"Tomato Harvest Expiring Soon",      body:"Your 95kg tomato batch has 2 days remaining. Visit the market advisor to find the best buyer now.",   read:false },
  { type:"weather",  title:"Heavy Rain Expected Tomorrow",      body:"Oyo State forecast shows 45mm rainfall. Skip irrigation today and check drainage around tomato beds.",  read:true  },
  { type:"market",   title:"Maize Prices Up 18% in Bodija",     body:"Bodija Market maize prices have risen. This week is a good time to sell your stored maize.",          read:false },
  { type:"system",   title:"Soil Test Reminder",                body:"It has been 30 days since your last soil test. Regular testing improves yield by up to 23%.",           read:true  },
  { type:"market",   title:"New Buyer Listed in Mile 12",       body:"A cassava processor in Mile 12 is offering ₦95,000/tonne — 20% above current average.",               read:false },
  { type:"disease",  title:"Striga Weed Risk This Season",      body:"Striga season is approaching. Use imazapyr-treated maize seeds for your next planting.",               read:true  },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * n));
  return d.toISOString();
}

const LOCATIONS = [
  { lat:7.3775,  lon:3.9470  },
  { lat:8.4966,  lon:4.5421  },
  { lat:7.9306,  lon:5.5167  },
  { lat:9.0579,  lon:7.4951  },
];

export default function DemoPage() {
  const { isDark } = useTheme();
  const navigate   = useNavigate();
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [progress, setProgress] = useState("");

  const bg      = isDark ? "#0D1F17" : "#F8FAFB";
  const bgCard  = isDark ? "#243B2C" : "#FFFFFF";
  const textMain= isDark ? "#FFFFFF" : "#0F1F17";
  const textSub = isDark ? "#9CA3AF" : "#6B7280";
  const border  = isDark ? "#1E4230" : "#E5E7EB";

  const seed = async () => {
    setLoading(true);
    try {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      if (!user) { toast.error("Please log in first"); setLoading(false); return; }

      // Clear existing data first
      setProgress("Clearing old data...");
      await Promise.all([
        supabase.from("cooperative_alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("cooperative_members").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("cooperatives").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("notifications").delete().eq("user_id", user.id),
        supabase.from("harvests").delete().eq("user_id", user.id),
        supabase.from("soil_tests").delete().eq("user_id", user.id),
        supabase.from("scans").delete().eq("user_id", user.id),
      ]);

      // Update profile
      setProgress("Setting up profile...");
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: "Adewale Okafor",
        farm_name: "Okafor Family Farm",
        region: "Oyo State",
        farm_size: "medium",
        crops: ["Maize", "Cassava", "Tomato", "Yam"],
        language: "en",
      });

      // Seed scans
      setProgress("Seeding crop scans...");
      const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      await supabase.from("scans").insert(
        SCANS.map(s => ({
          ...s,
          user_id: user.id,
          latitude:  loc.lat + (Math.random() - 0.5) * 0.1,
          longitude: loc.lon + (Math.random() - 0.5) * 0.1,
          treatment_plan: JSON.stringify({ immediate_action: "Apply recommended treatment immediately.", steps: ["Isolate affected plants", "Apply fungicide", "Monitor for 7 days", "Prevent spread to neighbouring plants"], local_products: [{ name: "Funguran OH 50WP", price_naira: 4500, where: "Dugbe Market, Ibadan" }], organic_option: "Neem oil spray — 30ml per litre of water every 3 days", prevention: "Use certified disease-resistant seeds next season." }),
          created_at: daysAgo(60),
        }))
      );

      // Seed soil tests
      setProgress("Seeding soil tests...");
      await supabase.from("soil_tests").insert(
        SOIL_TESTS.map(s => ({
          ...s,
          user_id: user.id,
          analysis: JSON.stringify({ rating: s.rating, summary: "Soil analysis complete. Allamanda Compost recommended.", best_crops: ["Maize", "Cassava", "Yam"] }),
          created_at: daysAgo(90),
        }))
      );

      // Seed harvests
      setProgress("Seeding harvests...");
      await supabase.from("harvests").insert(
        HARVESTS.map(h => ({
          ...h,
          user_id: user.id,
          harvested_at: daysAgo(30),
          created_at: daysAgo(30),
        }))
      );

      // Seed notifications
      setProgress("Seeding notifications...");
      await supabase.from("notifications").insert(
        NOTIFICATIONS.map(n => ({
          ...n,
          user_id: user.id,
          created_at: daysAgo(14),
        }))
      );

      // Seed cooperative
      setProgress("Seeding cooperative...");
      const { data: coop } = await supabase.from("cooperatives")
        .insert({ name:"Oyo Farmers Alliance", region:"Oyo State", admin_id:user.id, invite_code:"OYO2025A" })
        .select().single();

      if (coop) {
        await supabase.from("cooperative_members").insert({ cooperative_id:coop.id, user_id:user.id, role:"admin" });
        await supabase.from("cooperative_alerts").insert([
          { cooperative_id:coop.id, sent_by:user.id, type:"disease",  title:"Maize Streak Outbreak — Zone 3", body:"5 members reported Maize Streak Virus this week. Spray recommended within 48hrs.", severity:"high",     affected_crop:"Maize",  created_at:daysAgo(7)  },
          { cooperative_id:coop.id, sent_by:user.id, type:"market",   title:"Bulk Tomato Sale Arranged",      body:"Bulk deal with Bodija Market — ₦85,000 per tonne for members only. Contact admin.", severity:"low",      affected_crop:"Tomato", created_at:daysAgo(5)  },
          { cooperative_id:coop.id, sent_by:user.id, type:"weather",  title:"Dry Spell Warning",              body:"14 dry days ahead. All members should irrigate this weekend.",                   severity:"moderate", affected_crop:null,     created_at:daysAgo(2)  },
        ]);
      }

      setProgress("Done!");
      setDone(true);
      toast.success("Demo data loaded! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1500);

    } catch(e) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", backgroundColor:bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Inter, sans-serif" }}>
      <div style={{ maxWidth:480, width:"100%", textAlign:"center" }}>

        <img src="/icon.png" alt="TerraIQ" style={{ width:72, height:72, borderRadius:18, objectFit:"cover", margin:"0 auto 24px", display:"block" }} />

        <h1 style={{ fontSize:28, fontWeight:900, color:textMain, marginBottom:8 }}>Demo Mode</h1>
        <p style={{ color:textSub, fontSize:15, lineHeight:1.7, marginBottom:32 }}>
          Loads realistic Nigerian farm data into the app so every page has something to show during a demo or presentation.
        </p>

        <div style={{ backgroundColor:bgCard, borderRadius:20, padding:24, border:`1px solid ${border}`, marginBottom:24, textAlign:"left" }}>
          <p style={{ color:textMain, fontWeight:700, fontSize:14, marginBottom:16 }}>What gets seeded:</p>
          {[
            ["🌿", "10 crop scans", "diseases, weeds, healthy scans"],
            ["🌍", "4 soil tests",  "different ratings and pH readings"],
            ["🧺", "5 harvests",    "various urgency levels"],
            ["🔔", "7 notifications","disease alerts, market updates, reminders"],
            ["👥", "1 cooperative", "Oyo Farmers Alliance with 3 alerts"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
              <div>
                <span style={{ color:textMain, fontWeight:600, fontSize:14 }}>{title}</span>
                <span style={{ color:textSub, fontSize:13 }}> — {desc}</span>
              </div>
            </div>
          ))}
        </div>

        {!done ? (
          <button
            onClick={seed}
            disabled={loading}
            style={{
              width:"100%", backgroundColor:"#1E8A4C", color:"white",
              padding:"16px", borderRadius:14, border:"none",
              fontSize:16, fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow:"0 4px 14px rgba(30,138,76,0.3)",
            }}
          >
            {loading ? progress || "Loading..." : "🌱 Load Demo Data"}
          </button>
        ) : (
          <div style={{ backgroundColor:"#E8F5EE", borderRadius:14, padding:16, color:"#1E8A4C", fontWeight:700, fontSize:15 }}>
            ✓ Demo data loaded! Redirecting to dashboard...
          </div>
        )}

        <p style={{ color:textSub, fontSize:12, marginTop:20 }}>
          This clears any existing data and replaces it with demo content.
        </p>
      </div>
    </div>
  );
}
