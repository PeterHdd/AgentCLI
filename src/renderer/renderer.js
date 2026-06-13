const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m"
};

const COMMANDS = [
  ["/sessions", "toggle session sidebar"],
  ["/theme", "list themes"],
  ["/theme <name>", "set theme"]
];

const THEMES = {
  terminal: {
    background: "#252936",
    foreground: "#dfe5f2",
    cursor: "#dfe5f2",
    selectionBackground: "#41495b",
    black: "#202532",
    red: "#e78284",
    green: "#a6d189",
    yellow: "#e5c890",
    blue: "#8caaee",
    magenta: "#ca9ee6",
    cyan: "#81c8be",
    white: "#dfe5f2",
    brightBlack: "#464b58",
    brightRed: "#ef9f9f",
    brightGreen: "#a6d189",
    brightYellow: "#e5c890",
    brightBlue: "#8caaee",
    brightMagenta: "#ca9ee6",
    brightCyan: "#81c8be",
    brightWhite: "#f7f9ff"
  },
  paper: {
    background: "#f7f2e8",
    foreground: "#27231d",
    cursor: "#176f5d",
    selectionBackground: "#d8eadf",
    black: "#27231d",
    red: "#b4433f",
    green: "#176f5d",
    yellow: "#986d14",
    blue: "#235f9f",
    magenta: "#8f4f8f",
    cyan: "#287a83",
    white: "#f7f2e8",
    brightBlack: "#7a7268",
    brightRed: "#d45a54",
    brightGreen: "#21866f",
    brightYellow: "#b9851c",
    brightBlue: "#3177bd",
    brightMagenta: "#a866a6",
    brightCyan: "#34929d",
    brightWhite: "#fffaf1"
  },
  matrix: {
    background: "#020702",
    foreground: "#b8ffb8",
    cursor: "#00ff66",
    selectionBackground: "#0d3b1d",
    black: "#020702",
    red: "#ff5f5f",
    green: "#00ff66",
    yellow: "#d6ff7a",
    blue: "#5fbfff",
    magenta: "#b785ff",
    cyan: "#62ffd6",
    white: "#b8ffb8",
    brightBlack: "#3d6b45",
    brightRed: "#ff8585",
    brightGreen: "#6dff9e",
    brightYellow: "#e4ff9f",
    brightBlue: "#86d0ff",
    brightMagenta: "#c9a4ff",
    brightCyan: "#92ffe3",
    brightWhite: "#ffffff"
  },
  contrast: {
    background: "#000000",
    foreground: "#ffffff",
    cursor: "#ffffff",
    selectionBackground: "#444444",
    black: "#000000",
    red: "#ff4444",
    green: "#44ff44",
    yellow: "#ffff44",
    blue: "#4488ff",
    magenta: "#ff44ff",
    cyan: "#44ffff",
    white: "#ffffff",
    brightBlack: "#777777",
    brightRed: "#ff7777",
    brightGreen: "#77ff77",
    brightYellow: "#ffff77",
    brightBlue: "#77aaff",
    brightMagenta: "#ff77ff",
    brightCyan: "#77ffff",
    brightWhite: "#ffffff"
  }
};

let state;
let activeSessionId = "";
let selectedProviderId = "";
let commandBuffer = "";
let processAttached = false;
let slashCandidate = false;
let completionIndex = -1;
let completionPrefix = "";
let activeProcessMode = "shell";
let sidebarSessions = [];
let sidebarSessionErrors = [];
let currentTheme = localStorage.getItem("agentcli.theme") || "terminal";
if (!THEMES[currentTheme]) currentTheme = "terminal";
let customTheme = JSON.parse(localStorage.getItem("agentcli.customTheme") || "null") || null;
let themeEditorOpen = false;
let themeTarget = "background";
let sessionFilter = "";
let selectedSessionKey = "";
let visibleSidebarSessions = [];
let previewCollapsed = localStorage.getItem("agentcli.previewCollapsed") !== "false";
let pinnedSessionKeys = new Set(JSON.parse(localStorage.getItem("agentcli.pinnedSessions") || "[]"));
let sessionAliases = JSON.parse(localStorage.getItem("agentcli.sessionAliases") || "{}");
let tabAliases = JSON.parse(localStorage.getItem("agentcli.tabAliases") || "{}");
let tabColors = JSON.parse(localStorage.getItem("agentcli.tabColors") || "{}");
let scratchpadOpen = localStorage.getItem("agentcli.scratchpadOpen") === "true";
let scratchpadText = localStorage.getItem("agentcli.scratchpadText") || "";
let notificationSoundEnabled = localStorage.getItem("agentcli.notificationSoundEnabled") === "true";
let notificationSound = localStorage.getItem("agentcli.notificationSound") || "soft";
let importedFonts = JSON.parse(localStorage.getItem("agentcli.importedFonts") || "[]");
let terminalFontFamily = localStorage.getItem("agentcli.terminalFontFamily") || "";
let renamingTabId = "";
let dictationActive = false;
let mediaRecorder = null;
let mediaStream = null;
let mediaChunks = [];
let paletteOpen = false;
let paletteFilter = "";
let paletteIndex = 0;
let worktreeRepoPath = localStorage.getItem("agentcli.worktreeRepoPath") || "";
let selectedWorktreePath = localStorage.getItem("agentcli.selectedWorktreePath") || "";
let gitWorktrees = [];
const terminalTabs = new Map();
let activeTabId = "";
let restoringWorkspace = false;
let term;
let fit;

migrateLocalStorageNamespace();

function migrateLocalStorageNamespace() {
  const legacyPrefix = "agentic.";
  const nextPrefix = "agentcli.";
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(legacyPrefix)) continue;
    const nextKey = `${nextPrefix}${key.slice(legacyPrefix.length)}`;
    if (localStorage.getItem(nextKey) === null) {
      localStorage.setItem(nextKey, localStorage.getItem(key));
    }
  }
}

const appEl = document.querySelector("#app");
const tabsEl = document.querySelector("#tabs");
const sessionListEl = document.querySelector("#session-list");
const sessionPreviewEl = document.querySelector("#session-preview");
const sessionSearchEl = document.querySelector("#session-search");
const closeSessionsEl = document.querySelector("#close-sessions");
const terminalWrapEl = document.querySelector(".terminal-wrap");
const keyboardCaptureEl = document.querySelector("#keyboard-capture");
const terminalStackEl = document.querySelector("#terminal");
const scratchpadEl = document.querySelector("#scratchpad");
const scratchpadInputEl = document.querySelector("#scratchpad-input");
const scratchpadSendEl = document.querySelector("#scratchpad-send");
const scratchpadPairEl = document.querySelector("#scratchpad-pair");
const scratchpadCloseEl = document.querySelector("#scratchpad-close");
const scratchpadToggleEl = document.querySelector("#scratchpad-toggle");
const newTabEl = document.querySelector("#new-tab");
const sessionsToggleEl = document.querySelector("#sessions-toggle");
const paletteOpenEl = document.querySelector("#palette-open");
const hintBarEl = document.querySelector("#hint-bar");
const hintDismissEl = document.querySelector("#hint-dismiss");
const paletteEl = document.querySelector("#palette");
const paletteInputEl = document.querySelector("#palette-input");
const paletteListEl = document.querySelector("#palette-list");
const themeEditorEl = document.querySelector("#theme-editor");
const themeTargetsEl = document.querySelector("#theme-targets");
const themeHueEl = document.querySelector("#theme-hue");
const themeSaturationEl = document.querySelector("#theme-saturation");
const themeBrightnessEl = document.querySelector("#theme-brightness");
const themeHueValueEl = document.querySelector("#theme-hue-value");
const themeSaturationValueEl = document.querySelector("#theme-saturation-value");
const themeBrightnessValueEl = document.querySelector("#theme-brightness-value");
const themeCloseEl = document.querySelector("#theme-close");
const themeResetEl = document.querySelector("#theme-reset");
const themeDoneEl = document.querySelector("#theme-done");
const dialogEl = document.querySelector("#dialog");
const dialogTitleEl = document.querySelector("#dialog-title");
const dialogBodyEl = document.querySelector("#dialog-body");
const dialogConfirmEl = document.querySelector("#dialog-confirm");
const dialogCancelEl = document.querySelector("#dialog-cancel");
keyboardCaptureEl.focus();

function line(text = "") {
  if (!term) return;
  term.writeln(text);
}

function createTerminal() {
  const nextTerm = new Terminal({
    cursorBlink: true,
    cursorStyle: "block",
    cursorInactiveStyle: "block",
    fontFamily: terminalFontStack(),
    fontSize: 13,
    fontWeight: 500,
    fontWeightBold: 700,
    lineHeight: 1.12,
    letterSpacing: 0,
    scrollback: 10000,
    bellStyle: "none",
    drawBoldTextInBrightColors: true,
    minimumContrastRatio: 1,
    allowProposedApi: false,
    theme: activeTheme()
  });
  const nextFit = new FitAddon.FitAddon();
  nextTerm.loadAddon(nextFit);
  nextTerm.onData((data) => {
    routeInput(data);
  });
  return { term: nextTerm, fit: nextFit };
}

function terminalFontStack() {
  const custom = terminalFontFamily ? `"${terminalFontFamily.replaceAll('"', '\\"')}", ` : "";
  return `${custom}"JetBrainsMono Nerd Font Mono", "JetBrainsMono Nerd Font", "MesloLGS NF", "Hack Nerd Font", "Symbols Nerd Font Mono", "SF Mono", "SFMono-Regular", Menlo, Monaco, monospace`;
}

function addTerminalTab({
  sessionId,
  title,
  mode = "shell",
  provider = "",
  providerSessionId = "",
  cwd = "",
  processAttached: attached = true,
  color = "",
  restored = false,
  activate = true
}) {
  const existing = terminalTabs.get(sessionId);
  if (existing) {
    switchTerminalTab(sessionId);
    return existing;
  }

  const pane = document.createElement("div");
  pane.className = "terminal-pane";
  terminalStackEl.append(pane);

  const created = createTerminal();
  created.term.open(pane);

  const tab = {
    id: sessionId,
    sessionId,
    title,
    alias: tabAliases[sessionId] || "",
    mode,
    provider,
    providerSessionId,
    cwd,
    processAttached: attached,
    unread: false,
    activityTimer: null,
    color: color || tabColors[sessionId] || "",
    restored,
    pane,
    term: created.term,
    fit: created.fit
  };
  terminalTabs.set(sessionId, tab);
  if (restored) {
    tab.term.writeln(`${COLORS.dim}restored ${provider} session${COLORS.reset}`);
    tab.term.writeln(`${COLORS.dim}select this tab to resume ${providerSessionId}${COLORS.reset}`);
  }
  if (activate) switchTerminalTab(sessionId);
  else renderTabs();
  saveWorkspaceLayout();
  requestAnimationFrame(refitTerminal);
  return tab;
}

