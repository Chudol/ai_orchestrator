# Solmeron - AI Orchestrator

Electron aplikace pro spravu vice Claude Code sessions pres ruzne projekty v jednom okne.

## O projektu

Solmeron je desktop appka (Electron + React + TypeScript), ktera umoznuje:
- Pridat lokalni projekty (cesta k repu/slozce)
- Spoustet Claude Code sessions uvnitr projektu
- Prepinat mezi sessions bez nutnosti mit vice terminalu/monitoru
- Sessions bezi na pozadi i kdyz nejsou aktivne zobrazene

## Pravidla pro agenty

**POVINNE: Pred jakoukoli praci si precti `CODEX.md` - obsahuje pravidla pro psani kodu a dokumentaci architektury.**

## Stack

- **Runtime:** Electron (latest stable)
- **Frontend:** React 18+ s TypeScript
- **Styling:** Tailwind CSS
- **Terminal:** xterm.js (embeddovany terminal)
- **State management:** Zustand
- **Build:** Vite + electron-builder
- **Package manager:** pnpm

## Struktura projektu

```
src/
  main/           # Electron main process
    index.ts      # Entry point, window management
    ipc.ts        # IPC handlery pro komunikaci main <-> renderer
    sessions.ts   # Sprava Claude Code procesu (spawn, kill, attach)
    store.ts      # Persistentni uloziste projektu a sessions (electron-store)
  renderer/       # React frontend
    App.tsx        # Root komponenta
    components/    # UI komponenty
      Sidebar.tsx          # Pravy panel s projekty a sessions
      ProjectItem.tsx      # Collapsible projekt v sidebaru
      SessionItem.tsx      # Session pod projektem
      TerminalView.tsx     # xterm.js terminal wrapper
      AddProjectDialog.tsx # Dialog pro pridani projektu
    hooks/         # React hooks
    stores/        # Zustand stores
    types.ts       # TypeScript typy
  preload/         # Electron preload script
    index.ts       # Expose IPC API do rendereru
```

## Verzovani a Changelog

**POVINNE: Dodrzuj pravidla verzovani pri kazde zmene.**

### Pravidla pro beznou praci
1. **Kazda zmena** — pri editaci kodu MUSI agent pridat zaznam do `changelog.md` pod sekci `## [Unreleased]`
2. **Kategorie** — pouzivej `### Added`, `### Changed`, `### Fixed`, `### Removed` pod Unreleased sekci
3. **Format zaznamu** — kratky popis zmeny v anglictine, kazdy zaznam na novem radku s `- ` prefixem

### Release
Verze se bumpuje pres `/patch` skill — ten zaroven generuje user-friendly patch notes z changelogu. **Nikdy rucne nemenit verzi v `package.json`.**

## Jak spoustet

```bash
pnpm install
pnpm dev        # development mode
pnpm build      # production build
```
