export interface Feature {
  id: string
  title: string
  subtitle: string
  description: string
  image: string
  highlights: string[]
}

export const features: Feature[] = [
  {
    id: 'sessions',
    title: 'Claude Code Sessions',
    subtitle: 'Your AI pair programmers, all in one view',
    description:
      'Run multiple Claude Code instances across different projects simultaneously. See real-time status for each session \u2014 Working, Thinking, Idle, or Needs Approval \u2014 with a project sidebar that keeps everything organized.',
    image: './assets/main.png',
    highlights: [
      'Multiple concurrent Claude sessions',
      'Real-time session status indicators',
      'Integrated file browser & editor',
      'Project-based organization',
    ],
  },
  {
    id: 'terminals',
    title: 'Commands & Terminals',
    subtitle: 'Custom commands and split terminal panes',
    description:
      'Define global and project-level commands, then execute them with one click or drag-and-drop. Split terminal panes let you monitor API servers, watch builds, and run tests \u2014 all while Claude works above.',
    image: './assets/terminal.png',
    highlights: [
      'Global & project-scoped commands',
      'Split terminal panes',
      'Drag & drop command execution',
      'Full terminal emulation via xterm.js',
    ],
  },
  {
    id: 'claude-config',
    title: 'Claude Configuration',
    subtitle: 'Skills, agents, and MCP servers at a glance',
    description:
      'View and manage your Claude setup directly from Solmeron. Browse project and global skills, configure AI agents with different models, and manage MCP server connections \u2014 all with the ability to open and edit config files in place.',
    image: './assets/claude.png',
    highlights: [
      'Project & global skills overview',
      'Agent config with model selection',
      'MCP server management',
      'Inline file viewing & editing',
    ],
  },
  {
    id: 'git',
    title: 'Git Management',
    subtitle: 'Multi-repo git operations without leaving the app',
    description:
      'Track multiple git repositories within a single project \u2014 including nested repos discovered via right-click in the file browser. Search and checkout branches, check status, fetch, and pull from a clean, unified UI.',
    image: './assets/git.png',
    highlights: [
      'Multiple repositories per project',
      'Branch search & one-click checkout',
      'Status, fetch & pull buttons',
      'Nested git repo tracking',
    ],
  },
]
