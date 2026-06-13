// Detects whether a typed shell command starts an interactive agent session.
// Dual-mode (renderer global + Node require).

const NON_INTERACTIVE_AGENT_FLAGS = new Set(["--version", "-v", "--help", "-h", "--print", "-p"]);
const NON_INTERACTIVE_AGENT_SUBCOMMANDS = new Set([
  "login",
  "logout",
  "mcp",
  "config",
  "doctor",
  "update",
  "completion",
  "exec",
  "app-server"
]);

// Returns "codex"/"claude" only when the typed command starts an interactive
// agent session, so one-shot invocations like `claude --version` or `codex login`
// don't hijack the tab.
function detectsInteractiveAgent(input) {
  const tokens = input.trim().split(/\s+/);
  const command = tokens[0];
  if (command !== "codex" && command !== "claude") return null;
  const rest = tokens.slice(1);
  if (rest.some((token) => NON_INTERACTIVE_AGENT_FLAGS.has(token))) return null;
  if (rest.length && NON_INTERACTIVE_AGENT_SUBCOMMANDS.has(rest[0])) return null;
  return command;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { detectsInteractiveAgent };
}
