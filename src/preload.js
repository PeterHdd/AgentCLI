const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agentcli", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  reportError: (payload) => ipcRenderer.invoke("log:report", payload),
  openLogs: () => ipcRenderer.invoke("log:open"),
  whichAgents: () => ipcRenderer.invoke("app:which-agents"),
  getTelemetry: () => ipcRenderer.invoke("telemetry:get"),
  setTelemetry: (enabled) => ipcRenderer.invoke("telemetry:set", enabled),
  readClipboardText: () => ipcRenderer.invoke("clipboard:read-text"),
  writeClipboardText: (text) => ipcRenderer.invoke("clipboard:write-text", text),
  importFont: () => ipcRenderer.invoke("font:import"),
  startShell: (options) => ipcRenderer.invoke("shell:start", options),
  updateProvider: (patch) => ipcRenderer.invoke("provider:update", patch),
  loginProvider: (providerId) => ipcRenderer.invoke("provider:login", providerId),
  startSession: (options) => ipcRenderer.invoke("session:start", options),
  resumeSession: (sessionId) => ipcRenderer.invoke("session:resume", sessionId),
  listCodexThreads: (options) => ipcRenderer.invoke("codex:list-threads", options),
  resumeCodexThread: (threadId) => ipcRenderer.invoke("codex:resume-thread", threadId),
  listClaudeSessions: (options) => ipcRenderer.invoke("claude:list-sessions", options),
  resumeClaudeSession: (sessionId) => ipcRenderer.invoke("claude:resume-session", sessionId),
  writeTerminal: (payload) => ipcRenderer.invoke("terminal:input", payload),
  resizeTerminal: (payload) => ipcRenderer.invoke("terminal:resize", payload),
  disposeTerminal: (sessionId) => ipcRenderer.invoke("terminal:dispose", sessionId),
  transcribeAudio: (payload) => ipcRenderer.invoke("voice:transcribe", payload),
  setProviderSessionId: (payload) => ipcRenderer.invoke("session:mark-provider-session-id", payload),
  chooseGitRepo: () => ipcRenderer.invoke("git:choose-repo"),
  listGitWorktrees: (repoPath) => ipcRenderer.invoke("git:list-worktrees", repoPath),
  suggestGitWorktreePath: (payload) => ipcRenderer.invoke("git:suggest-worktree-path", payload),
  createGitWorktree: (payload) => ipcRenderer.invoke("git:create-worktree", payload),
  removeGitWorktree: (payload) => ipcRenderer.invoke("git:remove-worktree", payload),
  onTerminalData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("terminal:data", listener);
    return () => ipcRenderer.removeListener("terminal:data", listener);
  },
  onTerminalExit: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("terminal:exit", listener);
    return () => ipcRenderer.removeListener("terminal:exit", listener);
  },
  onStateChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("state:changed", listener);
    return () => ipcRenderer.removeListener("state:changed", listener);
  },
  onToggleSidebar: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("ui:toggle-sidebar", listener);
    return () => ipcRenderer.removeListener("ui:toggle-sidebar", listener);
  },
  onNewTab: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("ui:new-tab", listener);
    return () => ipcRenderer.removeListener("ui:new-tab", listener);
  },
  onOpenPalette: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("ui:open-palette", listener);
    return () => ipcRenderer.removeListener("ui:open-palette", listener);
  },
  onRunAction: (callback) => {
    const listener = (_event, actionId) => callback(actionId);
    ipcRenderer.on("ui:run-action", listener);
    return () => ipcRenderer.removeListener("ui:run-action", listener);
  },
  onSetTheme: (callback) => {
    const listener = (_event, theme) => callback(theme);
    ipcRenderer.on("ui:set-theme", listener);
    return () => ipcRenderer.removeListener("ui:set-theme", listener);
  }
});
