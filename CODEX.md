# CODEX - Solmeron

Tento soubor je zivouci dokument. Agenti ho MUSI cist pred praci a MUSI ho aktualizovat kdyz udelaji zasadni zmenu v architekture nebo pridaji novou dulezitou cast.

## Pravidla pro psani kodu

### Obecne
- **Jazyk kodu:** Anglictina (nazvy promennych, funkci, komponent, komentaru)
- **TypeScript strict mode** - zadne `any`, vsechno typovane
- **Funkcionalni komponenty** s React hooks, zadne class components
- **Named exports** vsude, zadne default exports
- **Pojmenovani souboru:** PascalCase pro komponenty (.tsx), camelCase pro utility (.ts)
- **Maximalni delka souboru:** 200 radku - pokud presahuje, rozdelit

### Formatovani
- 2 mezery indent
- Stredniky na konci radku
- Single quotes pro stringy
- Trailing comma v objektech a arrays

### Komponenty
- Jedna komponenta = jeden soubor
- Props interface pojmenovany `{ComponentName}Props`
- Destrukturovat props v parametru funkce
- Pouzivat Tailwind utility classes primo, zadne styled-components

### State management
- Zustand pro globalni stav (projekty, sessions, aktivni session)
- useState pro lokalni UI stav
- Zadny prop drilling - pouzit store nebo context

### IPC komunikace (Electron)
- Vsechny IPC kanaly definovane jako konstanty v `src/shared/channels.ts`
- Main process handlery v `src/main/ipc.ts`
- Preload script expose typovane API pres contextBridge
- Renderer pristupuje pres `window.api.*`

### Error handling
- Try/catch kolem spawn procesu a filesystem operaci
- Errory logovat do console, zobrazit uzivateli toast/notifikaci
- Nenechat appku spadnout - graceful degradation

### Git
- Commity v anglictine
- Format: `type(scope): message` (feat, fix, refactor, docs, chore)

## Architektura

### Jak funguje session management
- Kazda session = jeden `node-pty` proces s `claude` prikazem
- Proces bezi nezavisle na tom, jestli je session zobrazena v UI
- xterm.js se pripoji k existujicimu procesu kdyz uzivatel otevre session
- Data z procesu se bufferuji v main procesu (posledních 10000 radku)
- Pri otevreni session se buffer replayuje do xterm.js

### Data model
```typescript
interface Project {
  id: string;          // uuid
  name: string;        // uzivatelsky nazev
  path: string;        // absolutni cesta k projektu
  createdAt: number;
}

interface Session {
  id: string;          // uuid
  projectId: string;   // reference na projekt
  name: string;        // uzivatelsky nazev
  status: 'running' | 'stopped';
  createdAt: number;
}
```

### Persistentni data
- Projekty a sessions ulozene pres `electron-store` v JSON
- Cesta: `~/Library/Application Support/Orchestrator/config.json` (zachovano pod puvodnim nazvem kvuli kompatibilite)

### IPC kanaly
Definovane v `src/shared/channels.ts`:
- `projects:list` - vrati vsechny projekty
- `projects:add` - prida novy projekt
- `projects:remove` - odebere projekt
- `sessions:list` - vrati sessions pro projekt
- `sessions:create` - vytvori novou session (spusti claude)
- `sessions:stop` - zastavi session
- `sessions:attach` - pripoji se k session (zacne streamovat output)
- `sessions:detach` - odpoji se od session
- `sessions:input` - posle input do session
- `sessions:rename` - prejmenovani session

## Kde najit co
- **Electron main process:** `src/main/`
- **React UI:** `src/renderer/`
- **Sdilene typy a konstanty:** `src/shared/`
- **Preload (IPC bridge):** `src/preload/`
- **Konfigurace buildu:** `electron-builder.yml`, `vite.config.ts`

## Zmeny a rozhodnuti
<!-- Agenti: pridavejte sem dulezite zmeny a architektonicka rozhodnuti -->
