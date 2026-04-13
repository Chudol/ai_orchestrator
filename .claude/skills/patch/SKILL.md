---
name: patch
description: Release a new app version — bumps version, generates user-friendly patch notes from changelog. Use when releasing a new version.
---

# /patch — Release New Version

You are releasing a new Solmeron version. Follow these steps exactly:

## Step 1: Read current state

Read these files in parallel:
- `package.json` — current `version`
- `changelog.md` — entries under `## [Unreleased]`
- `src/renderer/data/patchNotes.ts` — existing patch notes

## Step 2: Validate

If `## [Unreleased]` section in `changelog.md` is empty (no entries under it):
- **STOP** and tell the user: "Patch ZASTAVEN — v changelog.md nejsou žádné Unreleased záznamy."
- Do NOT proceed.

## Step 3: Bump version

- Read current version from `package.json` (e.g. `0.0.3`)
- Increment PATCH: `0.0.3` → `0.0.4`
- Update `"version"` in `package.json`

## Step 4: Update changelog.md

- Move all content under `## [Unreleased]` to a new section `## [NEW_VERSION] - YYYY-MM-DD` (today's date)
- Leave `## [Unreleased]` header with empty line below it

## Step 5: Generate patch notes

Read ALL changelog entries for the new version. Transform them into a user-friendly `PatchNoteEntry` and **prepend** it to the `PATCH_NOTES` array in `src/renderer/data/patchNotes.ts`.

### Filtering rules — what to EXCLUDE:
- Internal refactors, code cleanup, file reorganization
- Config file changes (CLAUDE.md, CODEX.md, agent definitions, skill updates)
- CI/CD pipeline changes, build config tweaks
- Dependency bumps (unless they enable a user-visible feature)
- Developer tooling changes

### Writing rules:
- **User-friendly language** — no dev jargon, no file paths, no technical implementation details
- Write as if explaining to a user of the app, not a developer
- Group related changes into **major** entries (big features with optional `details[]` sub-bullets)
- Put smaller fixes, QoL improvements into **minor** (simple strings)
- Each major entry needs a clear `title`, short `description`, and optional `details[]`
- New entry goes FIRST in the array (newest version on top)
- Set `date` to today's date (YYYY-MM-DD)
- Give it a catchy `title` summarizing the release theme

### Structure reminder:
```ts
{
  version: '0.0.4',
  title: 'Catchy Release Name',
  date: '2026-04-14',
  major: [
    {
      title: 'Feature Name',
      description: 'Short user-friendly summary.',
      details: [
        'Sub-feature or detail 1.',
        'Sub-feature or detail 2.',
      ],
    },
  ],
  minor: [
    'Small improvement in one sentence.',
    'Bug fix in one sentence.',
  ],
}
```

If ALL changelog entries are internal/filtered out, create the entry with an empty `major` array and a single minor entry like "Internal improvements and stability fixes."

## Step 6: Summary

Show the user:
- Version bumped: X.X.X → X.X.X
- Number of major / minor items in the new patch note
- Remind them to commit and run: `pnpm release`
