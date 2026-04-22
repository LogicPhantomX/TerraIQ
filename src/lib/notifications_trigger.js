// ─── DEPRECATED ───────────────────────────────────────────────────────
// This file has been replaced by src/lib/notifications.js
// The old checkHarvests() here used a stale "days_remaining" DB column
// which caused notifications to show expired data.
// All logic now lives in notifications.js using live date calculation.
// This file is kept empty to avoid breaking any stale imports.

export async function checkAndNotify() {
  // Intentionally empty — import from @/lib/notifications instead
}
