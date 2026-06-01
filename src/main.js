const { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, nativeImage, safeStorage } = require("electron");
const { execFileSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const pty = require("@homebridge/node-pty-prebuilt-multiarch");
const packageJson = require("../package.json");

const APP_NAME = "AgentCLI";
const APP_VERSION = packageJson.version;
const STORE_SCHEMA_VERSION = 3;
const DEFAULT_MODELS = {
  codex: ["gpt-5.3-codex", "gpt-5.2", "gpt-5.4"],
  claude: ["sonnet", "opus", "haiku"]
};

let mainWindow;
let storePath;
const terminals = new Map();

app.setName(APP_NAME);
app.setVersion(APP_VERSION);

function createDefaultStore() {
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    providers: {
      codex: {
        id: "codex",
        label: "Codex",
        command: "codex",
        authMode: "browser",
        model: DEFAULT_MODELS.codex[0],
        connected: false
      },
      claude: {
        id: "claude",
        label: "Claude Code",
        command: "claude",
        authMode: "browser",
        model: DEFAULT_MODELS.claude[0],
        connected: false
      }
    },
    sessions: [],
    selectedProviderId: "codex"
  };
}

function ensureStore() {
  storePath = path.join(app.getPath("userData"), "state.json");
  if (!fs.existsSync(storePath)) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(createDefaultStore(), null, 2));
    return;
  }

  const current = JSON.parse(fs.readFileSync(storePath, "utf8"));
  if (current.schemaVersion !== STORE_SCHEMA_VERSION) {
    const defaults = createDefaultStore();
    const migrated = {
      ...defaults,
      providers: {
        ...defaults.providers,
        ...(current.providers || {})
      },
      selectedProviderId: current.selectedProviderId || defaults.selectedProviderId,
      sessions: []
    };
    writeStore(migrated);
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch {
    return createDefaultStore();
  }
}

