/**
 * Patch notes displayed in-app. Written in user-friendly language — no dev jargon,
 * file paths, or internal implementation details.
 *
 * Structure:
 * - Major Changes: big features, each with optional sub-details
 * - Minor Changes: simple one-liner improvements
 */

export interface PatchNoteEntry {
  version: string;
  title: string;
  date: string; // YYYY-MM-DD
  major: MajorChange[];
  minor: string[];
}

export interface MajorChange {
  title: string;
  description: string;
  details?: string[];
}

export const PATCH_NOTES: PatchNoteEntry[] = [
  {
    version: '0.0.4',
    title: 'Patch Notes & Polish',
    date: '2026-04-13',
    major: [
      {
        title: 'Patch Notes Panel',
        description:
          'See what\'s new in every release right inside the app. Collapsible version cards show major features and smaller improvements at a glance.',
      },
    ],
    minor: [
      'Fixed file drag and drop compatibility with latest Electron.',
    ],
  },
  {
    version: '0.0.3',
    title: 'Solmeron is Born',
    date: '2026-04-13',
    major: [
      {
        title: 'Automatic Updates',
        description:
          'Solmeron now checks for updates automatically and notifies you when a new version is ready to install.',
        details: [
          'Checks for updates on launch and every 30 minutes.',
          'Download progress visible in Settings.',
          'One-click "Restart & Update" when ready.',
        ],
      },
    ],
    minor: [
      'Added release pipeline for faster version delivery.',
    ],
  },
  {
    version: '0.0.2',
    title: 'Session Controls & Drag-Drop',
    date: '2026-04-13',
    major: [
      {
        title: 'Restart Sessions with Custom Arguments',
        description:
          'Right-click any session to restart it with custom arguments like --chrome for browser-based workflows.',
      },
      {
        title: 'Drag & Drop Files into Terminal',
        description:
          'Drop files or images directly onto the terminal to paste their file path — no more manual copying.',
      },
    ],
    minor: [
      'Version badge now displayed in the bottom-right corner.',
    ],
  },
  {
    version: '0.0.1',
    title: 'Initial Release',
    date: '2026-04-13',
    major: [
      {
        title: 'Multi-Session Management',
        description:
          'Run multiple Claude Code sessions across different projects in a single window. Switch between sessions instantly — they keep running in the background.',
        details: [
          'Add local projects by folder path.',
          'Create, stop, rename, and delete sessions.',
          'Sessions auto-resume on app restart.',
        ],
      },
      {
        title: 'Integrated Development Tools',
        description:
          'Built-in file browser, code viewer with syntax highlighting, git tracking, and custom commands — all alongside your Claude sessions.',
        details: [
          'File browser with collapsible tree navigation.',
          'Monaco Editor for viewing and editing files.',
          'Git panel with branch info and status.',
          'Custom commands with variable substitution.',
          'Multiple terminal tabs with quick open (Cmd+P).',
        ],
      },
      {
        title: 'Session Intelligence',
        description:
          'See at a glance what each session is doing — idle, thinking, working, or waiting for your approval — with elapsed time tracking.',
      },
    ],
    minor: [
      'Glass morphism UI styling.',
      'Unread indicator when a session finishes while you\'re away.',
      'Customizable session statuses (todo, in progress, review, done).',
      'Claude Code MCP server configuration panel.',
    ],
  },
];