function switchTerminalTab(tabId, { resumeRestored = true } = {}) {
  const tab = terminalTabs.get(tabId);
  if (!tab) return;

  terminalTabs.forEach((entry) => {
    entry.pane.classList.toggle("active", entry.id === tabId);
  });
  activeTabId = tabId;
  activeSessionId = tab.sessionId;
  processAttached = tab.processAttached;
  activeProcessMode = tab.mode;
  tab.unread = false;
  term = tab.term;
  fit = tab.fit;
  renderTabs();
  saveWorkspaceLayout();
  if (resumeRestored && tab.restored && tab.providerSessionId) resumeRestoredTab(tab);
  requestAnimationFrame(refitTerminal);
  keyboardCaptureEl.focus();
}

function closeTerminalTab(tabId) {
  const tab = terminalTabs.get(tabId);
  if (!tab || terminalTabs.size === 1) return;
  window.agentcli.disposeTerminal(tab.sessionId);
  tab.pane.remove();
  terminalTabs.delete(tabId);
  if (activeTabId === tabId) {
    switchTerminalTab(Array.from(terminalTabs.keys()).at(-1));
  } else {
    renderTabs();
  }
  saveWorkspaceLayout();
}

function renderTabs() {
  tabsEl.innerHTML = Array.from(terminalTabs.values())
    .map(
      (tab) => `
        <div class="tab ${tab.id === activeTabId ? "active" : ""} ${tab.restored ? "restored" : tab.processAttached ? "running" : "exited"} ${tab.unread ? "unread" : ""}" role="button" tabindex="0" data-tab-id="${escapeHtml(tab.id)}" style="${tab.color ? `--tab-accent: ${escapeHtml(tab.color)}` : ""}">
          ${
            renamingTabId === tab.id
              ? `<input class="tab-rename" data-tab-rename="${escapeHtml(tab.id)}" value="${escapeHtml(tabLabel(tab))}" spellcheck="false" />`
              : `<span>${escapeHtml(tabLabel(tab))}</span>`
          }
          ${terminalTabs.size > 1 ? `<button type="button" class="tab-close" data-close-tab="${escapeHtml(tab.id)}" aria-label="Close tab" tabindex="-1">×</button>` : ""}
        </div>
      `
    )
    .join("");
  if (renamingTabId) {
    requestAnimationFrame(() => {
      const input = tabsEl.querySelector(`[data-tab-rename="${CSS.escape(renamingTabId)}"]`);
      input?.focus();
      input?.select();
    });
  }
}

function tabLabel(tab) {
  const title = normalizedTabTitle(tab.alias || tab.title);
  return title || (tab.provider ? providerLabel(tab.provider) : "agentcli");
}

function normalizedTabTitle(title) {
  return title === "shell" ? "agentcli" : title;
}

function renameTab(tabId) {
  const tab = terminalTabs.get(tabId);
  if (!tab) return;
  renamingTabId = tabId;
  renderTabs();
}

function beginTabRenameFromEvent(event) {
  const tab = event.target.closest?.("[data-tab-id]");
  if (!tab || !tabsEl.contains(tab)) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  renameTab(tab.dataset.tabId);
  return true;
}

function commitTabRename(tabId, value) {
  const tab = terminalTabs.get(tabId);
  if (!tab) return;
  const trimmed = value.trim();
  tab.alias = trimmed;
  if (trimmed) tabAliases[tab.id] = trimmed;
  else delete tabAliases[tab.id];
  renamingTabId = "";
  localStorage.setItem("agentcli.tabAliases", JSON.stringify(tabAliases));
  renderTabs();
  saveWorkspaceLayout();
}

function cancelTabRename() {
  renamingTabId = "";
  renderTabs();
}

function updateActiveTab(patch) {
  const tab = terminalTabs.get(activeTabId);
  if (!tab) return;
  Object.assign(tab, patch);
  if ("processAttached" in patch) processAttached = patch.processAttached;
  if ("mode" in patch) activeProcessMode = patch.mode;
  renderTabs();
  saveWorkspaceLayout();
}

function setActiveTabColor(color) {
  const tab = terminalTabs.get(activeTabId);
  if (!tab) return;
  tab.color = color;
  if (color) tabColors[tab.id] = color;
  else delete tabColors[tab.id];
  localStorage.setItem("agentcli.tabColors", JSON.stringify(tabColors));
  renderTabs();
  saveWorkspaceLayout();
}

function savedWorkspaceLayout() {
  try {
    return JSON.parse(localStorage.getItem("agentcli.workspaceLayout") || "null");
  } catch {
    return null;
  }
}

function saveWorkspaceLayout() {
  if (restoringWorkspace) return;
  const tabs = Array.from(terminalTabs.values()).map((tab) => ({
    title: normalizedTabTitle(tab.title),
    alias: tab.alias || "",
    mode: tab.mode,
    provider: tab.provider,
    providerSessionId: tab.providerSessionId || "",
    color: tab.color || "",
    kind: tab.provider && tab.providerSessionId ? "agent" : "shell"
  }));
  localStorage.setItem(
    "agentcli.workspaceLayout",
    JSON.stringify({
      version: 1,
      activeTabId,
      sidebarOpen: appEl.classList.contains("sessions-open"),
      tabs
    })
  );
}

async function restoreWorkspaceLayout() {
  const layout = savedWorkspaceLayout();
  if (!layout?.tabs?.length) {
    await ensureShell();
    return;
  }

  restoringWorkspace = true;
  let firstTabId = "";
  for (const savedTab of layout.tabs) {
    if (savedTab.kind === "agent" && savedTab.provider && savedTab.providerSessionId) {
      const restoredId = `restored:${savedTab.provider}:${savedTab.providerSessionId}`;
      addTerminalTab({
        sessionId: restoredId,
        title: savedTab.title || `${savedTab.provider}: ${savedTab.providerSessionId.slice(0, 8)}`,
        mode: "agent",
        provider: savedTab.provider,
        providerSessionId: savedTab.providerSessionId,
        processAttached: false,
        color: savedTab.color || "",
        restored: true,
        activate: false
      });
      const restoredTab = terminalTabs.get(restoredId);
      if (restoredTab) restoredTab.alias = savedTab.alias || "";
      firstTabId ||= restoredId;
    } else {
      const result = await window.agentcli.startShell();
      await refresh(result.state);
      addTerminalTab({
        sessionId: result.sessionId,
        title: savedTab.title || "agentcli",
        mode: "shell",
        color: savedTab.color || "",
        activate: false
      });
      const restoredTab = terminalTabs.get(result.sessionId);
      if (restoredTab) restoredTab.alias = savedTab.alias || "";
      firstTabId ||= result.sessionId;
    }
  }
  restoringWorkspace = false;

  const firstShell = Array.from(terminalTabs.values()).find((tab) => !tab.providerSessionId)?.id;
  switchTerminalTab(firstShell || firstTabId || Array.from(terminalTabs.keys())[0], { resumeRestored: false });
  toggleSessions(Boolean(layout.sidebarOpen));
  saveWorkspaceLayout();
}

async function resumeRestoredTab(tab) {
  if (!tab.restored || tab.resuming) return;
  tab.resuming = true;
  tab.term.writeln("");
  tab.term.writeln(`${COLORS.dim}resuming ${tab.provider} session...${COLORS.reset}`);
  try {
    const result =
      tab.provider === "claude"
        ? await window.agentcli.resumeClaudeSession(tab.providerSessionId)
        : await window.agentcli.resumeCodexThread(tab.providerSessionId);
    await refresh(result.state);
    const oldId = tab.id;
    terminalTabs.delete(tab.id);
    tab.id = result.sessionId;
    tab.sessionId = result.sessionId;
    if (tab.alias) {
      delete tabAliases[oldId];
      tabAliases[tab.id] = tab.alias;
      localStorage.setItem("agentcli.tabAliases", JSON.stringify(tabAliases));
    }
    tab.processAttached = true;
    tab.restored = false;
    tab.resuming = false;
    terminalTabs.set(tab.id, tab);
    activeTabId = tab.id;
    activeSessionId = tab.sessionId;
    processAttached = true;
    activeProcessMode = "agent";
    renderTabs();
    renderSessions();
    saveWorkspaceLayout();
  } catch (error) {
    tab.resuming = false;
    tab.term.writeln(`${COLORS.red}${error.message}${COLORS.reset}`);
    renderTabs();
  }
}

function toggleSessions(force) {
  const next = typeof force === "boolean" ? force : !appEl.classList.contains("sessions-open");
  appEl.classList.toggle("sessions-open", next);
  sessionsToggleEl?.classList.toggle("active", next);
  sessionsToggleEl?.setAttribute("aria-pressed", String(next));
  if (next) refreshProviderSessions();
  saveWorkspaceLayout();
  requestAnimationFrame(() => {
    if (fit) fit.fit();
    resizeActivePty();
  });
}

function refitTerminal() {
  if (!fit) return;
  fit.fit();
  resizeActivePty();
}

async function newAgentcliTab() {
  await ensureShell();
}

async function ensureShell() {
  const result = await window.agentcli.startShell();
  await refresh(result.state);
  addTerminalTab({
    sessionId: result.sessionId,
    title: "agentcli",
    mode: "shell",
    cwd: result.cwd || ""
  });
  activeSessionId = result.sessionId;
  processAttached = true;
  activeProcessMode = "shell";
  requestAnimationFrame(refitTerminal);
}

async function refresh(nextState) {
  state = nextState || (await window.agentcli.getState());
  selectedProviderId = state.selectedProviderId || selectedProviderId || "codex";
  if (!activeSessionId && state.sessions[0]) activeSessionId = state.sessions[0].id;
  renderSessions();
}

