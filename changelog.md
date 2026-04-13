# Changelog

All notable changes to Solmeron are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
