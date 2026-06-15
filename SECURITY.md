# Security Policy

AgentCLI is alpha software. We take security seriously and appreciate responsible disclosure.

## Supported versions

Only the **latest release** receives fixes during alpha. Older versions are not maintained.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via GitHub's **[Report a vulnerability](https://github.com/PeterHdd/AgentCLI/security/advisories/new)** (Security → Advisories). Include:

- a description and impact,
- steps to reproduce (or a proof of concept),
- affected version (see **About AgentCLI** in the app menu),
- and your environment (macOS version, chip).

This is a volunteer alpha project, so responses are best-effort. We'll acknowledge your report, investigate, and credit you in the release notes if you'd like once a fix ships.

## Threat model & scope

AgentCLI is a terminal: commands you type — and commands the agents you run type — execute with **your local shell permissions**. That is by design and is not itself a vulnerability. Treat agent sessions with the same caution you'd apply to running code from any source.

The app hardens the Electron boundary around that surface:

- Renderer sandboxing, `contextIsolation`, and disabled `nodeIntegration`.
- A narrow preload bridge exposed as `window.agentcli` (no raw `ipcRenderer`/Electron primitives).
- Trusted-sender validation on every IPC handler.
- Blocked renderer navigation and new-window creation.
- A Content Security Policy that blocks remote script/connections in the renderer.
- Audio-only media permission, used solely for local voice transcription.
- API keys (if provided) stored via the OS keychain (`safeStorage`), never in plaintext state.
- Static security checks enforced in `npm run ci`, plus `npm audit` in CI.

In scope: issues that break the Electron sandbox/IPC boundary, leak secrets, enable remote code execution from untrusted input, or exfiltrate data. Out of scope: the intended ability to run local shell/agent commands.

## Telemetry

Crash reporting is **opt-in** and scrubbed — it never transmits terminal contents, prompts, file contents, or your username. See the Privacy section of the [README](README.md).