function renderSessions() {
  const filteredSessions = filterSessions(sidebarSessions);
  const orderedSessions = sortSessionsForDisplay(filteredSessions);
  visibleSidebarSessions = orderedSessions;
  if (orderedSessions.length && !orderedSessions.some((session) => sessionKey(session) === selectedSessionKey)) {
    selectedSessionKey = sessionKey(orderedSessions[0]);
  }

  if (!orderedSessions.length) {
    visibleSidebarSessions = [];
    selectedSessionKey = "";
    const errorText = sidebarSessionErrors.length ? ` ${sidebarSessionErrors.join(" ")}` : "";
    sessionListEl.innerHTML = `<div class="empty">No sessions found.${escapeHtml(errorText)}</div>`;
    renderSessionPreview();
    return;
  }

  let sessionIndex = 0;
  const errorBanner = sidebarSessionErrors.length
    ? `<div class="session-warning">${escapeHtml(sidebarSessionErrors.join(" "))}</div>`
    : "";
  sessionListEl.innerHTML = errorBanner + groupSessionsByWorkspace(orderedSessions)
    .map(({ workspace, sessions }) => {
      const cards = sessions
        .map((session) => {
          sessionIndex += 1;
          const isOpen = isProviderSessionOpen(session.provider, session.id);
          const selected = sessionKey(session) === selectedSessionKey;
          const pinned = isPinnedSession(session);
          return `
            <button class="session-card ${isOpen ? "open" : ""} ${selected ? "selected" : ""}" data-provider="${escapeHtml(session.provider)}" data-session-id="${escapeHtml(session.id)}" data-session-key="${escapeHtml(sessionKey(session))}">
              <span class="pin-toggle ${pinned ? "pinned" : ""}" data-pin-session="${escapeHtml(sessionKey(session))}" title="${pinned ? "Unpin session" : "Pin session"}">${pinned ? "★" : "☆"}</span>
              <span class="provider-mark ${escapeHtml(session.provider)}" aria-hidden="true">${providerMarkHtml(session.provider)}</span>
              <span class="session-main">
                <strong>${escapeHtml(sessionTitle(session))}</strong>
                <span>${escapeHtml(providerLabel(session.provider))} · ${escapeHtml(formatThreadDate(session.updatedAt))} · ${escapeHtml(sessionStatus(session, isOpen))}</span>
                <span>${escapeHtml(session.id)}</span>
              </span>
            </button>
          `;
        })
        .join("");
      return `
        <section class="session-group">
          <div class="session-group-title" title="${escapeHtml(workspace)}">${escapeHtml(workspaceLabel(workspace))}</div>
          ${cards}
        </section>
      `;
    })
    .join("");
  renderSessionPreview();
}

function sortSessionsForDisplay(sessions) {
  return [...sessions].sort((a, b) => {
    const pinnedDelta = Number(isPinnedSession(b)) - Number(isPinnedSession(a));
    if (pinnedDelta) return pinnedDelta;
    return normalizedTimestamp(b.updatedAt) - normalizedTimestamp(a.updatedAt);
  });
}

function renderSessionPreview() {
  sessionPreviewEl.classList.toggle("collapsed", previewCollapsed);
  const session = selectedSidebarSession();
  if (!session) {
    sessionPreviewEl.innerHTML = `
      <button class="preview-toggle" data-toggle-preview>show preview</button>
      <div class="preview-body"><div class="preview-empty">Select a session</div></div>
    `;
    return;
  }

  const isOpen = isProviderSessionOpen(session.provider, session.id);
  const alias = sessionAliases[sessionKey(session)] || "";
  sessionPreviewEl.innerHTML = `
    <button class="preview-toggle" data-toggle-preview>${previewCollapsed ? "show preview" : "hide preview"}</button>
    <div class="preview-body">
      <div class="preview-top">
        <span class="provider-mark ${escapeHtml(session.provider)}" aria-hidden="true">${providerMarkHtml(session.provider)}</span>
        <div>
          <strong>${escapeHtml(providerLabel(session.provider))}</strong>
          <span>${escapeHtml(sessionStatus(session, isOpen))} · ${escapeHtml(formatThreadDate(session.updatedAt))}</span>
        </div>
      </div>
      <div class="preview-title">${escapeHtml(sessionTitle(session))}</div>
      <div class="preview-actions">
        <button class="preview-open" data-open-session>${isOpen ? "Switch to tab" : "Open session"}</button>
        <button class="rename-session" data-rename-session="${escapeHtml(sessionKey(session))}">${alias ? "Rename alias" : "Add alias"}</button>
      </div>
      <div class="preview-row"><b>workspace</b><span title="${escapeHtml(sessionWorkspace(session))}">${escapeHtml(sessionWorkspace(session))}</span></div>
      <div class="preview-row"><b>session</b><span class="mono">${escapeHtml(session.id)}</span></div>
    </div>
  `;
}

function selectedSidebarSession() {
  return visibleSidebarSessions.find((session) => sessionKey(session) === selectedSessionKey);
}

function sessionKey(session) {
  return `${session.provider}:${session.id}`;
}

function isPinnedSession(session) {
  return pinnedSessionKeys.has(sessionKey(session));
}

function togglePinnedSession(key) {
  if (pinnedSessionKeys.has(key)) pinnedSessionKeys.delete(key);
  else pinnedSessionKeys.add(key);
  localStorage.setItem("agentcli.pinnedSessions", JSON.stringify(Array.from(pinnedSessionKeys)));
  selectedSessionKey = key;
  renderSessions();
}

function selectSidebarSession(sessionKeyToSelect, { scroll = false } = {}) {
  if (!visibleSidebarSessions.some((session) => sessionKey(session) === sessionKeyToSelect)) return;
  selectedSessionKey = sessionKeyToSelect;
  renderSessions();
  if (scroll) {
    sessionListEl.querySelector(`[data-session-key="${CSS.escape(sessionKeyToSelect)}"]`)?.scrollIntoView({
      block: "nearest"
    });
  }
}

function moveSidebarSelection(delta) {
  if (!visibleSidebarSessions.length) return;
  const currentIndex = Math.max(
    0,
    visibleSidebarSessions.findIndex((session) => sessionKey(session) === selectedSessionKey)
  );
  const nextIndex = (currentIndex + delta + visibleSidebarSessions.length) % visibleSidebarSessions.length;
  selectSidebarSession(sessionKey(visibleSidebarSessions[nextIndex]), { scroll: true });
}

async function openSelectedSidebarSession() {
  const session = selectedSidebarSession();
  if (!session) return;
  await openProviderSession(session.provider, session.id);
}

function sessionTitle(session) {
  return sessionAliases[sessionKey(session)] || session.name || session.preview || session.summary || session.title || "Untitled session";
}

function rawSessionTitle(session) {
  return session.name || session.preview || session.summary || session.title || "Untitled session";
}

async function renameSessionAlias(key) {
  const session = visibleSidebarSessions.find((item) => sessionKey(item) === key);
  const current = sessionAliases[key] || "";
  const next = await inputDialog({
    title: "Session alias",
    label: "Give this session a memorable name. Leave empty to clear the alias.",
    value: current || rawSessionTitle(session || {}),
    placeholder: "Session alias",
    confirmText: "Save"
  });
  if (next === null) return;
  if (next) sessionAliases[key] = next;
  else delete sessionAliases[key];
  localStorage.setItem("agentcli.sessionAliases", JSON.stringify(sessionAliases));
  renderSessions();
}

function providerLabel(provider) {
  return provider === "claude" ? "Claude" : provider === "codex" ? "Codex" : provider || "agentcli";
}

function providerMark(provider) {
  return provider === "claude" ? "C" : provider === "codex" ? "Cx" : "$";
}

// Claude's radiating sunburst, drawn as 12 tapered blades around the center.
function claudeMarkSvg() {
  const blade = "M12 12 Q13.2 6.6 12 2.3 Q10.8 6.6 12 12 Z";
  const blades = Array.from({ length: 12 }, (_unused, index) => `<path d="${blade}" transform="rotate(${index * 30} 12 12)"/>`).join("");
  return `<svg class="mark-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${blades}</svg>`;
}

// OpenAI logomark.
function codexMarkSvg() {
  return `<svg class="mark-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`;
}

function providerMarkHtml(provider) {
  if (provider === "claude") return claudeMarkSvg();
  if (provider === "codex") return codexMarkSvg();
  return escapeHtml(providerMark(provider));
}

function sessionWorkspace(session) {
  return (
    session.cwd ||
    session.metadata?.cwd ||
    session.workspacePath ||
    session.workingDirectory ||
    session.repositoryPath ||
    session.repository ||
    session.git?.repo_path ||
    "unknown workspace"
  );
}

function sessionStatus(session, isOpen) {
  if (isOpen) return "open";
  return session.status?.type || session.status || "saved";
}

function isProviderSessionOpen(provider, providerSessionId) {
  return Array.from(terminalTabs.values()).some(
    (tab) => tab.provider === provider && tab.providerSessionId === providerSessionId
  );
}

