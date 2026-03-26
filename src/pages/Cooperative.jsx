import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const TYPE_COLOR = {
  disease: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  weather: "text-sky bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  market:  "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  general: "text-terra bg-terra-light dark:bg-terra/10 border-green-200 dark:border-terra/20",
};

const iClass = "w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

// ── Single alert card with reactions + comments ───────────────────────
function AlertCard({ alert, userId, coopId }) {
  const [reacted,     setReacted]     = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [comments,    setComments]    = useState([]);
  const [showComments,setShowComments]= useState(false);
  const [newComment,  setNewComment]  = useState("");
  const [posting,     setPosting]     = useState(false);
  const [myName,      setMyName]      = useState("");

  useEffect(() => {
    loadReactions();
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
      setMyName(data?.full_name ?? "Farmer");
    })();
  }, []);

  const loadReactions = async () => {
    const [reactRes, myReactRes] = await Promise.all([
      supabase.from("cooperative_reactions").select("id").eq("alert_id", alert.id),
      supabase.from("cooperative_reactions").select("id").eq("alert_id", alert.id).eq("user_id", userId).maybeSingle(),
    ]);
    setReactionCount(reactRes.data?.length ?? 0);
    setReacted(!!myReactRes.data);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("cooperative_comments")
      .select("*, profiles(full_name, farm_name)")
      .eq("alert_id", alert.id)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  };

  const toggleReaction = async () => {
    if (reacted) {
      await supabase.from("cooperative_reactions")
        .delete().eq("alert_id", alert.id).eq("user_id", userId);
      setReacted(false);
      setReactionCount(c => c - 1);
    } else {
      await supabase.from("cooperative_reactions")
        .insert({ alert_id: alert.id, user_id: userId });
      setReacted(true);
      setReactionCount(c => c + 1);
    }
  };

  const toggleComments = async () => {
    if (!showComments) await loadComments();
    setShowComments(p => !p);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    await supabase.from("cooperative_comments").insert({
      alert_id: alert.id,
      user_id:  userId,
      body:     newComment.trim(),
    });
    setNewComment("");
    await loadComments();
    setPosting(false);
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden">

      {/* Alert content */}
      <div className="px-5 py-4">
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize border ${TYPE_COLOR[alert.type] ?? TYPE_COLOR.general}`}>
            {alert.type}
          </span>
          <p className="text-ink-500 dark:text-gray-500 text-xs">
            {format(new Date(alert.created_at), "MMM d · h:mm a")}
          </p>
        </div>
        <p className="text-ink dark:text-white font-semibold mt-1">{alert.title}</p>
        <p className="text-ink-500 dark:text-gray-400 text-sm mt-1 leading-relaxed">{alert.body}</p>
        {alert.affected_crop && (
          <span className="inline-block mt-2 bg-terra-light dark:bg-terra/10 text-terra text-xs px-2.5 py-1 rounded-lg font-medium">
            {alert.affected_crop}
          </span>
        )}
      </div>

      {/* Reaction + comment bar */}
      <div className="px-5 py-3 border-t border-deep-light dark:border-dark-light flex items-center gap-4">

        {/* Upvote */}
        <button
          onClick={toggleReaction}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            reacted
              ? "bg-terra text-white border-terra"
              : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra hover:text-terra"
          }`}
        >
          <span style={{ fontSize:14 }}>▲</span>
          <span>{reactionCount > 0 ? reactionCount : ""} {reactionCount === 1 ? "Helpful" : reactionCount > 1 ? "Helpful" : "Helpful"}</span>
        </button>

        {/* Comments toggle */}
        <button
          onClick={toggleComments}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra hover:text-terra transition-all"
        >
          <span style={{ fontSize:13 }}>◎</span>
          <span>
            {showComments ? "Hide" : "Comment"}
            {comments.length > 0 ? ` (${comments.length})` : ""}
          </span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid">

          {/* Existing comments */}
          {comments.length > 0 && (
            <div className="px-5 py-3 space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  {/* Avatar initial */}
                  <div className="w-8 h-8 rounded-xl bg-terra-light dark:bg-terra/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-terra font-bold text-xs">
                      {c.profiles?.full_name?.[0]?.toUpperCase() ?? "F"}
                    </span>
                  </div>
                  <div className="flex-1 bg-white dark:bg-dark-surface rounded-xl px-3 py-2.5 border border-deep-light dark:border-dark-light">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-ink dark:text-white text-xs font-semibold">
                        {c.profiles?.full_name ?? "Farmer"}
                        {c.profiles?.farm_name ? ` · ${c.profiles.farm_name}` : ""}
                      </p>
                      <p className="text-ink-500 dark:text-gray-500 text-xs">
                        {format(new Date(c.created_at), "MMM d")}
                      </p>
                    </div>
                    <p className="text-ink-500 dark:text-gray-300 text-sm">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {comments.length === 0 && (
            <p className="px-5 py-3 text-ink-500 dark:text-gray-500 text-sm">
              No comments yet. Be the first to respond.
            </p>
          )}

          {/* New comment input */}
          <div className="px-5 py-3 border-t border-deep-light dark:border-dark-light flex gap-2">
            <div className="w-8 h-8 rounded-xl bg-terra text-white flex items-center justify-center shrink-0 mt-1 text-xs font-bold">
              {myName[0]?.toUpperCase() ?? "F"}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                placeholder="Add a comment..."
                className="flex-1 bg-white dark:bg-dark-surface rounded-xl px-3 h-9 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm"
              />
              <button
                onClick={postComment}
                disabled={posting || !newComment.trim()}
                className="bg-terra text-white px-4 h-9 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-terra-dark transition-colors shrink-0"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CoopPage ─────────────────────────────────────────────────────
export default function CoopPage() {
  const { t } = useTranslation();
  const [coop,     setCoop]     = useState(null);
  const [alerts,   setAlerts]   = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [userId,   setUserId]   = useState(null);
  const [tab,      setTab]      = useState("alerts");

  const [name,     setName]     = useState("");
  const [region,   setRegion]   = useState("");
  const [code,     setCode]     = useState("");
  const [creating, setCreating] = useState(false);

  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody,  setAlertBody]  = useState("");
  const [alertType,  setAlertType]  = useState("general");
  const [alertCrop,  setAlertCrop]  = useState("");
  const [sending,    setSending]    = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    const { data: mem } = await supabase
      .from("cooperative_members").select("cooperative_id, role")
      .eq("user_id", user.id).maybeSingle();
    if (!mem) { setLoading(false); return; }
    setIsAdmin(mem.role === "admin");
    const [coopRes, alertsRes, membersRes] = await Promise.all([
      supabase.from("cooperatives").select("*").eq("id", mem.cooperative_id).single(),
      supabase.from("cooperative_alerts").select("*").eq("cooperative_id", mem.cooperative_id).order("created_at", { ascending:false }).limit(30),
      supabase.from("cooperative_members").select("user_id, role, joined_at, profiles(full_name, farm_name, region)").eq("cooperative_id", mem.cooperative_id),
    ]);
    setCoop(coopRes.data);
    setAlerts(alertsRes.data ?? []);
    setMembers(membersRes.data ?? []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name) { toast.error("Enter cooperative name"); return; }
    setCreating(true);
    const tid = toast.loading("Creating cooperative...");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: c, error } = await supabase.from("cooperatives").insert({ name, region, admin_id:user.id }).select().single();
    if (error) { toast.dismiss(tid); toast.error(error.message); setCreating(false); return; }
    await supabase.from("cooperative_members").insert({ cooperative_id:c.id, user_id:user.id, role:"admin" });
    toast.dismiss(tid); toast.success("Cooperative created!");
    await loadData(); setCreating(false);
  };

  const handleJoin = async () => {
    if (!code) { toast.error("Enter invite code"); return; }
    const tid = toast.loading("Joining cooperative...");
    const { data: c } = await supabase.from("cooperatives").select("*").eq("invite_code", code.trim().toLowerCase()).maybeSingle();
    if (!c) { toast.dismiss(tid); toast.error("Invalid invite code"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cooperative_members").insert({ cooperative_id:c.id, user_id:user.id, role:"member" });
    if (error?.code === "23505") { toast.dismiss(tid); toast.error("Already a member"); return; }
    toast.dismiss(tid); toast.success(`Joined ${c.name}!`);
    await loadData();
  };

const sendAlert = async () => {
  if (!alertTitle || !alertBody) { toast.error("Enter a title and message"); return; }
  setSending(true);
  const tid = toast.loading("Sending alert to all members...");
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Insert the alert
  const { data: newAlert, error } = await supabase.from("cooperative_alerts").insert({
    cooperative_id: coop.id, sent_by: user.id,
    type: alertType, title: alertTitle, body: alertBody,
    affected_crop: alertCrop || null,
  }).select().single();

  if (error) { toast.dismiss(tid); toast.error(error.message); setSending(false); return; }

  // 2. Notify every member except the admin who sent it
  const otherMembers = members.filter(m => m.user_id !== user.id);
  if (otherMembers.length > 0) {
    await supabase.from("notifications").insert(
      otherMembers.map(m => ({
        user_id: m.user_id,
        type:    alertType,
        title:   `${coop.name}: ${alertTitle}`,
        body:    alertBody,
        read:    false,
      }))
    );
  }

  toast.dismiss(tid);
  toast.success(`Alert sent to ${otherMembers.length} member${otherMembers.length !== 1 ? "s" : ""}!`);
  setAlertTitle(""); setAlertBody(""); setAlertCrop(""); setAlertType("general");
  setTab("alerts"); await loadData(); setSending(false);
};

  const shareWhatsApp = () => {
    const msg = `Join our farming cooperative on TerraIQ+!\n\nCooperative: ${coop.name}\nRegion: ${coop.region}\n\nUse this invite code:\n*${coop.invite_code}*\n\nOpen TerraIQ+ → Cooperative → Join with Invite Code.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (!coop) return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("cooperative.title")}</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">Create a cooperative for your farming community or join one with an invite code.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 space-y-4 shadow-card">
          <h2 className="text-ink dark:text-white font-bold text-lg">Create a Cooperative</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">You will be the admin. You can send alerts and members can comment and react.</p>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Cooperative name e.g. Oyo Farmers Alliance" className={iClass} />
          <input value={region} onChange={e=>setRegion(e.target.value)} placeholder="Region e.g. Oyo State" className={iClass} />
          <button onClick={handleCreate} disabled={creating} className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 shadow-sm transition-colors">
            {creating ? "Creating..." : "Create Cooperative"}
          </button>
        </div>
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 space-y-4 shadow-card">
          <h2 className="text-ink dark:text-white font-bold text-lg">Join a Cooperative</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Ask your admin for the invite code, then enter it below.</p>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter invite code e.g. OYO2025A" className={`${iClass} uppercase tracking-widest`} />
          <button onClick={handleJoin} className="w-full bg-white dark:bg-dark-mid border-2 border-terra text-terra h-12 rounded-xl font-bold hover:bg-terra hover:text-white transition-colors shadow-sm">
            Join Cooperative
          </button>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          {isAdmin && <span className="bg-amber/10 text-amber text-xs px-2.5 py-1 rounded-lg font-semibold border border-amber/20 mb-2 inline-block">Admin</span>}
          <h1 className="text-ink dark:text-white text-3xl font-black">{coop.name}</h1>
          <p className="text-ink-500 dark:text-gray-400">{coop.region} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light rounded-2xl p-4 text-center shadow-card min-w-48">
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
          { key:"alerts",  label:`Alerts (${alerts.length})`   },
          { key:"members", label:`Members (${members.length})` },
          ...(isAdmin ? [{ key:"send", label:"Send Alert" }] : []),
        ].map(t_ => (
          <button key={t_.key} onClick={() => setTab(t_.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t_.key ? "bg-terra text-white" : "text-ink-500 dark:text-gray-400 hover:text-ink dark:hover:text-white"}`}
          >
            {t_.label}
          </button>
        ))}
      </div>

      {/* Alerts tab */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light py-16 text-center shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-deep-mid dark:bg-dark-mid flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-ink-500">!</span>
              </div>
              <p className="text-ink dark:text-white font-bold">No alerts yet</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">
                {isAdmin ? "Use the Send Alert tab to notify all members." : "Your admin has not sent any alerts yet."}
              </p>
            </div>
          ) : alerts.map(a => (
            <AlertCard key={a.id} alert={a} userId={userId} coopId={coop.id} />
          ))}
        </div>
      )}

      {/* Members tab */}
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
                    <p className="text-ink dark:text-white font-semibold text-sm">{m.profiles?.full_name ?? "Farmer"}</p>
                    {m.role === "admin" && <span className="bg-amber/10 text-amber text-xs px-2 py-0.5 rounded-lg font-semibold border border-amber/20">Admin</span>}
                  </div>
                  <p className="text-ink-500 dark:text-gray-500 text-xs mt-0.5">{m.profiles?.farm_name ?? ""}{m.profiles?.region ? ` · ${m.profiles.region}` : ""}</p>
                </div>
              </div>
              <p className="text-ink-500 dark:text-gray-500 text-xs">Joined {format(new Date(m.joined_at), "MMM d")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Send alert tab */}
      {tab === "send" && isAdmin && (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <p className="text-ink-500 dark:text-gray-400 text-sm">Send an alert to all {members.length} members of {coop.name}.</p>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">Alert type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["general","disease","weather","market"].map(type => (
                <button key={type} onClick={() => setAlertType(type)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${alertType===type ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}
                >{type}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Alert title</label>
            <input value={alertTitle} onChange={e=>setAlertTitle(e.target.value)} placeholder="e.g. Cassava Mosaic Disease Outbreak" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Message</label>
            <textarea
                value={alertBody}
                onChange={e => setAlertBody(e.target.value)}
                placeholder="Describe the situation and what members should do..."
                rows={6}
                style={{ whiteSpace: "pre-wrap" }}
                className="w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 py-3 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm resize-y min-h-32"
            />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Affected crop (optional)</label>
            <input value={alertCrop} onChange={e=>setAlertCrop(e.target.value)} placeholder="e.g. Maize" className={iClass} />
          </div>
          {alertTitle && alertBody && (
            <div className={`rounded-xl p-4 border text-sm ${TYPE_COLOR[alertType] ?? TYPE_COLOR.general}`}>
              <p className="font-bold uppercase text-xs tracking-wide mb-1">{alertType} · Preview</p>
              <p className="font-semibold">{alertTitle}</p>
              <p className="mt-1 opacity-80" style={{ whiteSpace: "pre-wrap" }}>{alertBody}</p>
            </div>
          )}
          <button onClick={sendAlert} disabled={sending} className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
            {sending ? "Sending..." : `Send to all ${members.length} members`}
          </button>
        </div>
      )}
    </Layout>
  );
}