# Orchestrator - Claude Code Session Manager

Electron aplikace pro spravu vice Claude Code sessions pres ruzne projekty v jednom okne.

## O projektu

Orchestrator je desktop appka (Electron + React + TypeScript), ktera umoznuje:
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

### Pravidla pro commit
Kdyz uzivatel chce commitnout zmeny (rekne "commitni", "udelej commit", pouzije /commit apod.), agent MUSI pred samotnym commitem provest:

1. **Zkontroluj Unreleased sekci** v `changelog.md` — pokud je prazdna, upozorni uzivatele a nech ho doplnit
2. **Bump patch verze** — precti `"version"` z `package.json`, zvys PATCH o 1 (napr. 0.0.1 -> 0.0.2)
3. **Updatuj `changelog.md`**:
   - Obsah `## [Unreleased]` presun pod novou hlavicku `## [NOVA_VERZE] - YYYY-MM-DD`
   - Sekci `## [Unreleased]` vyprazdni (nech jen hlavicku a prazdny radek)
4. **Updatuj `package.json`** — nastav `"version"` na novou verzi
5. **Staguj** `changelog.md` a `package.json` spolecne s ostatnimi zmenami
6. Pak teprve navrhni/proved commit

**Nikdy nerucne menit verzi** v `package.json` mimo commit workflow.

## Jak spoustet

```bash
pnpm install
pnpm dev        # development mode
pnpm build      # production build
```