function writeStore(store) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function createWindow() {
  const iconPath = path.join(__dirname, "..", "assets", process.platform === "darwin" ? "icon.icns" : "icon.png");
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, "..", "assets", "icon.png")));
  }
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: APP_NAME,
    icon: iconPath,
    backgroundColor: "#10110f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    callback(permission === "media" && details?.mediaTypes?.includes("audio"));
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function createAppMenu() {
  const action = (id) => () => emit("ui:run-action", id);
  const tabColorItems = [
    ["none", "CommandOrControl+Alt+0"],
    ["green", "CommandOrControl+Alt+G"],
    ["blue", "CommandOrControl+Alt+B"],
    ["red", "CommandOrControl+Alt+R"],
    ["orange", "CommandOrControl+Alt+O"],
    ["magenta", "CommandOrControl+Alt+M"]
  ].map(([name, accelerator]) => ({
    label: name,
    accelerator,
    click: action(`tab-color-${name}`)
  }));
  const notificationSoundItems = ["soft", "chime", "complete"].map((name, index) => ({
    label: name,
    accelerator: `CommandOrControl+Shift+Alt+${index + 1}`,
    click: action(`notification-sound-${name}`)
  }));
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: APP_NAME,
            submenu: [{ label: `About ${APP_NAME}`, click: showAboutDialog }, { type: "separator" }, { role: "quit" }]
          }
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "copy" },
        { role: "paste" },
        { type: "separator" },
        { role: "selectAll" }
      ]
    },
    {
      label: "Terminal",
      submenu: [
        {
          label: "New Agentcli Tab",
          accelerator: "CommandOrControl+T",
          click: action("new-shell")
        },
        {
          label: "Close Current Tab",
          accelerator: "CommandOrControl+W",
          click: action("close-tab")
        },
        {
          label: "Command Palette",
          accelerator: "CommandOrControl+K",
          click: () => emit("ui:open-palette")
        },
        { type: "separator" },
        {
          label: "Import Terminal Font",
          accelerator: "CommandOrControl+Alt+F",
          click: action("font-import")
        },
        {
          label: "Use System Terminal Font",
          accelerator: "CommandOrControl+Shift+Alt+F",
          click: action("font-system")
        }
      ]
    },
    {
      label: "Sessions",
      submenu: [
        {
          label: "Toggle Sessions",
          accelerator: "CommandOrControl+B",
          click: action("toggle-sessions")
        },
        {
          label: "Search Sessions",
          accelerator: "CommandOrControl+Shift+F",
          click: action("focus-search")
        },
        {
          label: "Rename Selected Session",
          accelerator: "CommandOrControl+Shift+R",
          click: action("rename-session")
        },
        { type: "separator" },
        {
          label: "Open Latest Codex",
          accelerator: "CommandOrControl+Alt+C",
          click: action("latest-codex")
        },
        {
          label: "Open Latest Claude",
          accelerator: "CommandOrControl+Alt+L",
          click: action("latest-claude")
        }
      ]
    },
    {
      label: "Agents",
      submenu: [
        {
          label: "Handoff Current Tab to Codex",
          accelerator: "CommandOrControl+Shift+C",
          click: action("handoff-codex")
        },
        {
          label: "Handoff Current Tab to Claude",
          accelerator: "CommandOrControl+Shift+L",
          click: action("handoff-claude")
        }
      ]
    },
    {
      label: "Worktrees",
      submenu: [
        {
          label: "Choose Repository",
          accelerator: "CommandOrControl+Alt+W",
          click: action("worktree-choose-repo")
        },
        {
          label: "Refresh Worktrees",
          accelerator: "CommandOrControl+Shift+Alt+W",
          click: action("worktree-refresh")
        },
        {
          label: "Create Worktree from Branch",
          accelerator: "CommandOrControl+Alt+N",
          click: action("worktree-create")
        },
        {
          label: "Remove Selected Worktree",
          accelerator: "CommandOrControl+Alt+Backspace",
          click: action("worktree-remove")
        },
        { type: "separator" },
        {
          label: "Open Worktree in Shell",
          accelerator: "CommandOrControl+Alt+Return",
          click: action("worktree-open-shell")
        },
        {
          label: "Open Worktree in Codex",
          accelerator: "CommandOrControl+Shift+Alt+C",
          click: action("worktree-open-codex")
        },
        {
          label: "Open Worktree in Claude",
          accelerator: "CommandOrControl+Shift+Alt+L",
          click: action("worktree-open-claude")
        }
      ]
    },
    {
      label: "Scratchpad",
      submenu: [
        {
          label: "Toggle Scratchpad",
          accelerator: "CommandOrControl+E",
          click: action("scratchpad-toggle")
        },
        {
          label: "Send Scratchpad to Active Tab",
          accelerator: "CommandOrControl+Shift+Enter",
          click: action("scratchpad-send")
        },
        {
          label: "Pair Mode: Codex + Claude",
          accelerator: "CommandOrControl+Shift+P",
          click: action("pair-mode")
        }
      ]
    },
    {
      label: "Voice",
      submenu: [
        {
          label: "Start/Stop Voice Prompt",
          accelerator: "CommandOrControl+Shift+Space",
          click: action("dictation-toggle")
        },
        { type: "separator" },
        {
          label: "Agent Sound On/Off",
          accelerator: "CommandOrControl+Alt+S",
          click: action("notification-toggle")
        },
        {
          label: "Test Notification Sound",
          accelerator: "CommandOrControl+Shift+Alt+S",
          click: action("notification-test")
        },
        {
          label: "Notification Sound",
          submenu: notificationSoundItems
        }
      ]
    },
    {
      label: "Appearance",
      submenu: [
        {
          label: "Theme Editor",
          accelerator: "CommandOrControl+Alt+T",
          click: action("theme-editor")
        },
        {
          label: "Tab Color",
          submenu: tabColorItems
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: `About ${APP_NAME}`,
    message: `${APP_NAME} ${APP_VERSION}`,
    detail: [
      "A terminal-first workspace for Codex and Claude Code sessions.",
      "",
      `Electron ${process.versions.electron}`,
      `Node ${process.versions.node}`,
      `Chrome ${process.versions.chrome}`,
      `Shell ${process.env.SHELL || "unknown"}`,
      `Data ${app.getPath("userData")}`
    ].join("\n"),
    buttons: ["OK"],
    noLink: true
  });
}