function filterSessions(sessions) {
  const query = sessionFilter.trim().toLowerCase();
  if (!query) return sessions;
  return sessions.filter((session) =>
    [sessionTitle(session), sessionWorkspace(session), session.id, session.provider, sessionStatus(session, false)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function groupSessionsByWorkspace(sessions) {
  const groups = new Map();
  sessions.forEach((session) => {
    const workspace = sessionWorkspace(session);
    if (!groups.has(workspace)) groups.set(workspace, []);
    groups.get(workspace).push(session);
  });
  return Array.from(groups, ([workspace, groupedSessions]) => ({ workspace, sessions: groupedSessions }));
}

async function refreshProviderSessions() {
  sessionListEl.innerHTML = `<div class="empty">Loading sessions...</div>`;
  const [codexResult, claudeResult] = await Promise.allSettled([
    window.agentcli.listCodexThreads({ limit: 50 }),
    window.agentcli.listClaudeSessions({ limit: 50 })
  ]);

  sidebarSessions = [];
  sidebarSessionErrors = [];

  if (codexResult.status === "fulfilled") {
    sidebarSessions.push(...codexResult.value.map((thread) => ({ ...thread, provider: "codex" })));
  } else {
    sidebarSessionErrors.push(`Codex unavailable: ${codexResult.reason?.message || codexResult.reason}`);
  }

  if (claudeResult.status === "fulfilled") {
    sidebarSessions.push(...claudeResult.value.map((session) => ({ ...session, provider: "claude" })));
  } else {
    sidebarSessionErrors.push(`Claude unavailable: ${claudeResult.reason?.message || claudeResult.reason}`);
  }

  sidebarSessions.sort((a, b) => normalizedTimestamp(b.updatedAt) - normalizedTimestamp(a.updatedAt));
  renderSessions();
}

async function ensureSidebarSessionsLoaded() {
  if (sidebarSessions.length || sidebarSessionErrors.length) return;
  await refreshProviderSessions();
}

function latestSessionForProvider(provider) {
  return sidebarSessions
    .filter((session) => session.provider === provider)
    .sort((a, b) => normalizedTimestamp(b.updatedAt) - normalizedTimestamp(a.updatedAt))[0];
}

async function openProviderSession(provider, providerSessionId) {
  const existingTab = Array.from(terminalTabs.values()).find(
    (tab) => tab.provider === provider && tab.providerSessionId === providerSessionId
  );
  if (existingTab) {
    switchTerminalTab(existingTab.id);
    toggleSessions(false);
    return;
  }

  const result =
    provider === "claude"
      ? await window.agentcli.resumeClaudeSession(providerSessionId)
      : await window.agentcli.resumeCodexThread(providerSessionId);
  await refresh(result.state);
  const sourceSession = sidebarSessions.find(
    (session) => session.provider === provider && session.id === providerSessionId
  );
  addTerminalTab({
    sessionId: result.sessionId,
    title: `${provider}: ${(sessionTitle(sourceSession || { id: providerSessionId })).slice(0, 28)}`,
    mode: "agent",
    provider
  });
  updateActiveTab({ providerSessionId });
  toggleSessions(false);
  renderSessions();
}

function activeTab() {
  return terminalTabs.get(activeTabId);
}

function handoffPrompt(sourceTab, targetProvider) {
  const sourceProvider = sourceTab.provider || "agentcli";
  const sourceSession = sourceTab.providerSessionId || sourceTab.sessionId || "unknown";
  return [
    `Handoff from ${sourceProvider} tab "${sourceTab.title}".`,
    `Source session: ${sourceSession}.`,
    "",
    "Continue the work from this point. First summarize what you need from the current repository state, inspect the codebase if needed, then proceed with the next concrete step.",
    `You are now the ${targetProvider} agent taking over.`
  ].join("\n");
}

async function handoffActiveTab(targetProvider) {
  const sourceTab = activeTab();
  if (!sourceTab) return;
  const result = await window.agentcli.startSession({
    providerId: targetProvider,
    title: `${targetProvider} handoff`,
    cwd: sourceTab.cwd || ""
  });
  await refresh(result.state);
  const tab = addTerminalTab({
    sessionId: result.sessionId,
    title: `${targetProvider}: handoff`,
    mode: "agent",
    provider: targetProvider,
    cwd: sourceTab.cwd || "",
    color: targetProvider === "claude" ? "#d97745" : "#8caaee"
  });
  captureAgentSessionId(tab);

  const prompt = handoffPrompt(sourceTab, targetProvider);
  setTimeout(() => {
    window.agentcli.writeTerminal({ sessionId: result.sessionId, data: prompt });
  }, 700);
}

function renderScratchpad() {
  scratchpadEl.classList.toggle("collapsed", !scratchpadOpen);
  scratchpadToggleEl.classList.toggle("active", scratchpadOpen);
  scratchpadToggleEl.setAttribute("aria-pressed", String(scratchpadOpen));
  scratchpadInputEl.value = scratchpadText;
  if (scratchpadOpen) requestAnimationFrame(() => scratchpadInputEl.focus());
  requestAnimationFrame(refitTerminal);
}

function setScratchpadOpen(open) {
  scratchpadOpen = open;
  localStorage.setItem("agentcli.scratchpadOpen", String(open));
  renderScratchpad();
}

function updateScratchpadText() {
  scratchpadText = scratchpadInputEl.value;
  localStorage.setItem("agentcli.scratchpadText", scratchpadText);
}

function scratchpadPrompt() {
  return scratchpadInputEl.value.trim();
}

function sendTextToSession(sessionId, text) {
  if (!text.trim()) return;
  window.agentcli.writeTerminal({ sessionId, data: text.trim() });
}

function sendScratchpadToActiveTab() {
  const text = scratchpadPrompt();
  if (!text) return;
  sendTextToSession(activeSessionId, text);
  setScratchpadOpen(false);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listProviderSessions(provider, { bypassCache = false } = {}) {
  try {
    if (provider === "claude") {
      return (await window.agentcli.listClaudeSessions({ limit: 50 })).map((session) => ({ ...session, provider: "claude" }));
    }
    if (provider === "codex") {
      return (await window.agentcli.listCodexThreads({ limit: 50, bypassCache })).map((thread) => ({ ...thread, provider: "codex" }));
    }
  } catch {
    return [];
  }
  return [];
}

function assignProviderSessionId(tab, providerSessionId) {
  if (!tab || !providerSessionId || tab.providerSessionId === providerSessionId) return;
  tab.providerSessionId = providerSessionId;
  saveWorkspaceLayout();
  renderTabs();
  renderSessions();
  // Best effort: keep the persisted store in sync. Shell-hosted agents have no
  // store entry, so a failure here is expected and harmless.
  window.agentcli.setProviderSessionId({ sessionId: tab.sessionId, providerSessionId }).catch(() => {});
}

// Freshly started agents (handoff, pair, worktree, or a typed `claude`/`codex`)
// don't yet know their provider session id, so they can't be restored after a
// restart. Discover it by diffing the provider's session list before and after
// launch and attach the new id to the tab.
async function captureAgentSessionId(tab) {
  if (!tab?.provider || tab.providerSessionId || tab.restored) return;
  const provider = tab.provider;
  const cwd = tab.cwd || "";
  const before = new Set((await listProviderSessions(provider, { bypassCache: true })).map((session) => session.id));
  const byRecency = (a, b) => normalizedTimestamp(b.updatedAt) - normalizedTimestamp(a.updatedAt);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await delay(1500);
    if (tab.providerSessionId || !terminalTabs.has(tab.id)) return;
    const fresh = (await listProviderSessions(provider, { bypassCache: true })).filter((session) => !before.has(session.id));
    if (!fresh.length) continue;
    const match =
      (cwd && fresh.filter((session) => sessionWorkspace(session) === cwd).sort(byRecency)[0]) ||
      fresh.sort(byRecency)[0];
    if (match) {
      assignProviderSessionId(tab, match.id);
      return;
    }
  }
}

async function startAgentWithPrompt(provider, prompt, title = `${provider}: task`) {
  const result = await window.agentcli.startSession({
    providerId: provider,
    title
  });
  await refresh(result.state);
  const tab = addTerminalTab({
    sessionId: result.sessionId,
    title,
    mode: "agent",
    provider,
    color: provider === "claude" ? "#d97745" : "#8caaee"
  });
  captureAgentSessionId(tab);
  setTimeout(() => {
    sendTextToSession(result.sessionId, prompt);
  }, 700);
  return result;
}

function setGitWorktreeState(result) {
  if (!result) return false;
  worktreeRepoPath = result.repoPath;
  gitWorktrees = result.worktrees || [];
  if (!gitWorktrees.some((worktree) => worktree.path === selectedWorktreePath)) {
    selectedWorktreePath = gitWorktrees[0]?.path || "";
  }
  localStorage.setItem("agentcli.worktreeRepoPath", worktreeRepoPath);
  localStorage.setItem("agentcli.selectedWorktreePath", selectedWorktreePath);
  return true;
}

function selectedGitWorktree() {
  return gitWorktrees.find((worktree) => worktree.path === selectedWorktreePath) || gitWorktrees[0] || null;
}

function printGitWorktrees() {
  if (!worktreeRepoPath) {
    line(`${COLORS.dim}No git repository selected.${COLORS.reset}`);
    return;
  }
  line(`${COLORS.blue}worktrees:${COLORS.reset} ${worktreeRepoPath}`);
  gitWorktrees.forEach((worktree, index) => {
    const selected = worktree.path === selectedWorktreePath ? "*" : " ";
    const branch = worktree.branch || (worktree.detached ? "detached" : "unknown");
    line(`${selected} ${index + 1}. ${branch}  ${worktree.path}`);
  });
}

async function chooseGitRepo() {
  const result = await window.agentcli.chooseGitRepo();
  if (setGitWorktreeState(result)) printGitWorktrees();
}

async function refreshGitWorktrees() {
  if (!worktreeRepoPath) {
    await chooseGitRepo();
    return;
  }
  try {
    setGitWorktreeState(await window.agentcli.listGitWorktrees(worktreeRepoPath));
    printGitWorktrees();
  } catch (error) {
    line(`${COLORS.red}worktree error:${COLORS.reset} ${error.message}`);
  }
}

async function ensureGitWorktrees() {
  if (!worktreeRepoPath) await chooseGitRepo();
  else if (!gitWorktrees.length) await refreshGitWorktrees();
  return Boolean(worktreeRepoPath && gitWorktrees.length);
}

async function chooseGitWorktreeFromPrompt() {
  if (!(await ensureGitWorktrees())) return null;
  const current = selectedGitWorktree();
  const chosen = await selectDialog({
    title: "Choose worktree",
    confirmText: "Select",
    selectedValue: current?.path || "",
    items: gitWorktrees.map((worktree) => ({
      value: worktree.path,
      label: worktree.branch || (worktree.detached ? "detached" : worktree.name || "worktree"),
      detail: worktree.path
    }))
  });
  if (!chosen) return current;
  selectedWorktreePath = chosen.value;
  localStorage.setItem("agentcli.selectedWorktreePath", selectedWorktreePath);
  return gitWorktrees.find((worktree) => worktree.path === chosen.value) || current;
}

async function createGitWorktree() {
  if (!worktreeRepoPath) await chooseGitRepo();
  if (!worktreeRepoPath) return;
  const branch = await inputDialog({
    title: "New worktree",
    label: "Branch name (created if it does not exist).",
    placeholder: "feature/my-branch",
    confirmText: "Next"
  });
  if (!branch) return;
  const suggestedPath = await window.agentcli.suggestGitWorktreePath({ repoPath: worktreeRepoPath, branch });
  const worktreePath = await inputDialog({
    title: "New worktree",
    label: "Worktree path",
    value: suggestedPath,
    confirmText: "Create"
  });
  if (!worktreePath) return;
  try {
    setGitWorktreeState(await window.agentcli.createGitWorktree({ repoPath: worktreeRepoPath, branch, worktreePath }));
    selectedWorktreePath = worktreePath;
    localStorage.setItem("agentcli.selectedWorktreePath", selectedWorktreePath);
    printGitWorktrees();
  } catch (error) {
    line(`${COLORS.red}create worktree failed:${COLORS.reset} ${error.message}`);
  }
}

async function removeSelectedGitWorktree() {
  const worktree = await chooseGitWorktreeFromPrompt();
  if (!worktree) return;
  if (worktree.isMain) {
    line(`${COLORS.red}Refusing to remove the main worktree.${COLORS.reset}`);
    return;
  }
  const confirmed = await confirmDialog({
    title: "Remove worktree",
    message: `Remove this worktree?\n${worktree.path}`,
    confirmText: "Remove",
    danger: true
  });
  if (!confirmed) return;
  try {
    setGitWorktreeState(await window.agentcli.removeGitWorktree({ repoPath: worktreeRepoPath, worktreePath: worktree.path }));
    printGitWorktrees();
  } catch (error) {
    line(`${COLORS.red}remove worktree failed:${COLORS.reset} ${error.message}`);
  }
}

async function openGitWorktreeShell() {
  const worktree = await chooseGitWorktreeFromPrompt();
  if (!worktree) return;
  const result = await window.agentcli.startShell({ cwd: worktree.path });
  await refresh(result.state);
  addTerminalTab({
    sessionId: result.sessionId,
    title: `wt: ${worktree.branch || worktree.name}`,
    mode: "shell",
    cwd: worktree.path,
    color: "#a6d189"
  });
}

async function openGitWorktreeAgent(provider) {
  const worktree = await chooseGitWorktreeFromPrompt();
  if (!worktree) return;
  const result = await window.agentcli.startSession({
    providerId: provider,
    title: `${provider}: ${worktree.branch || worktree.name}`,
    cwd: worktree.path
  });
  await refresh(result.state);
  const tab = addTerminalTab({
    sessionId: result.sessionId,
    title: `${provider}: ${worktree.branch || worktree.name}`,
    mode: "agent",
    provider,
    cwd: worktree.path,
    color: provider === "claude" ? "#d97745" : "#8caaee"
  });
  captureAgentSessionId(tab);
}

async function runPairMode() {
  const prompt = scratchpadPrompt();
  if (!prompt) {
    setScratchpadOpen(true);
    return;
  }
  await startAgentWithPrompt("codex", prompt, "codex: pair");
  await startAgentWithPrompt("claude", prompt, "claude: pair");
  setScratchpadOpen(false);
}

// workspaceLabel, formatThreadDate, normalizedTimestamp, escapeHtml moved to lib/format.js

function setTheme(themeName) {
  const theme = THEMES[themeName];
  if (!theme) {
    line(`${COLORS.red}Unknown theme:${COLORS.reset} ${themeName}`);
    line(`Themes: ${Object.keys(THEMES).join(", ")}`);
    return;
  }
  customTheme = null;
  localStorage.removeItem("agentcli.customTheme");
  currentTheme = themeName;
  localStorage.setItem("agentcli.theme", themeName);
  terminalTabs.forEach((tab) => {
    tab.term.options.theme = theme;
  });
  document.body.dataset.theme = themeName;
  applyThemeToDocument(theme);
}

function activeTheme() {
  return customTheme || THEMES[currentTheme] || THEMES.terminal;
}

function applyThemeToDocument(theme) {
  const panel = theme.black || "#202532";
  const background = theme.background || "#252936";
  const foreground = theme.foreground || "#dfe5f2";
  // Secondary UI text. The terminal's "bright black" is far too dim for chrome,
  // so blend the foreground toward the background for a readable muted tone.
  const muted = mixHex(foreground, background, 0.62);
  const vars = {
    "--bg": background,
    "--panel": panel,
    "--panel-2": adjustHexBrightness(panel, -10),
    "--line": adjustHexBrightness(panel, 22),
    "--line-soft": adjustHexBrightness(panel, 12),
    "--text": foreground,
    "--muted": muted,
    "--green": theme.green || "#a6d189",
    "--blue": theme.blue || "#8caaee",
    "--red": theme.red || "#e78284",
    "--yellow": theme.yellow || "#e5c890"
  };
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
    document.body.style.setProperty(key, value);
  });
}

function applyCustomTheme(theme) {
  customTheme = theme;
  localStorage.setItem("agentcli.customTheme", JSON.stringify(customTheme));
  terminalTabs.forEach((tab) => {
    tab.term.options.theme = customTheme;
  });
  applyThemeToDocument(customTheme);
  renderThemeEditor();
}

function openThemeEditor() {
  themeEditorOpen = true;
  themeEditorEl.classList.add("open");
  themeEditorEl.setAttribute("aria-hidden", "false");
  if (!customTheme) {
    customTheme = { ...(THEMES[currentTheme] || THEMES.terminal) };
    localStorage.setItem("agentcli.customTheme", JSON.stringify(customTheme));
  }
  renderThemeEditor();
}

function closeThemeEditor() {
  themeEditorOpen = false;
  themeEditorEl.classList.remove("open");
  themeEditorEl.setAttribute("aria-hidden", "true");
  keyboardCaptureEl.focus();
}

function resetCustomTheme() {
  customTheme = null;
  localStorage.removeItem("agentcli.customTheme");
  setTheme(currentTheme);
  renderThemeEditor();
}

function themeTargets() {
  return [
    ["background", "Background"],
    ["black", "Panel"],
    ["foreground", "Text"],
    ["brightBlack", "Muted"],
    ["blue", "blue"],
    ["green", "green"],
    ["red", "red"],
    ["yellow", "yellow"]
  ];
}

function renderThemeEditor() {
  if (!themeEditorOpen) return;
  const theme = activeTheme();
  themeTargetsEl.innerHTML = themeTargets()
    .map(
      ([key, label]) => `
        <button class="theme-target ${key === themeTarget ? "active" : ""}" data-theme-target="${escapeHtml(key)}" style="--swatch: ${escapeHtml(theme[key] || "#000")}">
          <i class="theme-swatch"></i>
          <span>${escapeHtml(label)}</span>
        </button>
      `
    )
    .join("");
  const hsb = hexToHsb(theme[themeTarget] || "#000000");
  themeHueEl.value = String(hsb.h);
  themeSaturationEl.value = String(hsb.s);
  themeBrightnessEl.value = String(hsb.b);
  themeHueValueEl.textContent = `${hsb.h}°`;
  themeSaturationValueEl.textContent = `${hsb.s}%`;
  themeBrightnessValueEl.textContent = `${hsb.b}%`;
}

function updateThemeTargetFromSliders() {
  themeHueValueEl.textContent = `${themeHueEl.value}°`;
  themeSaturationValueEl.textContent = `${themeSaturationEl.value}%`;
  themeBrightnessValueEl.textContent = `${themeBrightnessEl.value}%`;
  const next = {
    ...activeTheme(),
    [themeTarget]: hsbToHex(Number(themeHueEl.value), Number(themeSaturationEl.value), Number(themeBrightnessEl.value))
  };
  if (themeTarget === "background") {
    next.selectionBackground = adjustHexBrightness(next.background, 18);
  }
  applyCustomTheme(next);
}

// Color helpers (hexToRgb, rgbToHex, hexToHsb, hsbToHex, adjustHexBrightness, mixHex) moved to lib/colors.js

async function loadImportedFonts() {
  for (const font of importedFonts) {
    try {
      const face = new FontFace(font.family, `url("${font.url}")`);
      await face.load();
      document.fonts.add(face);
    } catch {
      // Ignore fonts that were removed from disk.
    }
  }
}

async function importTerminalFont() {
  const font = await window.agentcli.importFont();
  if (!font) return;
  importedFonts = [...importedFonts.filter((entry) => entry.family !== font.family), font];
  localStorage.setItem("agentcli.importedFonts", JSON.stringify(importedFonts));
  terminalFontFamily = font.family;
  localStorage.setItem("agentcli.terminalFontFamily", terminalFontFamily);
  await loadImportedFonts();
  applyTerminalFont();
}

function setTerminalFont(family) {
  terminalFontFamily = family;
  localStorage.setItem("agentcli.terminalFontFamily", terminalFontFamily);
  applyTerminalFont();
}

function applyTerminalFont() {
  const fontFamily = terminalFontStack();
  terminalTabs.forEach((tab) => {
    tab.term.options.fontFamily = fontFamily;
    tab.fit.fit();
  });
}

function setNotificationSoundEnabled(enabled) {
  notificationSoundEnabled = enabled;
  localStorage.setItem("agentcli.notificationSoundEnabled", String(enabled));
  line(`${COLORS.dim}agent notification sound ${enabled ? "enabled" : "disabled"}${COLORS.reset}`);
}

function setNotificationSound(name) {
  notificationSound = name;
  localStorage.setItem("agentcli.notificationSound", name);
  playNotificationSound();
}

function playNotificationSound() {
  if (!notificationSoundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audio = new AudioContext();
  const now = audio.currentTime;
  const patterns = {
    soft: [440, 660],
    chime: [523.25, 659.25, 783.99],
    complete: [392, 523.25, 659.25]
  };
  const notes = patterns[notificationSound] || patterns.soft;
  notes.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    const start = now + index * 0.11;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
  });
  setTimeout(() => audio.close(), 700);
}

