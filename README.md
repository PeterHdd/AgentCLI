# AgentCLI

> ⚠️ **Alpha.** AgentCLI is early and evolving — expect rough edges, breaking changes, and unsigned builds. Feedback and [issues](https://github.com/PeterHdd/AgentCLI/issues) are very welcome.

A desktop, **terminal-first** workbench for resumable agent coding sessions. It's a real terminal (xterm.js + node-pty) with a collapsible sidebar to browse and resume your **Codex** and **Claude Code** sessions in tabs.

## Features

- **Real PTY terminal** — xterm.js + node-pty, launched as a login shell so your zsh/profile loads normally.
- **Session sidebar** — browse Codex/Claude sessions grouped by workspace; click to preview, double-click (or Enter) to resume into a tab.
- **Tabs** — multiple terminals/agents side by side, restored on relaunch.
- **Command palette** (`⌘K`) — every action in one searchable place.
- **Scratchpad** (`⌘E`) — draft prompts before sending; pair mode sends to both agents at once.
- **Handoff** — pass the current tab's work to the other agent.
- **Git worktrees** — create/open worktrees and start a shell or agent in them.
- **Voice prompts** — local, on-device transcription (macOS Speech).
- **Themes & fonts** — built-in themes (via the palette) plus an HSB color editor; import your own terminal font.
- **Crash reporting (opt-in)** — local error logs always; anonymous, scrubbed crash reports only if you opt in.

## Requirements

- **macOS** (Apple Silicon or Intel).
- **Codex CLI** and/or **Claude Code** on your `PATH` for agent sessions (the app tells you if one is missing).
- Node.js 24 — only needed to build/develop from source.

## Install

1. Download the latest `.dmg` for your chip (`arm64` = Apple Silicon, `x64` = Intel) from the [Releases page](https://github.com/PeterHdd/AgentCLI/releases).
2. Open the DMG and drag **AgentCLI** into Applications.

### ⚠️ First launch (unsigned build)

Alpha builds are **not signed or notarized**, so macOS Gatekeeper blocks the first open with *"AgentCLI can't be opened because Apple cannot check it for malicious software."* To get past it (only needed once):

- **Right-click** AgentCLI in Applications → **Open** → **Open** in the dialog, **or**
- if macOS reports the app is *"damaged"*, clear the quarantine attribute:
  ```bash
  xattr -dr com.apple.quarantine /Applications/AgentCLI.app
  ```

Only do this for builds you trust. A signed/notarized build is planned.

## Usage

| Shortcut | Action |
| --- | --- |
| `⌘K` | Command palette |
| `⌘B` | Toggle sessions sidebar |
| `⌘T` / `⌘W` | New tab / close tab |
| `⌘E` | Toggle scratchpad |
| `⌘⇧F` | Search sessions |
| `⌘⇧↵` | Send scratchpad to active tab |
| `⌘⇧P` | Pair mode (Codex + Claude) |
| `⌘⌥C` / `⌘⌥L` | Open latest Codex / Claude |
| `⌘⇧Space` | Voice prompt |
| `⌘⌥T` | Theme editor |
| `⌘⌥F` | Import terminal font |

Type `claude` or `codex` in a tab to start an interactive session. Switch themes with `/theme <name>` or via the palette. Your logs live under **Help → Open Logs Folder**.

## Privacy & telemetry

AgentCLI runs locally and talks only to the agent CLIs you invoke.

- **Local logs** (always on): errors and crashes are written to `~/Library/Application Support/AgentCLI/logs/` so you can attach them to a bug report (**Help → Reveal Log File**).
- **Crash reports** (off by default, opt-in): if you enable them — via the first-run prompt or **Help → Send Anonymous Crash Reports** — AgentCLI sends the error type, stack trace, and app version to Sentry. It **never** sends your terminal contents, prompts, file contents, or username (paths are scrubbed). You can toggle it anytime.

## Development

```bash
npm install
npm start          # branded dev app (window/menu show "AgentCLI")
npm run start:raw  # plain `electron .` (faster, shows "Electron")
npm run ci         # syntax check + static security checks + tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and project layout.

### Build a DMG

```bash
npm run dist:dmg       # Apple Silicon (default)
npm run dist:dmg:x64   # Intel
npm run dist:dmg:all   # both
```

Output is written to `release/`. Builds are unsigned unless you provide an Apple Developer ID.

## Security

AgentCLI is a terminal, so commands you (or agents) run execute with your local shell permissions. The Electron boundary around that is hardened: renderer sandboxing, `contextIsolation`, no `nodeIntegration`, a narrow `window.agentcli` preload bridge, trusted-sender IPC validation, blocked navigation/new windows, a strict Content Security Policy, audio-only media permission, and static security checks in `npm run ci` (plus `npm audit` in CI).

Found a vulnerability? Please see [SECURITY.md](SECURITY.md).

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please) driven by Conventional Commits. Merging the generated release PR tags a GitHub Release and builds + attaches the arm64/x64 DMGs automatically. Details in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
