// ── REPLACE your sendAlert function in Cooperative.jsx with this ──────

const sendAlert = async () => {
  if (!alertTitle || !alertBody) { toast.error("Enter a title and message"); return; }
  setSending(true);
  const tid = toast.loading("Sending alert to all members...");
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Insert the alert
  const { data: newAlert, error } = await supabase
    .from("cooperative_alerts")
    .insert({
      cooperative_id: coop.id,
      sent_by:        user.id,
      type:           alertType,
      title:          alertTitle,
      body:           alertBody,
      affected_crop:  alertCrop || null,
    })
    .select()
    .single();

  if (error) {
    toast.dismiss(tid);
    toast.error(error.message);
    setSending(false);
    return;
  }

  // 2. Insert a notification for every member except the admin who sent it
  const otherMembers = members.filter(m => m.user_id !== user.id);

  if (otherMembers.length > 0) {
    const { error: notifError } = await supabase.from("notifications").insert(
      otherMembers.map(m => ({
        user_id: m.user_id,
        type:    alertType,
        title:   `${coop.name}: ${alertTitle}`,
        body:    alertBody,
        read:    false,
      }))
    );
    if (notifError) {
      console.error("Notification insert failed:", notifError.message);
    }
  }

  toast.dismiss(tid);
  toast.success(
    otherMembers.length > 0
      ? `Alert sent to ${otherMembers.length} member${otherMembers.length !== 1 ? "s" : ""}!`
      : "Alert posted!"
  );

  setAlertTitle("");
  setAlertBody("");
  setAlertCrop("");
  setAlertType("general");
  setTab("alerts");
  await loadData();
  setSending(false);
};