function noteAgentActivity(tab) {
  if (!tab.provider || tab.restored || !tab.processAttached || !tab.awaitingCompletionSound) return;
  clearTimeout(tab.activityTimer);
  tab.activityTimer = setTimeout(() => {
    if (!tab.processAttached || !tab.awaitingCompletionSound) return;
    tab.awaitingCompletionSound = false;
    playNotificationSound();
  }, 7000);
}

function insertPromptText(text) {
  const normalized = text.trim();
  if (!normalized) return;
  if (scratchpadOpen) {
    const prefix = scratchpadInputEl.value && !scratchpadInputEl.value.endsWith("\n") ? "\n" : "";
    scratchpadInputEl.value += `${prefix}${normalized}`;
    updateScratchpadText();
    scratchpadInputEl.focus();
    return;
  }
  routeInput(normalized);
}

function startDictation() {
  if (dictationActive) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    line(`${COLORS.red}voice recording unavailable in this Electron runtime${COLORS.reset}`);
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaStream = stream;
      mediaChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunks.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audio = new Blob(mediaChunks, { type: mimeType });
        mediaStream?.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        mediaRecorder = null;
        mediaChunks = [];
        line(`${COLORS.dim}transcribing...${COLORS.reset}`);
        try {
          const bytes = Array.from(new Uint8Array(await audio.arrayBuffer()));
          const text = await window.agentcli.transcribeAudio({ bytes, mimeType, locale: navigator.language || "en-US" });
          insertPromptText(text);
        } catch (error) {
          line(`${COLORS.red}dictation error:${COLORS.reset} ${error.message}`);
        }
      };
      mediaRecorder.start();
      dictationActive = true;
      line(`${COLORS.dim}recording voice prompt... press Cmd+Shift+Space again to stop${COLORS.reset}`);
    })
    .catch((error) => {
      line(`${COLORS.red}microphone error:${COLORS.reset} ${error.message}`);
    });
}

