# AgentCLI

AgentCLI is an Electron terminal built around agent work. It is a terminal first, with optional session navigation for Codex and Claude Code.

## Features

- Real PTY terminal powered by xterm.js and node-pty.
- Login shell startup so zsh/profile configuration can load normally.
- Codex and Claude Code sessions in a collapsible sidebar.
- Resume previous Codex/Claude sessions into separate tabs.
- Scratchpad for drafting prompts before sending them to a terminal.
- Handoff a tab to another agent.
- Local voice prompt transcription on macOS.
- Theme editor with HSB sliders for terminal/app colors.
- Terminal font import for `.ttf`, `.otf`, `.woff`, and `.woff2`.
- Nerd Font fallback for zsh/starship/powerlevel prompt icons.
- Native app menus and shortcuts for common actions.
- Custom app icon assets in SVG, PNG, iconset, and macOS ICNS formats.

## Requirements

- macOS for the current voice transcription helper.
- Node.js 24.
- Codex CLI and/or Claude Code installed if you want agent sessions.

## Development

Install dependencies:

```bash
npm install
```

Start the Electron app:

```bash
npm run start
```

Run syntax checks:

```bash
npm run check
```

Run tests:

```bash
npm test
```

Run the same command as CI:

```bash
npm run ci
```

Run only the static security checks:

```bash
npm run security:check
```

## Build a DMG

Create an unsigned local DMG for the current default release architecture, Apple Silicon:

```bash
npm run dist:dmg
```

The output is written to `release/`.

Create architecture-specific DMGs:

```bash
npm run dist:dmg:arm64
npm run dist:dmg:x64
```

Create both macOS DMGs:

```bash
npm run dist:dmg:all
```

Create only the packaged `.app` directory for testing:

```bash
npm run dist:dir
```

Public macOS distribution should use an Apple Developer ID certificate and notarization. The unsigned DMG is useful for local testing, but users will see Gatekeeper warnings if you distribute it publicly.

## Security

AgentCLI is a terminal, so commands typed by the user intentionally execute with the user's local shell permissions. The app hardens the Electron boundary around that surface:

- Renderer sandboxing, `contextIsolation`, and disabled `nodeIntegration`.
- A narrow preload bridge exposed as `window.agentcli`.
- Trusted-sender validation on IPC handlers.
- Blocked renderer navigation and new windows.
- Content Security Policy for the local renderer.
- Audio-only media permission for voice prompts.
- Bounded voice upload size before local transcription.
- Static security checks in `npm run ci`.

GitHub CI also runs `npm audit --omit=dev` for production dependency vulnerabilities.

## Release

AgentCLI uses release-please for version bumps, changelog updates, tags, and GitHub Releases. Use conventional commit messages so release-please can categorize changes:

```bash
feat: add session timeline
fix: preserve Codex TUI colors
docs: document unsigned macOS install
```

Normal release flow:

1. Merge feature/fix commits to `main`.
2. The Release Please workflow opens or updates a release PR.
3. Merge the release PR.
4. Release Please creates the tag and GitHub Release.
5. The release workflow builds Apple Silicon and Intel DMGs, then uploads them to that GitHub Release.

For a manual unsigned alpha tag, you can still run:

```bash
git tag v0.0.1-alpha.1
git push origin main --tags
```

The GitHub release workflow builds Apple Silicon and Intel DMGs, then attaches them to a GitHub Release for the tag.

## Shortcuts

- `Cmd+T`: new AgentCLI tab
- `Cmd+W`: close current tab
- `Cmd+K`: command palette
- `Cmd+B`: toggle sessions
- `Cmd+Shift+F`: search sessions
- `Cmd+E`: toggle scratchpad
- `Cmd+Shift+Enter`: send scratchpad to active tab
- `Cmd+Shift+P`: pair mode
- `Cmd+Shift+Space`: voice prompt
- `Cmd+Alt+T`: theme editor
- `Cmd+Alt+F`: import terminal font

## Notes

AgentCLI strips `NO_COLOR` from spawned PTYs and advertises truecolor support so agent TUIs such as Codex can render their own colors and prompt backgrounds.

If prompt icons render as empty boxes, install or import a Nerd Font such as MesloLGS NF, JetBrainsMono Nerd Font, or Hack Nerd Font.

## License

MIT
