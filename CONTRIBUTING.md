# Contributing to AgentCLI

Thanks for your interest! AgentCLI is an alpha, so contributions, bug reports, and ideas are all welcome. Please also read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- **macOS** (Apple Silicon or Intel).
- **Node.js 24**.
- Optionally, the **Codex CLI** and/or **Claude Code** on your `PATH` to exercise agent features.

## Setup

```bash
git clone https://github.com/PeterHdd/AgentCLI.git
cd AgentCLI
npm install
```

## Run

```bash
npm start          # branded dev app — window/menu show "AgentCLI"
npm run start:raw  # plain `electron .` — faster, attached logs, shows "Electron"
```

Use `start:raw` for quick iteration; use `start` when you want the real branding (dock/menu name + icon).

## Checks (run before every PR)

```bash
npm run ci   # node --check (syntax) + security:check (static) + node --test
```

Everything in `npm run ci` must pass. You can also run the pieces individually: `npm run check`, `npm run security:check`, `npm test`.

## Project layout

```
src/main.js            Electron main process (windows, IPC, PTYs, logging, telemetry)
src/preload.js         The window.agentcli bridge (the only renderer ↔ main surface)
src/renderer/          UI: index.html, styles.css, renderer.js
src/renderer/lib/      Pure, dual-mode modules (colors, format, agent-detect) with unit tests
test/                  Static + unit tests (node:test)
scripts/               Icon generation, branded dev launcher, security check
```

A few conventions worth knowing:

- The renderer is **sandboxed** with `contextIsolation` and no `nodeIntegration`. All main-process access goes through the `window.agentcli` preload bridge, and every IPC handler is registered through the trusted `handle()` wrapper — keep it that way (the security check enforces a single `ipcMain.handle`).
- Pure logic that can be unit-tested lives in `src/renderer/lib/*.js` as **dual-mode** files (browser global + `module.exports` for Node tests). Prefer adding to those when you write testable helpers.
- The renderer is loaded under a strict CSP (`script-src 'self'`, `connect-src 'none'`). Don't add remote scripts/connections to the renderer.

## Commit messages (Conventional Commits)

Releases are automated by [release-please](https://github.com/googleapis/release-please), which reads commit messages. Use Conventional Commits:

```
feat: add session timeline
fix: preserve Codex TUI colors
perf: cache codex thread listing
docs: document unsigned macOS install
chore: bump dependencies
ci: speed up the build matrix
```

Only `feat`, `fix`, and `perf` (and breaking changes) trigger a release; `chore`/`docs`/`ci`/`refactor`/`test` ride along without a version bump. While pre-1.0, all bumps are **patch** level.

## Pull requests

1. Branch off `main` (e.g. `feat/...`, `fix/...`).
2. Keep PRs focused; update/extend tests where it makes sense.
3. Make sure `npm run ci` passes.
4. Open the PR against `main` — CI runs automatically.

## Releases

Merging Conventional-Commit changes to `main` makes release-please open/update a **release PR**. Merging that release PR tags a GitHub Release and the build automatically attaches the arm64/x64 DMGs.

## Crash-reporting (Sentry) for forks

The Sentry DSN is **not** committed. Crash reporting stays disabled unless a DSN is present, which is fine for local development. To enable it in your own builds, set a `SENTRY_DSN` environment variable (dev) or a `SENTRY_DSN` GitHub Actions secret (the release build injects it into the packaged app). Crash reporting is always **opt-in** for end users and scrubbed of sensitive data.