function stopDictation() {
  if (!mediaRecorder) return;
  if (mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  dictationActive = false;
}

function toggleDictation() {
  if (dictationActive) {
    line(`${COLORS.dim}stopped recording${COLORS.reset}`);
    stopDictation();
  } else {
    startDictation();
  }
}

function paletteActions() {
  return [
    {
      id: "new-shell",
      title: "New agentcli tab",
      detail: "open another shell tab",
      run: () => ensureShell()
    },
    {
      id: "toggle-sessions",
      title: "Toggle sessions",
      detail: "open or close the session sidebar",
      run: () => toggleSessions()
    },
    {
      id: "focus-search",
      title: "Search sessions",
      detail: "open sidebar and focus filter",
      run: async () => {
        toggleSessions(true);
        await ensureSidebarSessionsLoaded();
        sessionSearchEl.focus();
      }
    },
    {
      id: "scratchpad-toggle",
      title: scratchpadOpen ? "Hide scratchpad" : "Open scratchpad",
      detail: "draft prompts before sending to a terminal",
      run: () => setScratchpadOpen(!scratchpadOpen)
    },
    {
      id: "scratchpad-send",
      title: "Send scratchpad to active tab",
      detail: "insert drafted prompt into current terminal",
      run: () => sendScratchpadToActiveTab()
    },
    {
      id: "pair-mode",
      title: "Pair mode: Codex + Claude",
      detail: "send scratchpad prompt to both agents",
      run: () => runPairMode()
    },
    {
      id: "rename-session",
      title: "Rename selected session",
      detail: "save a local alias for the selected sidebar session",
      run: () => {
        const session = selectedSidebarSession();
        if (session) renameSessionAlias(sessionKey(session));
        else toggleSessions(true);
      }
    },
    {
      id: "latest-codex",
      title: "Open latest Codex",
      detail: "resume newest Codex session",
      run: async () => {
        await ensureSidebarSessionsLoaded();
        const session = latestSessionForProvider("codex");
        if (session) await openProviderSession("codex", session.id);
      }
    },
    {
      id: "latest-claude",
      title: "Open latest Claude",
      detail: "resume newest Claude session",
      run: async () => {
        await ensureSidebarSessionsLoaded();
        const session = latestSessionForProvider("claude");
        if (session) await openProviderSession("claude", session.id);
      }
    },
    {
      id: "close-tab",
      title: "Close current tab",
      detail: "kill this PTY when possible",
      run: () => closeTerminalTab(activeTabId)
    },
    {
      id: "handoff-codex",
      title: "Handoff current tab to Codex",
      detail: "open a Codex tab with a takeover prompt",
      run: () => handoffActiveTab("codex")
    },
    {
      id: "handoff-claude",
      title: "Handoff current tab to Claude",
      detail: "open a Claude tab with a takeover prompt",
      run: () => handoffActiveTab("claude")
    },
    {
      id: "worktree-choose-repo",
      title: "Choose git repository",
      detail: worktreeRepoPath || "select repo for worktree actions",
      run: () => chooseGitRepo()
    },
    {
      id: "worktree-refresh",
      title: "Refresh git worktrees",
      detail: worktreeRepoPath || "choose a repo first",
      run: () => refreshGitWorktrees()
    },
    {
      id: "worktree-create",
      title: "Create worktree from branch",
      detail: "create a sibling worktree for agent work",
      run: () => createGitWorktree()
    },
    {
      id: "worktree-remove",
      title: "Remove selected worktree",
      detail: "remove a non-main git worktree",
      run: () => removeSelectedGitWorktree()
    },
    {
      id: "worktree-open-shell",
      title: "Open worktree in shell",
      detail: "start a terminal tab in a worktree",
      run: () => openGitWorktreeShell()
    },
    {
      id: "worktree-open-codex",
      title: "Open worktree in Codex",
      detail: "start Codex inside a worktree",
      run: () => openGitWorktreeAgent("codex")
    },
    {
      id: "worktree-open-claude",
      title: "Open worktree in Claude",
      detail: "start Claude inside a worktree",
      run: () => openGitWorktreeAgent("claude")
    },
    {
      id: "dictation-toggle",
      title: dictationActive ? "Stop dictation" : "Start voice prompt",
      detail: "speak text into the active terminal prompt",
      run: () => toggleDictation()
    },
    {
      id: "notification-toggle",
      title: notificationSoundEnabled ? "Agent sound: off" : "Agent sound: on",
      detail: "play a sound after agent output goes quiet",
      run: () => setNotificationSoundEnabled(!notificationSoundEnabled)
    },
    {
      id: "notification-test",
      title: "Test notification sound",
      detail: `current sound: ${notificationSound}`,
      run: () => playNotificationSound()
    },
    ...["soft", "chime", "complete"].map((name) => ({
      id: `notification-sound-${name}`,
      title: `Notification sound: ${name}`,
      detail: name === notificationSound ? "current agent completion sound" : "set agent completion sound",
      run: () => setNotificationSound(name)
    })),
    {
      id: "font-import",
      title: "Import terminal font",
      detail: "choose a .ttf, .otf, .woff, or .woff2 file",
      run: () => importTerminalFont()
    },
    {
      id: "font-system",
      title: "Terminal font: system",
      detail: terminalFontFamily ? "switch back to SF Mono / Menlo" : "current terminal font",
      run: () => setTerminalFont("")
    },
    ...importedFonts.map((font) => ({
      id: `font-${font.family}`,
      title: `Terminal font: ${font.family}`,
      detail: font.family === terminalFontFamily ? "current terminal font" : "use imported font",
      run: () => setTerminalFont(font.family)
    })),
    {
      id: "theme-editor",
      title: "Theme editor",
      detail: "edit terminal colors with HSB sliders",
      run: () => openThemeEditor()
    },
    ...Object.keys(THEMES).map((name) => ({
      id: `theme-${name}`,
      title: `Theme: ${name}`,
      detail: name === currentTheme && !customTheme ? "current theme" : "switch to built-in theme",
      run: () => setTheme(name)
    })),
    ...[
      ["none", ""],
      ["green", "#a8ff60"],
      ["blue", "#7cc7ff"],
      ["red", "#ff665c"],
      ["orange", "#d97745"],
      ["magenta", "#d8a0ff"]
    ].map(([name, color]) => ({
      id: `tab-color-${name}`,
      title: `Tab color: ${name}`,
      detail: name === "none" ? "remove current tab accent" : "set current tab accent",
      run: () => setActiveTabColor(color)
    })),
  ];
}

function visiblePaletteActions() {
  const query = paletteFilter.trim().toLowerCase();
  const actions = paletteActions();
  if (!query) return actions;
  return actions.filter((action) => `${action.title} ${action.detail}`.toLowerCase().includes(query));
}

function renderPalette() {
  const actions = visiblePaletteActions();
  if (paletteIndex >= actions.length) paletteIndex = Math.max(0, actions.length - 1);
  paletteListEl.innerHTML = actions.length
    ? actions
        .map(
          (action, index) => `
            <button class="palette-item ${index === paletteIndex ? "active" : ""}" data-action-id="${escapeHtml(action.id)}">
              <strong>${escapeHtml(action.title)}</strong>
              <span>${escapeHtml(action.detail)}</span>
            </button>
          `
        )
        .join("")
    : `<div class="palette-empty">No command</div>`;
}

function openPalette() {
  paletteOpen = true;
  paletteFilter = "";
  paletteIndex = 0;
  paletteInputEl.value = "";
  paletteEl.classList.add("open");
  paletteEl.setAttribute("aria-hidden", "false");
  renderPalette();
  setTimeout(() => paletteInputEl.focus(), 0);
}

function closePalette() {
  paletteOpen = false;
  paletteEl.classList.remove("open");
  paletteEl.setAttribute("aria-hidden", "true");
  keyboardCaptureEl.focus();
}

async function runPaletteAction(actionId) {
  const action = paletteActions().find((item) => item.id === actionId) || visiblePaletteActions()[paletteIndex];
  if (!action) return;
  closePalette();
  await action.run();
}

let dialogResolver = null;
let dialogMode = "input";
let dialogSelectItems = [];
let dialogSelectIndex = 0;
let dialogSelectEmptyText = "";

let dialogReturnFocus = null;

function openDialogShell() {
  dialogReturnFocus = document.activeElement;
  dialogEl.classList.add("open");
  dialogEl.setAttribute("aria-hidden", "false");
}

function closeDialog(result) {
  const resolve = dialogResolver;
  dialogResolver = null;
  dialogSelectItems = [];
  dialogEl.classList.remove("open");
  dialogEl.setAttribute("aria-hidden", "true");
  // Restore focus to wherever it was before the dialog opened, falling back to
  // the terminal capture so keystrokes keep flowing.
  if (dialogReturnFocus && dialogReturnFocus.isConnected && dialogReturnFocus !== document.body) {
    dialogReturnFocus.focus();
  } else {
    keyboardCaptureEl.focus();
  }
  dialogReturnFocus = null;
  if (resolve) resolve(result);
}

function inputDialog({ title, label = "", value = "", placeholder = "", confirmText = "Save" }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "input";
    dialogTitleEl.textContent = title;
    dialogBodyEl.innerHTML = `
      ${label ? `<label class="dialog-label" for="dialog-input">${escapeHtml(label)}</label>` : ""}
      <input id="dialog-input" class="dialog-input" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" spellcheck="false" autocomplete="off" />
    `;
    dialogConfirmEl.textContent = confirmText;
    dialogConfirmEl.className = "dialog-button primary";
    dialogConfirmEl.style.display = "";
    openDialogShell();
    requestAnimationFrame(() => {
      const input = dialogBodyEl.querySelector("#dialog-input");
      input?.focus();
      input?.select();
    });
  });
}

