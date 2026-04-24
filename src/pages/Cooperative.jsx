import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import LocationPicker from "@/components/LocationPicker";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatLocation } from "@/lib/nigeriaLocations";
import toast from "react-hot-toast";

const TYPE_COLOR = {
  disease: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  weather: "text-sky bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  market:  "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  general: "text-terra bg-terra-light dark:bg-terra/10 border-green-200 dark:border-terra/20",
};

const iClass = "w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

// ── Alert card with reactions + comments ─────────────────────────────
function AlertCard({ alert, userId }) {
  const [reacted,       setReacted]       = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [comments,      setComments]      = useState([]);
  const [showComments,  setShowComments]  = useState(false);
  const [newComment,    setNewComment]    = useState("");
  const [posting,       setPosting]       = useState(false);

  useEffect(() => { loadReactions(); }, []);

  const loadReactions = async () => {
    const [r, mine] = await Promise.all([
      supabase.from("cooperative_reactions").select("id").eq("alert_id", alert.id),
      supabase.from("cooperative_reactions").select("id").eq("alert_id", alert.id).eq("user_id", userId).maybeSingle(),
    ]);
    setReactionCount(r.data?.length ?? 0);
    setReacted(!!mine.data);
  };

  const loadComments = async () => {
    const { data } = await supabase.from("cooperative_comments")
      .select("*, profiles(full_name, farm_name)")
      .eq("alert_id", alert.id).order("created_at", { ascending:true });
    setComments(data ?? []);
  };

  const toggleReaction = async () => {
    if (reacted) {
      await supabase.from("cooperative_reactions").delete().eq("alert_id", alert.id).eq("user_id", userId);
      setReacted(false); setReactionCount(c => c - 1);
    } else {
      await supabase.from("cooperative_reactions").insert({ alert_id:alert.id, user_id:userId });
      setReacted(true); setReactionCount(c => c + 1);
    }
  };

  const toggleComments = async () => {
    if (!showComments) await loadComments();
    setShowComments(p => !p);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    await supabase.from("cooperative_comments").insert({ alert_id:alert.id, user_id:userId, body:newComment.trim() });
    setNewComment(""); await loadComments(); setPosting(false);
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize border ${TYPE_COLOR[alert.type] ?? TYPE_COLOR.general}`}>{alert.type}</span>
          <p className="text-ink-500 dark:text-gray-500 text-xs">{format(new Date(alert.created_at), "MMM d · h:mm a")}</p>
        </div>
        <p className="text-ink dark:text-white font-semibold mt-1">{alert.title}</p>
        <p className="text-ink-500 dark:text-gray-400 text-sm mt-1 leading-relaxed" style={{ whiteSpace:"pre-wrap" }}>{alert.body}</p>
        {alert.affected_crop && (
          <span className="inline-block mt-2 bg-terra-light dark:bg-terra/10 text-terra text-xs px-2.5 py-1 rounded-lg font-medium">{alert.affected_crop}</span>
        )}
      </div>

      <div className="px-5 py-3 border-t border-deep-light dark:border-dark-light flex items-center gap-4">
        <button onClick={toggleReaction}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            reacted ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra hover:text-terra"
          }`}>
          <span style={{ fontSize:13 }}>▲</span>
          <span>{reactionCount > 0 ? reactionCount : ""} Helpful</span>
        </button>
        <button onClick={toggleComments}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra hover:text-terra transition-all">
          <span style={{ fontSize:12 }}>◎</span>
          <span>{showComments ? "Hide" : "Comment"}{comments.length > 0 ? ` (${comments.length})` : ""}</span>
        </button>
      </div>

      {showComments && (
        <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid">
          {comments.length > 0 && (
            <div className="px-5 py-3 space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-terra-light dark:bg-terra/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-terra font-bold text-xs">{c.profiles?.full_name?.[0]?.toUpperCase() ?? "F"}</span>
                  </div>
                  <div className="flex-1 bg-white dark:bg-dark-surface rounded-xl px-3 py-2.5 border border-deep-light dark:border-dark-light">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-ink dark:text-white text-xs font-semibold">{c.profiles?.full_name || c.profiles?.farm_name || "Member"}</p>
                      <p className="text-ink-500 dark:text-gray-500 text-xs">{format(new Date(c.created_at), "MMM d")}</p>
                    </div>
                    <p className="text-ink-500 dark:text-gray-300 text-sm">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {comments.length === 0 && <p className="px-5 py-3 text-ink-500 dark:text-gray-500 text-sm">No comments yet.</p>}
          <div className="px-5 py-3 border-t border-deep-light dark:border-dark-light flex gap-2">
            <input value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
              placeholder="Add a comment..."
              className="flex-1 bg-white dark:bg-dark-surface rounded-xl px-3 h-9 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm" />
            <button onClick={postComment} disabled={posting || !newComment.trim()}
              className="bg-terra text-white px-4 h-9 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-terra-dark transition-colors shrink-0">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
export default function CoopPage() {
  const { t } = useTranslation();
  const [coop,    setCoop]    = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId,  setUserId]  = useState(null);
  const [tab,     setTab]     = useState("alerts");

  // Create form
  const [coopName, setCoopName] = useState("");
  const [coopState,setCoopState]= useState("");
  const [coopCity, setCoopCity] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [code,    setCode]    = useState("");

  // Alert composer
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody,  setAlertBody]  = useState("");
  const [alertType,  setAlertType]  = useState("general");
  const [alertCrop,  setAlertCrop]  = useState("");
  const [sending,    setSending]    = useState(false);

  // Nearby cooperatives
  const [nearbyCoops,  setNearbyCoops]  = useState([]);
  const [userState,    setUserState]    = useState("");
  const [userCity,     setUserCity]     = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
    setUserId(user.id);

    // Get user's location
    const { data: profile } = await supabase.from("profiles")
      .select("region, city").eq("id", user.id).single();
    setUserState(profile?.region ?? "");
    setUserCity(profile?.city ?? "");

    const { data: mem } = await supabase.from("cooperative_members")
      .select("cooperative_id, role").eq("user_id", user.id).maybeSingle();

    if (!mem) {
      setLoading(false);
      // Load nearby cooperatives
      loadNearby(profile?.region, profile?.city);
      return;
    }

    setIsAdmin(mem.role === "admin");
    const [coopRes, alertsRes, membersRes] = await Promise.all([
      supabase.from("cooperatives").select("*").eq("id", mem.cooperative_id).single(),
      supabase.from("cooperative_alerts").select("*").eq("cooperative_id", mem.cooperative_id).order("created_at", { ascending:false }).limit(30),
      supabase.from("cooperative_members").select("user_id, role, joined_at, profiles(full_name, farm_name, region, city)").eq("cooperative_id", mem.cooperative_id),
    ]);
    setCoop(coopRes.data);
    setAlerts(alertsRes.data ?? []);
    setMembers(membersRes.data ?? []);
    setLoading(false);
  };

  const loadNearby = async (state, city) => {
    if (!state) return;
    let query = supabase.from("cooperatives").select("*").eq("region", state);
    const { data } = await query.limit(10);
    // Sort: same city first, then same state
    const sorted = (data ?? []).sort((a, b) => {
      if (city && a.city === city && b.city !== city) return -1;
      if (city && b.city === city && a.city !== city) return 1;
      return 0;
    });
    setNearbyCoops(sorted);
  };

  const generateInviteCode = () => {
    // Generate a unique 8-char alphanumeric invite code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0,O,1,I)
    const statePrefix = coopState?.replace(/\s+state$/i, "").slice(0, 3).toUpperCase() || "TRQ";
    const randomPart = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `${statePrefix}${randomPart}`;
  };

  const handleCreate = async () => {
    if (!coopName) { toast.error("Enter cooperative name"); return; }
    if (!coopState || !coopCity) { toast.error("Select state and city"); return; }
    setCreating(true);
    const tid = toast.loading("Creating cooperative...");
    const { data: { session: _authSess } } = await supabase.auth.getSession();
    const user = _authSess?.user;
    if (!user) { toast.dismiss(tid); toast.error("Not logged in"); setCreating(false); return; }

    // Ensure the profile row exists before inserting cooperative (avoids FK violation)
    const { data: existingProfile } = await supabase
      .from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!existingProfile) {
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? "",
        role: "farmer",
      });
      if (profileErr) {
        toast.dismiss(tid);
        toast.error("Profile not ready. Please update your profile and try again.");
        setCreating(false); return;
      }
    }

    const invite_code = generateInviteCode().toLowerCase();
    const { data: c, error } = await supabase.from("cooperatives")
      .insert({ name:coopName, region:coopState, city:coopCity, admin_id:user.id, invite_code })
      .select().single();
    if (error) { toast.dismiss(tid); toast.error(error.message); setCreating(false); return; }

    // Insert member row after cooperative is confirmed created
    const { error: memErr } = await supabase.from("cooperative_members")
      .insert({ cooperative_id:c.id, user_id:user.id, role:"admin" });
    if (memErr) { toast.dismiss(tid); toast.error(memErr.message); setCreating(false); return; }

    toast.dismiss(tid); toast.success("Cooperative created!");
    await loadData(); setCreating(false);
  };

  const handleJoin = async (inviteCode) => {
    const c_code = inviteCode ?? code;
    if (!c_code) { toast.error("Enter invite code"); return; }
    const tid = toast.loading("Joining cooperative...");
    const normalised = c_code.trim().toLowerCase();
    const { data: c } = await supabase.from("cooperatives").select("*").eq("invite_code", normalised).maybeSingle();
    if (!c) { toast.dismiss(tid); toast.error("Invalid invite code. Double-check with your cooperative admin."); return; }
    const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
    const { error } = await supabase.from("cooperative_members").insert({ cooperative_id:c.id, user_id:user.id, role:"member" });
    if (error?.code === "23505") { toast.dismiss(tid); toast.error("Already a member"); return; }
    toast.dismiss(tid); toast.success(`Joined ${c.name}!`);
    await loadData();
  };

  const sendAlert = async () => {
    if (!alertTitle || !alertBody) { toast.error("Enter title and message"); return; }
    setSending(true);
    const tid = toast.loading("Sending alert...");
    const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
    const { error } = await supabase.from("cooperative_alerts").insert({
      cooperative_id:coop.id, sent_by:user.id,
      type:alertType, title:alertTitle, body:alertBody,
      affected_crop:alertCrop || null,
    });
    if (error) { toast.dismiss(tid); toast.error(error.message); setSending(false); return; }
    const others = members.filter(m => m.user_id !== user.id);
    if (others.length > 0) {
      await supabase.from("notifications").insert(others.map(m => ({
        user_id:m.user_id, type:alertType,
        title:`${coop.name}: ${alertTitle}`, body:alertBody, read:false,
      })));
    }
    toast.dismiss(tid); toast.success(`Alert sent to ${others.length} members!`);
    setAlertTitle(""); setAlertBody(""); setAlertCrop(""); setAlertType("general");
    setTab("alerts"); await loadData(); setSending(false);
  };

  const shareWhatsApp = () => {
    const location = formatLocation(coop.city, coop.region);
    const msg = `Join our farming cooperative on TerraIQ+!\n\nCooperative: ${coop.name}\nLocation: ${location}\n\nInvite code:\n*${coop.invite_code}*\n\nOpen TerraIQ+ → Cooperative → Join with Invite Code.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin" /></div></Layout>
  );

  // ── No cooperative yet ────────────────────────────────────────────
  if (!coop) return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">Cooperative</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">Create a cooperative for your community or join one near you.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Create */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 space-y-4 shadow-card">
          <h2 className="text-ink dark:text-white font-bold text-lg">Create a Cooperative</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">You will be the admin. Farmers in your city can find and join it.</p>
          <input value={coopName} onChange={e=>setCoopName(e.target.value)}
            placeholder="e.g. Ogbomoso Farmers Alliance" className={iClass} />
          <LocationPicker
            state={coopState} city={coopCity}
            onStateChange={setCoopState} onCityChange={setCoopCity}
            required
          />
          <button onClick={handleCreate} disabled={creating}
            className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 shadow-sm transition-colors">
            {creating ? "Creating..." : "Create Cooperative"}
          </button>
        </div>

        {/* Join by code */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 space-y-4 shadow-card">
          <h2 className="text-ink dark:text-white font-bold text-lg">Join with Invite Code</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Ask your cooperative admin for the invite code.</p>
          <input value={code} onChange={e=>setCode(e.target.value)}
            placeholder="Enter invite code e.g. OYO2025A" className={`${iClass} uppercase tracking-widest`} />
          <button onClick={() => handleJoin()}
            className="w-full bg-white dark:bg-dark-mid border-2 border-terra text-terra h-12 rounded-xl font-bold hover:bg-terra hover:text-white transition-colors shadow-sm">
            Join Cooperative
          </button>
        </div>
      </div>

      {/* Nearby cooperatives */}
      {nearbyCoops.length > 0 && (
        <div>
          <h2 className="text-ink dark:text-white font-bold text-lg mb-1">
            Cooperatives near you
          </h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm mb-4">
            Found {nearbyCoops.length} cooperative{nearbyCoops.length !== 1 ? "s" : ""} in {userCity ? `${userCity} and` : ""} {userState}
          </p>
          <div className="space-y-3">
            {nearbyCoops.map(c => {
              const sameCity = c.city && userCity && c.city === userCity;
              return (
                <div key={c.id} className={`bg-white dark:bg-dark-surface rounded-2xl border shadow-card p-4 ${sameCity ? "border-terra/40" : "border-deep-light dark:border-dark-light"}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-ink dark:text-white font-bold">{c.name}</p>
                        {sameCity && (
                          <span className="bg-terra-light dark:bg-terra/20 text-terra text-xs px-2 py-0.5 rounded-lg font-semibold">Your city</span>
                        )}
                      </div>
                      <p className="text-ink-500 dark:text-gray-400 text-sm">
                        {formatLocation(c.city, c.region)}
                      </p>
                      <p className="text-ink-500 dark:text-gray-500 text-xs mt-0.5">
                        {c.member_count ?? "–"} members
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCode(c.invite_code);
                        handleJoin(c.invite_code);
                      }}
                      className="bg-terra text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-terra-dark transition-colors shrink-0"
                    >
                      Join
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nearbyCoops.length === 0 && userState && (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-8 text-center shadow-card">
          <p className="text-ink dark:text-white font-bold mb-1">No cooperatives found in {userCity || userState} yet</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Be the first to create one for your community.</p>
        </div>
      )}
    </Layout>
  );

  // ── Inside cooperative ────────────────────────────────────────────
  return (
    <Layout>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          {isAdmin && <span className="bg-amber/10 text-amber text-xs px-2.5 py-1 rounded-lg font-semibold border border-amber/20 mb-2 inline-block">Admin</span>}
          <h1 className="text-ink dark:text-white text-3xl font-black">{coop.name}</h1>
          <p className="text-ink-500 dark:text-gray-400">
            {formatLocation(coop.city, coop.region)} · {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light rounded-2xl p-4 text-center shadow-card min-w-44">
          <p className="text-ink-500 dark:text-gray-400 text-xs mb-1">Invite Code</p>
          <p className="text-terra font-black tracking-widest uppercase text-2xl mb-3">{coop.invite_code}</p>
          <button onClick={shareWhatsApp} className="w-full bg-green-500 text-white rounded-xl py-2 text-xs font-bold hover:bg-green-600 transition-colors mb-2">Share on WhatsApp</button>
          <button onClick={() => { navigator.clipboard.writeText(coop.invite_code); toast.success("Code copied!"); }}
            className="w-full bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 rounded-xl py-2 text-xs font-semibold hover:text-ink dark:hover:text-white transition-colors">
            Copy Code
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-deep-light dark:border-dark-light pb-3 flex-wrap">
        {[
          { key:"alerts",  label:`Alerts (${alerts.length})`    },
          { key:"members", label:`${t("cooperative.members")} (${members.length})`  },
          ...(isAdmin ? [{ key:"send", label:"Send Alert" }] : []),
        ].map(t_ => (
          <button key={t_.key} onClick={() => setTab(t_.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t_.key ? "bg-terra text-white" : "text-ink-500 dark:text-gray-400 hover:text-ink dark:hover:text-white"}`}>
            {t_.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light py-16 text-center shadow-card">
              <p className="text-ink dark:text-white font-bold">No alerts yet</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">
                {isAdmin ? "Use the Send Alert tab to notify all members." : "Your admin has not sent any alerts yet."}
              </p>
            </div>
          ) : alerts.map(a => <AlertCard key={a.id} alert={a} userId={userId} />)}
        </div>
      )}

      {/* Members */}
      {tab === "members" && (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card">
          {members.map((m, i) => (
            <div key={i} className="px-5 py-4 border-b border-deep-light dark:border-dark-light last:border-0 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-terra-light dark:bg-terra/20 flex items-center justify-center shrink-0">
                  <span className="text-terra font-bold text-sm">{m.profiles?.full_name?.[0]?.toUpperCase() ?? "F"}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-ink dark:text-white font-semibold text-sm">{m.profiles?.full_name || m.profiles?.farm_name || "Member"}</p>
                    {m.role === "admin" && <span className="bg-amber/10 text-amber text-xs px-2 py-0.5 rounded-lg font-semibold border border-amber/20">Admin</span>}
                  </div>
                  <p className="text-ink-500 dark:text-gray-500 text-xs mt-0.5">
                    {m.profiles?.farm_name && `${m.profiles.farm_name} · `}
                    {formatLocation(m.profiles?.city, m.profiles?.region)}
                  </p>
                </div>
              </div>
              <p className="text-ink-500 dark:text-gray-500 text-xs">Joined {format(new Date(m.joined_at), "MMM d")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Send alert */}
      {tab === "send" && isAdmin && (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <p className="text-ink-500 dark:text-gray-400 text-sm">Send an alert to all {members.length} members of {coop.name}.</p>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">Alert type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["general","disease","weather","market"].map(type => (
                <button key={type} onClick={() => setAlertType(type)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${alertType===type ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Alert title</label>
            <input value={alertTitle} onChange={e=>setAlertTitle(e.target.value)} placeholder="e.g. Cassava Mosaic Disease Outbreak" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Message</label>
            <textarea value={alertBody} onChange={e=>setAlertBody(e.target.value)}
              placeholder="Describe the situation and what members should do..."
              rows={5} style={{ whiteSpace:"pre-wrap" }}
              className="w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 py-3 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm resize-y" />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Affected crop (optional)</label>
            <input value={alertCrop} onChange={e=>setAlertCrop(e.target.value)} placeholder="e.g. Maize" className={iClass} />
          </div>
          {alertTitle && alertBody && (
            <div className={`rounded-xl p-4 border text-sm ${TYPE_COLOR[alertType] ?? TYPE_COLOR.general}`}>
              <p className="font-bold uppercase text-xs tracking-wide mb-1">{alertType} · Preview</p>
              <p className="font-semibold">{alertTitle}</p>
              <p className="mt-1 opacity-80" style={{ whiteSpace:"pre-wrap" }}>{alertBody}</p>
            </div>
          )}
          <button onClick={sendAlert} disabled={sending}
            className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
            {sending ? "Sending..." : `Send to all ${members.length} members`}
          </button>
        </div>
      )}
    </Layout>
  );
}