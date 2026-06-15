# Changelog

All notable changes to AgentCLI will be documented in this file.

## [0.0.4](https://github.com/PeterHdd/AgentCLI/compare/AgentCLI-v0.0.3...AgentCLI-v0.0.4) (2026-06-15)


### Features

* add error surfacing, crash reporting, and CLI onboarding ([68b17e8](https://github.com/PeterHdd/AgentCLI/commit/68b17e846e73c438e9327fe868633d051e9e9b1d))

## [0.0.3](https://github.com/PeterHdd/AgentCLI/compare/AgentCLI-v0.0.2...AgentCLI-v0.0.3) (2026-06-13)


### Bug Fixes

* stop pinning version in static tests so releases don't break CI ([2a4de3a](https://github.com/PeterHdd/AgentCLI/commit/2a4de3a5cf8d38e7ce21269b64601d52fcbcafba))
* stop pinning version in static tests so releases don't break CI ([e79df52](https://github.com/PeterHdd/AgentCLI/commit/e79df526c117a398bb3ed2c1dcf6cf7357456b98))

## [0.0.2](https://github.com/PeterHdd/AgentCLI/compare/AgentCLI-v0.0.1...AgentCLI-v0.0.2) (2026-06-13)


### Features

* initial AgentCLI alpha ([a0b2dbc](https://github.com/PeterHdd/AgentCLI/commit/a0b2dbcc1b8b7c4c4c6a6ff239d645e04875dc9e))
* overhaul renderer UX and extract pure logic into modules ([d3aad34](https://github.com/PeterHdd/AgentCLI/commit/d3aad34b85b638a597da68b17fdde8528e4ec9ee))


### Bug Fixes

* disable electron-builder auto publish ([3bd936e](https://github.com/PeterHdd/AgentCLI/commit/3bd936e3ebfda494dd8afa803eee6971c002f46e))
* keep pre-1.0 feature releases patch scoped ([d95d731](https://github.com/PeterHdd/AgentCLI/commit/d95d7315c348bceaff3c43dfe4f4cff788574958))


### Performance Improvements

* speed up session listing and unify provider naming ([cd7e451](https://github.com/PeterHdd/AgentCLI/commit/cd7e4516a59155ee89531f29919cae4f662cff5e))

## 0.0.1 - 2026-05-31

### Added

- Real PTY terminal shell with zsh/profile support.
- Codex and Claude Code session sidebar with provider badges.
- Multi-tab agent terminals with session resume support.
- Scratchpad, pair mode, voice prompt, and handoff actions.
- Theme editor with HSB sliders and terminal font import.
- macOS app branding, icon generation, and DMG packaging.
- CI tests for branding, preload bridge, PTY color env, menus, and packaging scripts.

### Known Limitations

- DMGs are unsigned and not notarized.
- Local DMG builds are Apple Silicon by default.
- macOS voice transcription helper is platform-specific.