function confirmDialog({ title, message = "", confirmText = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "confirm";
    dialogTitleEl.textContent = title;
    dialogBodyEl.innerHTML = `<p class="dialog-message">${escapeHtml(message)}</p>`;
    dialogConfirmEl.textContent = confirmText;
    dialogConfirmEl.className = `dialog-button ${danger ? "danger" : "primary"}`;
    dialogConfirmEl.style.display = "";
    openDialogShell();
    requestAnimationFrame(() => dialogConfirmEl.focus());
  });
}

function renderDialogSelect() {
  if (!dialogSelectItems.length) {
    dialogBodyEl.innerHTML = `<div class="dialog-empty">${escapeHtml(dialogSelectEmptyText)}</div>`;
    return;
  }
  dialogBodyEl.innerHTML = `<div class="dialog-list">${dialogSelectItems
    .map(
      (item, index) => `
        <button class="dialog-option ${index === dialogSelectIndex ? "active" : ""}" data-dialog-index="${index}" type="button">
          <strong>${escapeHtml(item.label)}</strong>
          ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}
        </button>
      `
    )
    .join("")}</div>`;
}

function selectDialog({ title, items, confirmText = "Open", selectedValue = "", emptyText = "Nothing to choose." }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "select";
    dialogSelectItems = items;
    dialogSelectEmptyText = emptyText;
    const preselected = items.findIndex((item) => item.value === selectedValue);
    dialogSelectIndex = preselected >= 0 ? preselected : 0;
    dialogTitleEl.textContent = title;
    dialogConfirmEl.textContent = confirmText;
    dialogConfirmEl.className = "dialog-button primary";
    dialogConfirmEl.style.display = items.length ? "" : "none";
    renderDialogSelect();
    openDialogShell();
    requestAnimationFrame(() => dialogBodyEl.querySelector(".dialog-option.active")?.scrollIntoView({ block: "nearest" }));
  });
}

function confirmDialogSelection() {
  if (!dialogResolver) return;
  if (dialogMode === "input") {
    const input = dialogBodyEl.querySelector("#dialog-input");
    closeDialog((input?.value ?? "").trim());
  } else if (dialogMode === "confirm") {
    closeDialog(true);
  } else {
    closeDialog(dialogSelectItems[dialogSelectIndex] ?? null);
  }
}

async function handleCommand(raw) {
  const input = raw.trim();
  if (!input) {
    return;
  }

  line("");

  const [command, ...args] = input.split(/\s+/);

  try {
    switch (command) {
      case "/sessions":
        toggleSessions();
        break;
      case "/theme":
        if (args[0]) {
          setTheme(args[0]);
        } else {
          line(`Themes: ${Object.keys(THEMES).join(", ")}`);
          line(`Current: ${currentTheme}`);
        }
        break;
      default:
        break;
    }
  } catch (error) {
    line(`${COLORS.red}${error.message}${COLORS.reset}`);
  }
}

function isAppCommand(input) {
  return input === "/sessions" || input === "/theme" || input.startsWith("/theme ");
}

// detectsInteractiveAgent moved to lib/agent.js

function detectAgentCommand(input) {
  const command = detectsInteractiveAgent(input);
  if (!command) return;
  const tab = terminalTabs.get(activeTabId);
  if (tab) {
    tab.mode = "agent";
    tab.provider = command;
    tab.title = command;
    tab.awaitingCompletionSound = false;
    captureAgentSessionId(tab);
  }
  activeProcessMode = "agent";
  commandBuffer = "";
  slashCandidate = false;
  completionPrefix = "";
  completionIndex = -1;
  renderTabs();
  saveWorkspaceLayout();
}

function writeCommandChar(data) {
  if (data === "\r") {
    handleCommand(commandBuffer);
    return;
  }

  if (data === "\u007f") {
    if (commandBuffer.length > 0) {
      commandBuffer = commandBuffer.slice(0, -1);
      term.write("\b \b");
    }
    return;
  }

  if (data === "\u0003") {
    line("^C");
    return;
  }

  if (data >= " " && data <= "~") {
    commandBuffer += data;
    term.write(data);
  }
}

function trackAttachedInput(data) {
  if (data === "\r") {
    const input = commandBuffer.trim();
    const shouldIntercept = slashCandidate && isAppCommand(input);
    commandBuffer = "";
    slashCandidate = false;
    completionPrefix = "";
    if (shouldIntercept) {
      window.agentcli.writeTerminal({ sessionId: activeSessionId, data: "\u0015" });
      handleCommand(input);
      return true;
    }
    detectAgentCommand(input);
    return false;
  }

  if (data === "\u007f") {
    commandBuffer = commandBuffer.slice(0, -1);
    slashCandidate = commandBuffer.startsWith("/");
    completionIndex = -1;
    completionPrefix = slashCandidate ? commandBuffer : "";
    return false;
  }

  if (data === "\u0003") {
    commandBuffer = "";
    slashCandidate = false;
    completionIndex = -1;
    completionPrefix = "";
    return false;
  }

  if (data >= " " && data <= "~") {
    commandBuffer += data;
    slashCandidate = commandBuffer.startsWith("/");
    completionIndex = -1;
    completionPrefix = slashCandidate ? commandBuffer : "";
  }

  return false;
}

function resizeActivePty() {
  if (!activeSessionId || !processAttached) return;
  window.agentcli.resizeTerminal({ sessionId: activeSessionId, cols: term.cols, rows: term.rows });
}

function visibleCommandRows() {
  if (activeProcessMode !== "shell" || !slashCandidate) return [];
  const query = (completionPrefix || commandBuffer).toLowerCase();
  const matches = COMMANDS.filter(([command]) => command.toLowerCase().startsWith(query));
  return matches;
}

function replaceCommandBuffer(nextCommand) {
  const deleteCount = commandBuffer.length;
  if (deleteCount > 0) {
    window.agentcli.writeTerminal({ sessionId: activeSessionId, data: "\u007f".repeat(deleteCount) });
  }
  commandBuffer = nextCommand;
  slashCandidate = true;
  window.agentcli.writeTerminal({ sessionId: activeSessionId, data: nextCommand });
}

function cycleCompletion(direction = 1) {
  const rows = visibleCommandRows();
  if (!rows.length) return false;
  completionIndex = (completionIndex + direction + rows.length) % rows.length;
  replaceCommandBuffer(rows[completionIndex][0]);
  return true;
}

function acceptAutocomplete() {
  const rows = visibleCommandRows();
  const row = rows[completionIndex] || rows[0];
  if (!row) return false;
  replaceCommandBuffer(row[0]);
  return true;
}

function keyEventToData(event) {
  if (event.metaKey) return "";
  if (activeProcessMode === "shell" && slashCandidate) {
    if (event.key === "ArrowDown") {
      cycleCompletion(1);
      return "__handled__";
    }
    if (event.key === "ArrowUp") {
      cycleCompletion(-1);
      return "__handled__";
    }
    if (event.key === "Tab") {
      acceptAutocomplete();
      return "__handled__";
    }
    if (event.key === "Enter" && visibleCommandRows().length && !COMMANDS.some(([command]) => command === commandBuffer.trim())) {
      acceptAutocomplete();
      return "__handled__";
    }
  }
  if (event.key === "Enter") return "\r";
  if (event.key === "Backspace") return "\u007f";
  if (event.key === "Tab") return "\t";
  if (event.key === "Escape") return "\u001b";
  if (event.key === "ArrowUp") return "\u001b[A";
  if (event.key === "ArrowDown") return "\u001b[B";
  if (event.key === "ArrowRight") return "\u001b[C";
  if (event.key === "ArrowLeft") return "\u001b[D";
  if (event.ctrlKey && event.key.length === 1) {
    const code = event.key.toUpperCase().charCodeAt(0) - 64;
    if (code > 0 && code < 27) return String.fromCharCode(code);
  }
  if (event.ctrlKey || event.altKey) return "";
  if (event.key.length === 1) return event.key;
  return "";
}

function routeInput(data) {
  if (data === "__handled__") return;
  if (!data) return;
  if (processAttached && activeSessionId) {
    if (activeProcessMode === "shell" && trackAttachedInput(data)) return;
    if (activeProcessMode === "agent" && data === "\r") {
      const tab = terminalTabs.get(activeSessionId);
      if (tab?.provider) tab.awaitingCompletionSound = true;
    }
    window.agentcli.writeTerminal({ sessionId: activeSessionId, data });
    return;
  }
  writeCommandChar(data);
}

document.addEventListener("keydown", (event) => {
  if (dialogResolver) return;
  if (event.metaKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    event.stopPropagation();
    paletteOpen ? closePalette() : openPalette();
    return;
  }
  if (event.metaKey && event.shiftKey && event.code === "Space") {
    event.preventDefault();
    event.stopPropagation();
    toggleDictation();
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    event.stopPropagation();
    newAgentcliTab();
    return;
  }
  if (
    event.target === keyboardCaptureEl ||
    event.target === sessionSearchEl ||
    event.target === paletteInputEl ||
    event.target === scratchpadInputEl ||
    event.target.closest?.("[data-tab-rename]")
  ) {
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "c") {
    const selection = term.getSelection();
    if (selection) {
      event.preventDefault();
      window.agentcli.writeClipboardText(selection);
    }
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "v") {
    event.preventDefault();
    window.agentcli.readClipboardText().then(routeInput);
    return;
  }
  const data = keyEventToData(event);
  if (!data) return;
  event.preventDefault();
  event.stopPropagation();
  routeInput(data);
}, true);

document.addEventListener(
  "contextmenu",
  (event) => {
    beginTabRenameFromEvent(event);
  },
  true
);

document.addEventListener("paste", (event) => {
  if (event.target === sessionSearchEl || event.target === scratchpadInputEl) return;
  const text = event.clipboardData?.getData("text");
  if (!text) return;
  event.preventDefault();
  routeInput(text);
});

window.agentcli.onTerminalData(({ sessionId, data }) => {
  const tab = terminalTabs.get(sessionId);
  if (!tab) return;
  tab.term.write(data.replace(/\x07/g, ""));
  noteAgentActivity(tab);
  if (sessionId !== activeSessionId) {
    tab.unread = true;
    renderTabs();
  }
});

window.agentcli.onTerminalExit(({ sessionId, exitCode }) => {
  const tab = terminalTabs.get(sessionId);
  if (!tab) return;
  tab.processAttached = false;
  tab.mode = "shell";
  tab.term.writeln("");
  tab.term.writeln(`${COLORS.dim}process exited: ${exitCode}${COLORS.reset}`);
  renderTabs();
  renderSessions();
  if (sessionId === activeSessionId) {
    processAttached = false;
    activeProcessMode = "shell";
    ensureShell();
  }
});

