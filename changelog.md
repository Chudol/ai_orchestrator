# Changelog

All notable changes to Solmeron are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.7] - 2026-05-14

### Fixed
- Sessions permanently stuck in "Thinking" state — newer Claude Code versions (post early-May 2026) stopped emitting `: ready`/`: done`/`: working` OSC 0 titles and now use OSC 777 notifications (`Claude is waiting for your input`, `needs your permission`, `needs your approval`). Detector now parses OSC 777 as the authoritative idle/approval signal alongside the legacy spinner/title detection

## [0.0.6] - 2026-05-13

### Fixed
- Terminal rendering corruption (text overdrawing, prompt jumping mid-screen) caused by PTY size desync — xterm fit now propagates cols/rows to the PTY via new `sessions:resize` IPC, and a ResizeObserver re-fits when the terminal container changes size (sidebar toggle, window resize)

### Changed
- PTY default size raised from 120×30 to 200×60 so initial Claude Code render is safe before the first resize roundtrip

## [0.0.5] - 2026-05-01

### Added
- Git checkout now shows remote (origin) branches alongside local branches with visual separation
- Git fetch now refreshes the branch list automatically so new remote branches appear immediately
- Toggle button in terminal view to enable/disable auto-scroll to bottom when Claude produces new output

### Fixed
- Web: add build-time cache busting (`?v=<hash>`) to screenshot images so updated assets are never served stale

### Changed
- Web download buttons now directly download latest DMG from GitHub releases
- Release script cleans release dir before build, uploads DMG with stable name (Solmeron-arm64.dmg) and patched latest-mac.yml for auto-updater
- Build step moved from package.json release script into release.sh

## [0.0.4] - 2026-04-13

### Added
- Patch Notes panel in titlebar with collapsible version cards (major/minor changes)
- /patch skill for version bumping and user-friendly patch notes generation
- Patch notes data file (patchNotes.ts) with curated entries for all versions

### Fixed
- File drag and drop into terminal now uses webUtils.getPathForFile() instead of deprecated File.path (Electron 35+)

### Changed
- Removed version bump logic from commit workflow — now handled by /patch skill
- Updated CLAUDE.md versioning rules to reference /patch

## [0.0.3] - 2026-04-13

### Changed
- Rename app from Orchestrator to Solmeron across entire codebase (UI, config, agents, web, docs)
- Keep userData path as "Orchestrator" for backward compatibility with existing production config
- Update appId to com.solmeron.app
- Add zip target to electron-builder for future auto-updates
- Configure publish provider pointing to Chudol/solmeron_release

### Added
- Auto-updater (electron-updater) — checks GitHub releases on launch + every 30 min
- Release script (`pnpm release`) for uploading builds to Chudol/solmeron_release
- Update section in Settings panel with check/download progress/install button
- Auto-updater broadcasts status to renderer via IPC

## [0.0.2] - 2026-04-13

### Added
- Version badge displayed in bottom-right corner of the app
- Versioning system with changelog tracking
- Drag and drop file/image support in terminal (pastes file path)
- Restart session with custom args via right-click context menu (e.g. --chrome)

## [0.0.1] - 2026-04-13

### Added
- Electron + React + TypeScript app for managing multiple Claude Code sessions
- Project management (add/remove local projects)
- Session management (create/stop/delete/rename sessions)
- Embedded terminal via xterm.js with node-pty
- Session state detection (idle/thinking/working/needs approval) with elapsed timer
- Session resume on app restart via claude --resume
- File browser with collapsible tree navigation
- File viewer with Monaco Editor syntax highlighting
- Per-project open files with tab bar
- Resizable split between terminal and file viewer
- Persistent storage via electron-store
- Claude Code MCP server configuration
- Git tracking panel
- Custom commands with variable substitution
- Terminal tabs and quick open dialog (Cmd+P)
- Glass morphism UI styling and visual polish
- Demo mode and web assets
- Unread indicator (green "Done" dot after 30s idle)
- Session context menu (set status, stop, close)
- Customizable user statuses (todo, in progress, review, done)
- Settings panel for managing status options