function getProvider(store, providerId) {
  const provider = store.providers[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  return provider;
}

function buildProviderArgs(provider, mode, session) {
  if (mode === "login") {
    return provider.id === "codex" ? ["login"] : ["login"];
  }

  if (mode === "resume" && session?.providerSessionId) {
    return provider.id === "codex"
      ? ["resume", session.providerSessionId]
      : ["--resume", session.providerSessionId];
  }

  if (provider.id === "codex") {
    return provider.model ? ["--model", provider.model] : [];
  }

  if (provider.id === "claude") {
    return provider.model ? ["--model", provider.model] : [];
  }

  return [];
}

function createSession(provider, options = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    providerId: provider.id,
    providerLabel: provider.label,
    providerSessionId: options.providerSessionId || "",
    title: options.title || `${provider.label} session`,
    model: provider.model,
    cwd: options.cwd || os.homedir(),
    status: "starting",
    createdAt: now,
    updatedAt: now,
    lastCommand: "",
    mode: options.mode || "agent"
  };
}

function emit(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function withApiKeyEnv(provider, env) {
  if (!provider.encryptedApiKey) return env;
  try {
    const key = safeStorage.decryptString(Buffer.from(provider.encryptedApiKey, "base64"));
    if (provider.id === "codex") return { ...env, OPENAI_API_KEY: key };
    if (provider.id === "claude") return { ...env, ANTHROPIC_API_KEY: key };
  } catch {
    return env;
  }
  return env;
}

function macosSpeechHelperPath() {
  return path.join(__dirname, "..", "native", "macos-speech", "bin", "agentcli-speech-transcribe");
}

function ensureMacosSpeechHelper() {
  const helperPath = macosSpeechHelperPath();
  if (fs.existsSync(helperPath)) return helperPath;

  const helperDir = path.dirname(helperPath);
  const sourcePath = path.join(__dirname, "..", "native", "macos-speech", "main.swift");
  const plistPath = path.join(__dirname, "..", "native", "macos-speech", "Info.plist");
  fs.mkdirSync(helperDir, { recursive: true });
  execFileSync(commandPath("swiftc"), [
    sourcePath,
    "-framework",
    "Speech",
    "-framework",
    "Foundation",
    "-Xlinker",
    "-sectcreate",
    "-Xlinker",
    "__TEXT",
    "-Xlinker",
    "__info_plist",
    "-Xlinker",
    plistPath,
    "-o",
    helperPath
  ]);
  return helperPath;
}

function transcribeWithMacosSpeech(inputPath, locale) {
  if (process.platform !== "darwin") {
    throw new Error("Local voice transcription currently requires macOS Speech.");
  }
  const helperPath = ensureMacosSpeechHelper();
  return execFileSync(helperPath, [inputPath, locale || "en-US"], {
    encoding: "utf8",
    timeout: 25000
  }).trim();
}

function loginShellPath() {
  try {
    return execFileSync("/bin/zsh", ["-lc", "printf %s \"$PATH\""], {
      encoding: "utf8",
      timeout: 2000
    });
  } catch {
    return "";
  }
}

function commandPath(command) {
  if (path.isAbsolute(command)) return command;
  const envPath = [loginShellPath(), process.env.PATH, "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"]
    .filter(Boolean)
    .join(":");
  try {
    return execFileSync("/bin/zsh", ["-lc", `PATH=${shellQuote(envPath)} command -v -- ${shellQuote(command)}`], {
      encoding: "utf8",
      timeout: 2000
    }).trim();
  } catch {
    return command;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function isTrustedSender(event) {
  const url = event.senderFrame?.url || "";
  return url.startsWith("file://") && url.endsWith("/src/renderer/index.html");
}

function handle(channel, listener) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) throw new Error("Blocked untrusted IPC sender");
    return listener(event, ...args);
  });
}

function assertProviderId(providerId) {
  if (providerId !== "codex" && providerId !== "claude") throw new Error("Invalid provider");
  return providerId;
}

function assertSafeCommand(command) {
  const value = String(command || "").trim();
  if (!value) throw new Error("Command is required");
  if (path.isAbsolute(value)) return value;
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error("Command must be a simple executable name or absolute path");
  return value;
}

function boundedInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function spawnTerminal(session, command, args, provider) {
  const resolvedCommand = commandPath(command);
  const shellEnv = withApiKeyEnv(provider, {
    ...process.env,
    PATH: [loginShellPath(), process.env.PATH, "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"]
      .filter(Boolean)
      .join(":"),
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    CLICOLOR: "1",
    CLICOLOR_FORCE: "1",
    FORCE_COLOR: "3",
    TERM_PROGRAM: "vscode",
    TERM_PROGRAM_VERSION: "1.100.0",
    VSCODE_NONCE: "agentcli"
  });
  delete shellEnv.NO_COLOR;
  const term = pty.spawn(resolvedCommand, args, {
    name: "xterm-256color",
    cols: 120,
    rows: 34,
    cwd: session.cwd,
    env: shellEnv
  });

  terminals.set(session.id, term);

  term.onData((data) => {
    emit("terminal:data", { sessionId: session.id, data });
  });

  term.onExit(({ exitCode }) => {
    const store = readStore();
    const saved = store.sessions.find((entry) => entry.id === session.id);
    if (saved) {
      saved.status = session.mode === "shell" ? "exited" : exitCode === 0 ? "done" : "exited";
      saved.updatedAt = new Date().toISOString();
      writeStore(store);
      emit("state:changed", sanitizeStore(store));
    }
    terminals.delete(session.id);
    emit("terminal:exit", { sessionId: session.id, exitCode });
  });
}

function callCodexAppServer(method, params = {}, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandPath("codex"), ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PATH: [loginShellPath(), process.env.PATH, "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"]
          .filter(Boolean)
          .join(":")
      }
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      finish(new Error(`Codex app-server timed out calling ${method}`));
    }, timeoutMs);

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(result);
    }

    function send(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }

    function handleMessage(message) {
      if (message.id === 1 && message.result) {
        send({ method: "initialized" });
        send({ id: 2, method, params });
        return;
      }

      if (message.id === 2) {
        if (message.error) finish(new Error(message.error.message || JSON.stringify(message.error)));
        else finish(null, message.result);
      }
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      let index;
      while ((index = stdout.indexOf("\n")) >= 0) {
        const line = stdout.slice(0, index).trim();
        stdout = stdout.slice(index + 1);
        if (!line) continue;
        try {
          handleMessage(JSON.parse(line));
        } catch {
          // Some Codex diagnostics are not protocol messages.
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", finish);
    child.on("exit", (code) => {
      if (!settled && code !== 0) finish(new Error(stderr.trim() || `Codex app-server exited with ${code}`));
    });

    send({
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "agentcli", title: APP_NAME, version: APP_VERSION },
        capabilities: { experimentalApi: false, requestAttestation: false }
      }
    });
  });
}

function shellCommand() {
  if (process.platform === "win32") return { command: "powershell.exe", args: [] };
  if (process.platform === "darwin") return { command: "/bin/zsh", args: ["-l"] };
  return { command: process.env.SHELL || "/bin/bash", args: ["-l"] };
}

function gitPath() {
  return commandPath("git");
}

function normalizeGitRepoPath(repoPath) {
  if (typeof repoPath !== "string" || !repoPath.trim()) throw new Error("Repository path is required");
  const resolved = path.resolve(repoPath);
  return execFileSync(gitPath(), ["-C", resolved, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    timeout: 5000
  }).trim();
}

function parseGitWorktreePorcelain(output) {
  const worktrees = [];
  let current = null;
  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      if (current) worktrees.push(current);
      current = null;
      continue;
    }
    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ");
    if (key === "worktree") current = { path: value, branch: "", head: "", detached: false, bare: false };
    else if (current && key === "HEAD") current.head = value;
    else if (current && key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
    else if (current && key === "detached") current.detached = true;
    else if (current && key === "bare") current.bare = true;
  }
  if (current) worktrees.push(current);
  return worktrees;
}

function listGitWorktrees(repoPath) {
  const repo = normalizeGitRepoPath(repoPath);
  const output = execFileSync(gitPath(), ["-C", repo, "worktree", "list", "--porcelain"], {
    encoding: "utf8",
    timeout: 5000
  });
  return {
    repoPath: repo,
    worktrees: parseGitWorktreePorcelain(output).map((worktree) => ({
      ...worktree,
      name: path.basename(worktree.path),
      isMain: worktree.path === repo
    }))
  };
}