window.agentcli.onStateChanged((nextState) => {
  refresh(nextState);
});

window.agentcli.onToggleSidebar(() => {
  toggleSessions();
});

window.agentcli.onNewTab(() => {
  newAgentcliTab();
});

window.agentcli.onOpenPalette(() => {
  openPalette();
});

window.agentcli.onRunAction(async (actionId) => {
  await runPaletteAction(actionId);
});

window.agentcli.onSetTheme((theme) => {
  setTheme(theme);
});

// Single click selects + previews a session; double click (or Enter) opens it.
sessionListEl.addEventListener("click", (event) => {
  const pinButton = event.target.closest("[data-pin-session]");
  if (pinButton) {
    event.preventDefault();
    event.stopPropagation();
    togglePinnedSession(pinButton.dataset.pinSession);
    return;
  }
  const card = event.target.closest("[data-session-id]");
  if (!card) return;
  selectedSessionKey = card.dataset.sessionKey;
  if (previewCollapsed) {
    previewCollapsed = false;
    localStorage.setItem("agentcli.previewCollapsed", "false");
  }
  renderSessions();
});

sessionListEl.addEventListener("dblclick", async (event) => {
  const card = event.target.closest("[data-session-id]");
  if (!card || event.target.closest("[data-pin-session]")) return;
  event.preventDefault();
  selectedSessionKey = card.dataset.sessionKey;
  await openProviderSession(card.dataset.provider, card.dataset.sessionId);
});

sessionPreviewEl.addEventListener("click", async (event) => {
  const openButton = event.target.closest("[data-open-session]");
  if (openButton) {
    const session = selectedSidebarSession();
    if (session) await openProviderSession(session.provider, session.id);
    return;
  }
  const renameButton = event.target.closest("[data-rename-session]");
  if (renameButton) {
    await renameSessionAlias(renameButton.dataset.renameSession);
    return;
  }
  if (!event.target.closest("[data-toggle-preview]")) return;
  previewCollapsed = !previewCollapsed;
  localStorage.setItem("agentcli.previewCollapsed", String(previewCollapsed));
  renderSessionPreview();
});

scratchpadInputEl.addEventListener("input", updateScratchpadText);

scratchpadSendEl.addEventListener("click", () => {
  updateScratchpadText();
  sendScratchpadToActiveTab();
});

scratchpadPairEl.addEventListener("click", async () => {
  updateScratchpadText();
  await runPairMode();
});

scratchpadCloseEl.addEventListener("click", () => {
  updateScratchpadText();
  setScratchpadOpen(false);
});

scratchpadToggleEl.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setScratchpadOpen(!scratchpadOpen);
});

newTabEl.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  newAgentcliTab();
});

sessionsToggleEl.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleSessions();
});

paletteOpenEl.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openPalette();
});

hintDismissEl.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  dismissHintBar();
});

function dismissHintBar() {
  hintBarEl.classList.add("collapsed");
  localStorage.setItem("agentcli.hintDismissed", "true");
  requestAnimationFrame(refitTerminal);
}

function initHintBar() {
  const dismissed = localStorage.getItem("agentcli.hintDismissed") === "true";
  hintBarEl.classList.toggle("collapsed", dismissed);
}

tabsEl.addEventListener("click", (event) => {
  if (event.target.closest("[data-tab-rename]")) return;
  const closeButton = event.target.closest("[data-close-tab]");
  if (closeButton) {
    event.stopPropagation();
    closeTerminalTab(closeButton.dataset.closeTab);
    return;
  }

  const tab = event.target.closest("[data-tab-id]");
  if (!tab) return;
  switchTerminalTab(tab.dataset.tabId);
});

tabsEl.addEventListener("contextmenu", beginTabRenameFromEvent, true);

tabsEl.addEventListener(
  "pointerdown",
  (event) => {
    if (event.button === 2 || (event.button === 0 && event.ctrlKey)) beginTabRenameFromEvent(event);
  },
  true
);

tabsEl.addEventListener(
  "mousedown",
  (event) => {
    if (event.button === 2 || (event.button === 0 && event.ctrlKey)) beginTabRenameFromEvent(event);
  },
  true
);

tabsEl.addEventListener("keydown", (event) => {
  const input = event.target.closest("[data-tab-rename]");
  if (!input) return;
  event.stopPropagation();
  if (event.key === "Enter") {
    event.preventDefault();
    commitTabRename(input.dataset.tabRename, input.value);
  }
  if (event.key === "Escape") {
    event.preventDefault();
    cancelTabRename();
  }
});

tabsEl.addEventListener("focusout", (event) => {
  const input = event.target.closest("[data-tab-rename]");
  if (!input) return;
  commitTabRename(input.dataset.tabRename, input.value);
});

paletteInputEl.addEventListener("input", () => {
  paletteFilter = paletteInputEl.value;
  paletteIndex = 0;
  renderPalette();
});

paletteInputEl.addEventListener("keydown", async (event) => {
  if (event.key === "Tab") {
    // Palette is arrow-key driven; keep focus in the input instead of escaping to chrome.
    event.preventDefault();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePalette();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    const actions = visiblePaletteActions();
    if (actions.length) paletteIndex = (paletteIndex + 1) % actions.length;
    renderPalette();
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    const actions = visiblePaletteActions();
    if (actions.length) paletteIndex = (paletteIndex - 1 + actions.length) % actions.length;
    renderPalette();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    await runPaletteAction();
  }
});

paletteListEl.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

paletteListEl.addEventListener("click", async (event) => {
  const item = event.target.closest("[data-action-id]");
  if (!item) return;
  await runPaletteAction(item.dataset.actionId);
});

paletteEl.addEventListener("mousedown", (event) => {
  if (event.target === paletteEl) closePalette();
});

dialogConfirmEl.addEventListener("click", confirmDialogSelection);

dialogCancelEl.addEventListener("click", () => closeDialog(null));

dialogEl.addEventListener("mousedown", (event) => {
  if (event.target === dialogEl) closeDialog(null);
});

dialogBodyEl.addEventListener("click", (event) => {
  const option = event.target.closest("[data-dialog-index]");
  if (!option) return;
  dialogSelectIndex = Number(option.dataset.dialogIndex);
  closeDialog(dialogSelectItems[dialogSelectIndex] ?? null);
});

dialogEl.addEventListener("keydown", (event) => {
  if (!dialogResolver) return;
  if (event.key === "Tab") {
    const focusables = Array.from(
      dialogEl.querySelectorAll('button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length) {
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog(null);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    confirmDialogSelection();
    return;
  }
  if (dialogMode === "select" && (event.key === "ArrowDown" || event.key === "ArrowUp") && dialogSelectItems.length) {
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    dialogSelectIndex = (dialogSelectIndex + delta + dialogSelectItems.length) % dialogSelectItems.length;
    renderDialogSelect();
    dialogBodyEl.querySelector(".dialog-option.active")?.scrollIntoView({ block: "nearest" });
  }
});

themeTargetsEl.addEventListener("click", (event) => {
  const target = event.target.closest("[data-theme-target]");
  if (!target) return;
  themeTarget = target.dataset.themeTarget;
  renderThemeEditor();
});

[themeHueEl, themeSaturationEl, themeBrightnessEl].forEach((input) => {
  input.addEventListener("input", updateThemeTargetFromSliders);
});

themeCloseEl.addEventListener("click", closeThemeEditor);
themeDoneEl.addEventListener("click", closeThemeEditor);
themeResetEl.addEventListener("click", resetCustomTheme);

themeEditorEl.addEventListener("mousedown", (event) => {
  if (event.target === themeEditorEl) closeThemeEditor();
});

sessionSearchEl.addEventListener("input", () => {
  sessionFilter = sessionSearchEl.value;
  renderSessions();
});

sessionSearchEl.addEventListener("keydown", async (event) => {
  event.stopPropagation();
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSidebarSelection(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSidebarSelection(-1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    await openSelectedSidebarSession();
    return;
  }
  if (event.key === "Escape") {
    sessionSearchEl.value = "";
    sessionFilter = "";
    renderSessions();
    keyboardCaptureEl.focus();
  }
});

closeSessionsEl.addEventListener("click", () => {
  toggleSessions(false);
  term.focus();
});

terminalWrapEl.addEventListener("mousedown", () => {
  keyboardCaptureEl.focus();
});

keyboardCaptureEl.addEventListener("keydown", (event) => {
  if (event.metaKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    event.stopPropagation();
    openPalette();
    return;
  }
  if (event.metaKey && event.shiftKey && event.code === "Space") {
    event.preventDefault();
    event.stopPropagation();
    toggleDictation();
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    event.stopPropagation();
    setScratchpadOpen(!scratchpadOpen);
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    event.stopPropagation();
    newAgentcliTab();
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "c") {
    const selection = term.getSelection();
    if (selection) {
      event.preventDefault();
      event.stopPropagation();
      window.agentcli.writeClipboardText(selection);
    }
    return;
  }
  if (event.metaKey && event.key.toLowerCase() === "v") {
    event.preventDefault();
    event.stopPropagation();
    window.agentcli.readClipboardText().then(routeInput);
    return;
  }
  const data = keyEventToData(event);
  if (!data) return;
  event.preventDefault();
  event.stopPropagation();
  routeInput(data);
});

keyboardCaptureEl.addEventListener("input", () => {
  keyboardCaptureEl.value = "";
});

keyboardCaptureEl.addEventListener("blur", () => {
  setTimeout(() => {
    const active = document.activeElement;
    if (
      dialogResolver ||
      active === sessionSearchEl ||
      active === paletteInputEl ||
      active === scratchpadInputEl ||
      active?.closest?.("#dialog") ||
      active?.closest?.("#theme-editor")
    ) {
      return;
    }
    keyboardCaptureEl.focus();
  }, 0);
});

window.addEventListener("resize", () => {
  refitTerminal();
});

window.addEventListener("beforeunload", () => {
  saveWorkspaceLayout();
});

refresh().then(async () => {
  await loadImportedFonts();
  if (customTheme) {
    applyThemeToDocument(customTheme);
  } else {
    setTheme(currentTheme);
  }
  renderScratchpad();
  initHintBar();
  await restoreWorkspaceLayout();
  applyTerminalFont();
  keyboardCaptureEl.focus();
});
