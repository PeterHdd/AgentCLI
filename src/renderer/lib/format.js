// Pure formatting/escaping helpers. Dual-mode (renderer global + Node require).

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizedTimestamp(timestamp) {
  if (!timestamp) return 0;
  return typeof timestamp === "number" && timestamp < 100000000000 ? timestamp * 1000 : Number(timestamp);
}

function workspaceLabel(workspace) {
  if (!workspace || workspace === "unknown workspace") return workspace || "unknown workspace";
  const segments = workspace.split("/").filter(Boolean);
  return segments.at(-1) || workspace;
}

// `now` is injectable so the relative formatting is deterministic in tests.
function formatThreadDate(timestampSeconds, now = new Date()) {
  if (!timestampSeconds) return "";
  const date = new Date(normalizedTimestamp(timestampSeconds));
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(
    [],
    sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }
  );
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { escapeHtml, normalizedTimestamp, workspaceLabel, formatThreadDate };
}