function safeBranchSlug(branch) {
  const slug = String(branch || "worktree")
    .replace(/^refs\/heads\//, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "worktree";
}

function sanitizeStore(store) {
  const visibleSessions = (store.sessions || []).filter(
    (session) => session.providerId !== "shell" && session.mode !== "login"
  );
  return {
    ...store,
    sessions: visibleSessions,
    providers: Object.fromEntries(
      Object.entries(store.providers).map(([id, provider]) => [
        id,
        {
          ...provider,
          encryptedApiKey: undefined,
          hasApiKey: Boolean(provider.encryptedApiKey)
        }
      ])
    )
  };
}

handle("app:get-state", () => sanitizeStore(readStore()));

handle("clipboard:read-text", () => clipboard.readText());
handle("clipboard:write-text", (_event, text) => {
  clipboard.writeText(text || "");
});

handle("font:import", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Import terminal font",
    properties: ["openFile"],
    filters: [{ name: "Fonts", extensions: ["ttf", "otf", "woff", "woff2"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const source = result.filePaths[0];
  const fontsDir = path.join(app.getPath("userData"), "fonts");
  fs.mkdirSync(fontsDir, { recursive: true });
  const target = path.join(fontsDir, `${crypto.randomUUID()}-${path.basename(source)}`);
  fs.copyFileSync(source, target);
  const family = path.basename(source, path.extname(source)).replace(/[^a-zA-Z0-9_-]+/g, " ").trim() || "Imported Font";
  return {
    family,
    path: target,
    url: `file://${target.replace(/#/g, "%23")}`
  };
});

handle("shell:start", (_event, options = {}) => {
  const store = readStore();
  const shell = shellCommand();
  const cwd = typeof options.cwd === "string" && options.cwd.trim() ? path.resolve(options.cwd) : os.homedir();
  const session = {
    id: crypto.randomUUID(),
    providerId: "shell",
    providerLabel: "Shell",
    providerSessionId: "",
    title: path.basename(shell.command),
    model: "",
    cwd,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastCommand: shell.command,
    mode: "shell"
  };
  spawnTerminal(session, shell.command, shell.args, { id: "shell", label: "Shell" });
  return { state: sanitizeStore(store), sessionId: session.id, cwd };
});

handle("codex:list-threads", async (_event, options = {}) => {
  const result = await callCodexAppServer("thread/list", {
    limit: boundedInt(options.limit, 50, 1, 100),
    archived: false,
    sortKey: "updated_at",
    sortDirection: "desc",
    sourceKinds: ["cli", "appServer", "vscode"]
  });
  return result.data || [];
});

handle("codex:resume-thread", async (_event, threadId) => {
  if (typeof threadId !== "string" || !threadId.trim()) throw new Error("Invalid thread id");
  const store = readStore();
  const provider = getProvider(store, "codex");
  const session = createSession(provider, {
    title: `Codex resume ${threadId.slice(0, 8)}`,
    providerSessionId: threadId,
    mode: "agent"
  });
  session.lastCommand = `${provider.command} resume ${threadId}`;
  spawnTerminal(session, provider.command, ["resume", threadId], provider);
  return { state: sanitizeStore(store), sessionId: session.id, mode: session.mode };
});

handle("claude:list-sessions", async (_event, options = {}) => {
  const root = path.join(os.homedir(), ".claude", "projects");
  const limit = boundedInt(options.limit, 50, 1, 100);
  const files = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(fullPath);
    }
  }

  walk(root);

  return files
    .map((filePath) => {
      const stat = fs.statSync(filePath);
      const id = path.basename(filePath, ".jsonl");
      let preview = "Claude session";
      let cwd = "";
      try {
        const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
        for (const line of lines) {
          const item = JSON.parse(line);
          if (!cwd && item.cwd) cwd = item.cwd;
          const content = item.message?.content;
          if (item.type === "user" && Array.isArray(content)) {
            const text = content.find((part) => part.type === "text")?.text;
            if (text) {
              preview = text;
              break;
            }
          } else if (item.type === "user" && typeof content === "string") {
            preview = content;
            break;
          }
        }
      } catch {
        // Keep fallback metadata.
      }
      return {
        id,
        provider: "claude",
        preview,
        cwd,
        updatedAt: Math.floor(stat.mtimeMs / 1000),
        path: filePath
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
});

handle("claude:resume-session", async (_event, sessionId) => {
  if (typeof sessionId !== "string" || !sessionId.trim()) throw new Error("Invalid session id");
  const store = readStore();
  const provider = getProvider(store, "claude");
  const session = createSession(provider, {
    title: `Claude resume ${sessionId.slice(0, 8)}`,
    providerSessionId: sessionId,
    mode: "agent"
  });
  session.lastCommand = `${provider.command} --resume ${sessionId}`;
  spawnTerminal(session, provider.command, ["--resume", sessionId], provider);
  return { state: sanitizeStore(store), sessionId: session.id, mode: session.mode };
});

handle("provider:update", (_event, patch = {}) => {
  const store = readStore();
  const provider = getProvider(store, assertProviderId(patch.id));
  Object.assign(provider, {
    authMode: patch.authMode || provider.authMode,
    command: patch.command ? assertSafeCommand(patch.command) : provider.command,
    model: patch.model || provider.model,
    connected: patch.connected ?? provider.connected
  });
  if (typeof patch.apiKey === "string" && patch.apiKey.trim()) {
    provider.encryptedApiKey = safeStorage.encryptString(patch.apiKey.trim()).toString("base64");
    provider.authMode = "api-key";
    provider.connected = true;
  }
  store.selectedProviderId = provider.id;
  writeStore(store);
  return sanitizeStore(store);
});

handle("provider:login", (_event, providerId) => {
  const store = readStore();
  const provider = getProvider(store, assertProviderId(providerId));
  const session = createSession(provider, {
    title: `${provider.label} login`,
    mode: "login"
  });
  session.lastCommand = `${provider.command} ${buildProviderArgs(provider, "login").join(" ")}`.trim();
  store.selectedProviderId = provider.id;
  writeStore(store);
  spawnTerminal(session, provider.command, buildProviderArgs(provider, "login"), provider);
  return { state: sanitizeStore(store), sessionId: session.id, mode: session.mode };
});

handle("session:start", (_event, options = {}) => {
  const store = readStore();
  const provider = getProvider(store, assertProviderId(options.providerId || store.selectedProviderId));
  const session = createSession(provider, {
    title: options.title,
    cwd: options.cwd,
    mode: "agent"
  });
  const args = buildProviderArgs(provider, "start", session);
  session.lastCommand = `${provider.command} ${args.join(" ")}`.trim();
  store.sessions.unshift(session);
  store.selectedProviderId = provider.id;
  writeStore(store);
  spawnTerminal(session, provider.command, args, provider);
  return { state: sanitizeStore(store), sessionId: session.id, mode: session.mode };
});

handle("git:choose-repo", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose git repository",
    properties: ["openDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return listGitWorktrees(result.filePaths[0]);
});

handle("git:list-worktrees", (_event, repoPath) => listGitWorktrees(repoPath));

handle("git:suggest-worktree-path", (_event, { repoPath, branch } = {}) => {
  const repo = normalizeGitRepoPath(repoPath);
  return path.join(path.dirname(repo), `${path.basename(repo)}-${safeBranchSlug(branch)}`);
});

handle("git:create-worktree", (_event, { repoPath, branch, worktreePath } = {}) => {
  const repo = normalizeGitRepoPath(repoPath);
  const branchName = String(branch || "").trim();
  if (!branchName || !/^[A-Za-z0-9._/-]+$/.test(branchName)) throw new Error("Branch name must be a git branch name");
  const targetPath = path.resolve(String(worktreePath || ""));
  if (!targetPath || targetPath === repo) throw new Error("Worktree path must be separate from the main repo");
  let branchExists = false;
  try {
    execFileSync(gitPath(), ["-C", repo, "show-ref", "--verify", "--quiet", `refs/heads/${branchName}`], {
      timeout: 5000
    });
    branchExists = true;
  } catch {
    branchExists = false;
  }
  const args = branchExists
    ? ["-C", repo, "worktree", "add", targetPath, branchName]
    : ["-C", repo, "worktree", "add", "-b", branchName, targetPath, "HEAD"];
  execFileSync(gitPath(), args, {
    encoding: "utf8",
    timeout: 30000
  });
  return listGitWorktrees(repo);
});

handle("git:remove-worktree", (_event, { repoPath, worktreePath } = {}) => {
  const repo = normalizeGitRepoPath(repoPath);
  const targetPath = path.resolve(String(worktreePath || ""));
  if (!targetPath || targetPath === repo) throw new Error("Refusing to remove the main worktree");
  execFileSync(gitPath(), ["-C", repo, "worktree", "remove", targetPath], {
    encoding: "utf8",
    timeout: 30000
  });
  return listGitWorktrees(repo);
});

handle("session:resume", (_event, sessionId) => {
  if (typeof sessionId !== "string" || !sessionId.trim()) throw new Error("Invalid session id");
  const store = readStore();
  const session = store.sessions.find((entry) => entry.id === sessionId);
  if (!session) throw new Error("Session not found");
  if (session.providerId === "shell") {
    const shell = shellCommand();
    session.status = "running";
    session.updatedAt = new Date().toISOString();
    session.lastCommand = shell.command;
    writeStore(store);
    spawnTerminal(session, shell.command, shell.args, { id: "shell", label: "Shell" });
    return sanitizeStore(store);
  }
  const provider = getProvider(store, session.providerId);
  const args = buildProviderArgs(provider, "resume", session);
  session.status = "starting";
  session.updatedAt = new Date().toISOString();
  session.lastCommand = `${provider.command} ${args.join(" ")}`.trim();
  writeStore(store);
  spawnTerminal(session, provider.command, args, provider);
  return sanitizeStore(store);
});

handle("terminal:input", (_event, { sessionId, data } = {}) => {
  if (typeof sessionId !== "string" || typeof data !== "string") return false;
  const term = terminals.get(sessionId);
  if (!term) return false;
  term.write(data);
  return true;
});

handle("terminal:resize", (_event, { sessionId, cols, rows } = {}) => {
  if (typeof sessionId !== "string") return false;
  const term = terminals.get(sessionId);
  if (!term) return false;
  term.resize(boundedInt(cols, 120, 20, 500), boundedInt(rows, 34, 5, 200));
  return true;
});

handle("terminal:dispose", (_event, sessionId) => {
  if (typeof sessionId !== "string") return false;
  const term = terminals.get(sessionId);
  if (!term) return false;
  term.kill();
  terminals.delete(sessionId);
  return true;
});

handle("voice:transcribe", async (_event, { bytes, mimeType, locale } = {}) => {
  const audio = Buffer.from(bytes || []);
  if (!audio.length) throw new Error("No audio data received");
  if (audio.byteLength > 25 * 1024 * 1024) throw new Error("Audio clip is too large");
  const safeLocale = typeof locale === "string" && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale) ? locale : "en-US";
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentcli-voice-"));
  const extension = mimeType?.includes("mp4") ? "mp4" : mimeType?.includes("wav") ? "wav" : "webm";
  const inputPath = path.join(tempDir, `voice.${extension}`);
  const wavPath = path.join(tempDir, "voice.wav");

  try {
    fs.writeFileSync(inputPath, audio);
    execFileSync(commandPath("ffmpeg"), [
      "-y",
      "-i",
      inputPath,
      "-ar",
      "16000",
      "-ac",
      "1",
      wavPath
    ], {
      stdio: "ignore",
      timeout: 30000
    });
    return transcribeWithMacosSpeech(wavPath, safeLocale);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

handle("session:mark-provider-session-id", (_event, { sessionId, providerSessionId } = {}) => {
  if (typeof sessionId !== "string" || typeof providerSessionId !== "string") throw new Error("Invalid session mapping");
  const store = readStore();
  const session = store.sessions.find((entry) => entry.id === sessionId);
  if (!session) throw new Error("Session not found");
  session.providerSessionId = providerSessionId.trim();
  session.updatedAt = new Date().toISOString();
  writeStore(store);
  return sanitizeStore(store);
});

app.whenReady().then(() => {
  ensureStore();
  createAppMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
