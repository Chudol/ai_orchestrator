import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/channels';
import {
  Project, Session, Command,
  SkillInfo, AgentInfo, McpServerConfig, McpTool,
  FileEntry, GitStatusResult,
} from '@shared/types';
import {
  createPtySession, stopSession, attachSession, detachSession,
  sendInput, respawnSession, isSessionRunning, deleteSessionLogs,
  cleanupAllSessions, suppressStateBroadcast,
} from './sessions';
import { SessionInternalState } from '@shared/types';

// ─── Fake Projects ───────────────────────────────────────────

const projects: Project[] = [
  { id: 'demo-p1', name: 'E-commerce API', path: '/Users/demo/projects/ecommerce-api', createdAt: Date.now() - 86400000 * 30 },
  { id: 'demo-p2', name: 'Mobile App', path: '/Users/demo/projects/mobile-app', createdAt: Date.now() - 86400000 * 20 },
  { id: 'demo-p3', name: 'Design System', path: '/Users/demo/projects/design-system', createdAt: Date.now() - 86400000 * 10 },
  { id: 'demo-p4', name: 'Internal Tools', path: '/Users/demo/projects/internal-tools', createdAt: Date.now() - 86400000 * 5 },
];

// ─── Fake Sessions ───────────────────────────────────────────

const sessions: Session[] = [
  { id: 'demo-s1', projectId: 'demo-p1', name: 'refactor-auth-middleware', status: 'running', claudeSessionId: null, createdAt: Date.now() - 3600000 * 3 },
  { id: 'demo-s2', projectId: 'demo-p1', name: 'fix-payment-webhook', status: 'running', claudeSessionId: null, createdAt: Date.now() - 3600000 * 1 },
  { id: 'demo-s3', projectId: 'demo-p2', name: 'implement-push-notifications', status: 'running', claudeSessionId: null, createdAt: Date.now() - 7200000 },
  { id: 'demo-s4', projectId: 'demo-p2', name: 'ui-redesign-home', status: 'running', claudeSessionId: null, createdAt: Date.now() - 1800000 },
  { id: 'demo-s5', projectId: 'demo-p3', name: 'add-color-tokens', status: 'running', claudeSessionId: null, createdAt: Date.now() - 5400000 },
  { id: 'demo-s6', projectId: 'demo-p3', name: 'button-variants', status: 'stopped', claudeSessionId: null, createdAt: Date.now() - 86400000 },
  { id: 'demo-s7', projectId: 'demo-p4', name: 'dashboard-metrics', status: 'running', claudeSessionId: null, createdAt: Date.now() - 900000 },
  { id: 'demo-s8', projectId: 'demo-p4', name: 'fix-csv-export', status: 'running', claudeSessionId: null, createdAt: Date.now() - 600000 },
];

// Static fake states for sidebar — never change
const fakeStates: Record<string, SessionInternalState> = {
  'demo-s1': 'idle',
  'demo-s2': 'thinking',
  'demo-s3': 'working',
  'demo-s4': 'waiting_for_approval',
  'demo-s5': 'teammates_running',
  'demo-s6': 'stopped',
  'demo-s7': 'idle',
  'demo-s8': 'working',
};

// All sessions spawn real Claude Code in this directory
const DEMO_CWD = '/Users/lukaschudo/Desktop/Workspace/dev/personal/karty';

// ─── Fake Commands ───────────────────────────────────────────

const commands: Command[] = [
  { id: 'demo-c1', projectId: 'demo-p1', name: 'Run Tests', command: 'pnpm test {file}', order: 0, createdAt: Date.now() },
  { id: 'demo-c2', projectId: 'demo-p1', name: 'Deploy Staging', command: 'pnpm deploy --env {environment}', order: 1, createdAt: Date.now() },
  { id: 'demo-c3', projectId: 'demo-p2', name: 'Start Dev Server', command: 'npx expo start --{platform}', order: 0, createdAt: Date.now() },
  { id: 'demo-c4', projectId: 'demo-p2', name: 'Build Release', command: 'npx expo build:{platform}', order: 1, createdAt: Date.now() },
  { id: 'demo-c5', projectId: 'demo-p3', name: 'Build Storybook', command: 'pnpm storybook:build', order: 0, createdAt: Date.now() },
  { id: 'demo-c6', projectId: 'demo-p3', name: 'Publish Package', command: 'pnpm publish --tag {tag}', order: 1, createdAt: Date.now() },
  { id: 'demo-c7', projectId: 'demo-p4', name: 'Seed Database', command: 'pnpm db:seed --count {count}', order: 0, createdAt: Date.now() },
  { id: 'demo-c8', projectId: 'demo-p4', name: 'Generate Types', command: 'pnpm graphql:codegen', order: 1, createdAt: Date.now() },
];

// ─── Fake Git Data ───────────────────────────────────────────

const gitBranches: Record<string, string[]> = {
  '/Users/demo/projects/ecommerce-api': ['main', 'develop', 'feat/payment-v2', 'fix/auth-bug', 'feat/webhooks'],
  '/Users/demo/projects/mobile-app': ['main', 'develop', 'feat/push-notifications', 'ui/home-redesign'],
  '/Users/demo/projects/design-system': ['main', 'develop', 'feat/color-tokens', 'feat/button-variants'],
  '/Users/demo/projects/internal-tools': ['main', 'develop', 'fix/dashboard-layout', 'feat/csv-export'],
};

const gitCurrentBranch: Record<string, string> = {
  '/Users/demo/projects/ecommerce-api': 'feat/payment-v2',
  '/Users/demo/projects/mobile-app': 'main',
  '/Users/demo/projects/design-system': 'develop',
  '/Users/demo/projects/internal-tools': 'fix/dashboard-layout',
};

const gitStatuses: Record<string, GitStatusResult> = {
  '/Users/demo/projects/ecommerce-api': { dirty: true, staged: 2, unstaged: 1, untracked: 1 },
  '/Users/demo/projects/mobile-app': { dirty: false, staged: 0, unstaged: 0, untracked: 0 },
  '/Users/demo/projects/design-system': { dirty: true, staged: 0, unstaged: 3, untracked: 0 },
  '/Users/demo/projects/internal-tools': { dirty: true, staged: 0, unstaged: 0, untracked: 1 },
};

const trackedPaths: Record<string, string[]> = {
  'demo-p1': ['/Users/demo/projects/ecommerce-api'],
  'demo-p2': ['/Users/demo/projects/mobile-app'],
  'demo-p3': ['/Users/demo/projects/design-system'],
  'demo-p4': ['/Users/demo/projects/internal-tools'],
};

// ─── Fake Claude Data ────────────────────────────────────────

const skills: SkillInfo[] = [
  { name: 'commit', description: 'Create git commits with conventional messages', filePath: '~/.claude/skills/commit.md', isGlobal: true },
  { name: 'review-pr', description: 'Review pull requests thoroughly', filePath: '~/.claude/skills/review-pr/skill.md', isGlobal: true },
  { name: 'deploy', description: 'Deploy to staging or production', filePath: '.claude/skills/deploy.md', isGlobal: false },
  { name: 'test-coverage', description: 'Analyze and improve test coverage', filePath: '.claude/skills/test-coverage.md', isGlobal: false },
];

const agents: AgentInfo[] = [
  { name: 'code-reviewer', description: 'Automated code review agent', model: 'claude-sonnet-4-6', filePath: '.claude/agents/code-reviewer.md' },
  { name: 'test-writer', description: 'Generate comprehensive test suites', model: 'claude-sonnet-4-6', filePath: '.claude/agents/test-writer.md' },
  { name: 'docs-generator', description: 'Generate API documentation from code', model: 'claude-haiku-4-5-20251001', filePath: '.claude/agents/docs-generator.md' },
];

const mcpServers: McpServerConfig[] = [
  { name: 'filesystem', command: 'npx', args: ['-y', '@anthropic-ai/mcp-server-filesystem'], env: {} },
  { name: 'github', command: 'npx', args: ['-y', '@anthropic-ai/mcp-server-github'], env: { GITHUB_TOKEN: '***' } },
  { name: 'postgres', command: 'npx', args: ['-y', '@anthropic-ai/mcp-server-postgres'], env: { DATABASE_URL: '***' } },
];

const mcpTools: Record<string, McpTool[]> = {
  filesystem: [
    { name: 'read_file', description: 'Read a file from the filesystem', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path to read' } }, required: ['path'] } },
    { name: 'write_file', description: 'Write content to a file', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path' }, content: { type: 'string', description: 'Content to write' } }, required: ['path', 'content'] } },
    { name: 'list_directory', description: 'List contents of a directory', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Directory path' } }, required: ['path'] } },
  ],
  github: [
    { name: 'create_pull_request', description: 'Create a new pull request', inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, head: { type: 'string' }, base: { type: 'string' } }, required: ['title', 'head', 'base'] } },
    { name: 'list_issues', description: 'List repository issues', inputSchema: { type: 'object', properties: { state: { type: 'string', description: 'open, closed, or all' } }, required: [] } },
    { name: 'get_file_contents', description: 'Get file contents from a repository', inputSchema: { type: 'object', properties: { path: { type: 'string' }, ref: { type: 'string', description: 'Branch or commit SHA' } }, required: ['path'] } },
  ],
  postgres: [
    { name: 'query', description: 'Execute a SQL query', inputSchema: { type: 'object', properties: { sql: { type: 'string', description: 'SQL query to execute' } }, required: ['sql'] } },
    { name: 'list_tables', description: 'List all tables in the database', inputSchema: { type: 'object', properties: {}, required: [] } },
    { name: 'describe_table', description: 'Get schema of a table', inputSchema: { type: 'object', properties: { table: { type: 'string', description: 'Table name' } }, required: ['table'] } },
  ],
};

// ─── Fake File System ────────────────────────────────────────

const fakeDirs: Record<string, FileEntry[]> = {
  '/Users/demo/projects/ecommerce-api': [
    { name: 'src', path: '/Users/demo/projects/ecommerce-api/src', isDirectory: true },
    { name: 'tests', path: '/Users/demo/projects/ecommerce-api/tests', isDirectory: true },
    { name: 'prisma', path: '/Users/demo/projects/ecommerce-api/prisma', isDirectory: true },
    { name: 'package.json', path: '/Users/demo/projects/ecommerce-api/package.json', isDirectory: false },
    { name: 'tsconfig.json', path: '/Users/demo/projects/ecommerce-api/tsconfig.json', isDirectory: false },
    { name: 'README.md', path: '/Users/demo/projects/ecommerce-api/README.md', isDirectory: false },
  ],
  '/Users/demo/projects/ecommerce-api/src': [
    { name: 'middleware', path: '/Users/demo/projects/ecommerce-api/src/middleware', isDirectory: true },
    { name: 'services', path: '/Users/demo/projects/ecommerce-api/src/services', isDirectory: true },
    { name: 'webhooks', path: '/Users/demo/projects/ecommerce-api/src/webhooks', isDirectory: true },
    { name: 'index.ts', path: '/Users/demo/projects/ecommerce-api/src/index.ts', isDirectory: false },
    { name: 'app.ts', path: '/Users/demo/projects/ecommerce-api/src/app.ts', isDirectory: false },
  ],
  '/Users/demo/projects/mobile-app': [
    { name: 'src', path: '/Users/demo/projects/mobile-app/src', isDirectory: true },
    { name: 'assets', path: '/Users/demo/projects/mobile-app/assets', isDirectory: true },
    { name: 'app.json', path: '/Users/demo/projects/mobile-app/app.json', isDirectory: false },
    { name: 'package.json', path: '/Users/demo/projects/mobile-app/package.json', isDirectory: false },
  ],
  '/Users/demo/projects/design-system': [
    { name: 'src', path: '/Users/demo/projects/design-system/src', isDirectory: true },
    { name: 'stories', path: '/Users/demo/projects/design-system/stories', isDirectory: true },
    { name: 'package.json', path: '/Users/demo/projects/design-system/package.json', isDirectory: false },
    { name: 'tsconfig.json', path: '/Users/demo/projects/design-system/tsconfig.json', isDirectory: false },
  ],
  '/Users/demo/projects/internal-tools': [
    { name: 'src', path: '/Users/demo/projects/internal-tools/src', isDirectory: true },
    { name: 'public', path: '/Users/demo/projects/internal-tools/public', isDirectory: true },
    { name: 'package.json', path: '/Users/demo/projects/internal-tools/package.json', isDirectory: false },
    { name: 'vite.config.ts', path: '/Users/demo/projects/internal-tools/vite.config.ts', isDirectory: false },
  ],
};

const fakeFileContent = `// Demo file content
import { useState } from 'react';

export const Component = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
};
`;


// ─── Register Demo IPC Handlers ──────────────────────────────

let nextId = 100;
let peonMuted = false;

const broadcastFakeStates = (): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    for (const [sessionId, state] of Object.entries(fakeStates)) {
      win.webContents.send(IPC_CHANNELS.SESSIONS_STATE_UPDATE, sessionId, {
        state,
        since: Date.now(),
      });
    }
  }
};

export const registerDemoHandlers = (): void => {
  // Suppress real state broadcasts from PTY — we use static fake states
  suppressStateBroadcast(true);

  // Once window is ready, send fake states
  const waitForWindow = setInterval(() => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      // Small delay to let renderer initialize stores
      setTimeout(() => broadcastFakeStates(), 1500);
      clearInterval(waitForWindow);
    }
  }, 200);

  // Projects
  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST, () => projects);

  ipcMain.handle(IPC_CHANNELS.PROJECTS_ADD, (_e, data: { name: string; path: string }) => {
    const p: Project = { id: `demo-new-${nextId++}`, name: data.name, path: data.path, createdAt: Date.now() };
    projects.push(p);
    trackedPaths[p.id] = [p.path];
    return p;
  });

  ipcMain.handle(IPC_CHANNELS.PROJECTS_REMOVE, (_e, id: string) => {
    const idx = projects.findIndex(p => p.id === id);
    if (idx >= 0) projects.splice(idx, 1);
  });

  // Sessions — real PTY spawning claude in DEMO_CWD
  ipcMain.handle(IPC_CHANNELS.SESSIONS_LIST, (_e, projectId: string) =>
    sessions.filter(s => s.projectId === projectId),
  );

  ipcMain.handle(IPC_CHANNELS.SESSIONS_CREATE, (_e, projectId: string, name: string) => {
    const s: Session = {
      id: `demo-new-s${nextId++}`, projectId, name,
      status: 'running', claudeSessionId: null, createdAt: Date.now(),
    };
    sessions.push(s);
    createPtySession(s.id, DEMO_CWD, name);
    return s;
  });

  ipcMain.handle(IPC_CHANNELS.SESSIONS_STOP, (_e, sessionId: string) => {
    const s = sessions.find(x => x.id === sessionId);
    if (s) s.status = 'stopped';
    stopSession(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSIONS_ATTACH, (event, sessionId: string) => {
    if (!isSessionRunning(sessionId)) {
      const s = sessions.find(x => x.id === sessionId);
      if (s) {
        s.status = 'running';
        respawnSession(sessionId, DEMO_CWD, s.name, s.claudeSessionId || null);
      }
    }
    const windowId = event.sender.id;
    return attachSession(sessionId, windowId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSIONS_DETACH, (event, sessionId: string) => {
    const windowId = event.sender.id;
    detachSession(sessionId, windowId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSIONS_INPUT, (_e, sessionId: string, data: string) => {
    sendInput(sessionId, data);
  });

  ipcMain.handle(IPC_CHANNELS.SESSIONS_RENAME, (_e, sessionId: string, name: string) => {
    const s = sessions.find(x => x.id === sessionId);
    if (s) s.name = name;
  });

  ipcMain.handle(IPC_CHANNELS.SESSIONS_DELETE, (_e, sessionId: string) => {
    deleteSessionLogs(sessionId);
    stopSession(sessionId);
    const idx = sessions.findIndex(x => x.id === sessionId);
    if (idx >= 0) sessions.splice(idx, 1);
  });

  // Project tracking
  ipcMain.handle(IPC_CHANNELS.PROJECTS_TRACK_REPO, (_e, projectId: string, dirPath: string) => {
    if (!trackedPaths[projectId]) trackedPaths[projectId] = [];
    if (!trackedPaths[projectId].includes(dirPath)) trackedPaths[projectId].push(dirPath);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECTS_UNTRACK_REPO, (_e, projectId: string, dirPath: string) => {
    if (trackedPaths[projectId]) {
      trackedPaths[projectId] = trackedPaths[projectId].filter(p => p !== dirPath);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECTS_TRACKED_PATHS, (_e, projectId: string) =>
    trackedPaths[projectId] || [],
  );

  // Git
  ipcMain.handle(IPC_CHANNELS.GIT_BRANCH, (_e, dirPath: string) =>
    gitCurrentBranch[dirPath] || null,
  );

  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, (_e, dirPath: string) =>
    gitStatuses[dirPath] || { dirty: false, staged: 0, unstaged: 0, untracked: 0 },
  );

  ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, (_e, dirPath: string) =>
    gitBranches[dirPath] || [],
  );

  ipcMain.handle(IPC_CHANNELS.GIT_CHECKOUT, (_e, dirPath: string, branch: string) => {
    gitCurrentBranch[dirPath] = branch;
  });

  ipcMain.handle(IPC_CHANNELS.GIT_FETCH, async () => {
    await new Promise(r => setTimeout(r, 500));
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.GIT_PULL, async () => {
    await new Promise(r => setTimeout(r, 500));
    return { success: true, output: 'Already up to date.' };
  });

  // Peon
  ipcMain.handle(IPC_CHANNELS.PEON_IS_MUTED, () => peonMuted);
  ipcMain.handle(IPC_CHANNELS.PEON_TOGGLE_MUTE, () => { peonMuted = !peonMuted; return peonMuted; });

  // File system
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, () =>
    '/Users/demo/projects/new-project',
  );

  ipcMain.handle(IPC_CHANNELS.FS_READDIR, (_e, dirPath: string) =>
    fakeDirs[dirPath] || [],
  );

  ipcMain.handle(IPC_CHANNELS.FS_READDIR_RECURSIVE, (_e, rootPath: string) => {
    const result: FileEntry[] = [];
    const walk = (dir: string): void => {
      const entries = fakeDirs[dir];
      if (!entries) return;
      for (const entry of entries) {
        if (entry.isDirectory) {
          walk(entry.path);
        } else {
          result.push({ ...entry, name: entry.path.replace(rootPath + '/', '') });
        }
      }
    };
    walk(rootPath);
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.FS_READFILE, () => fakeFileContent);

  // Terminals
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, () => `demo-term-${nextId++}`);
  ipcMain.handle(IPC_CHANNELS.TERMINAL_DESTROY, () => {});
  ipcMain.handle(IPC_CHANNELS.TERMINAL_INPUT, () => {});
  ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, () => {});
  ipcMain.handle(IPC_CHANNELS.TERMINAL_ATTACH, () => [
    '\x1b[1;32mdemo\x1b[0m@\x1b[1;34mmacbook\x1b[0m \x1b[1;36m~/projects\x1b[0m\r\n$ ',
  ]);
  ipcMain.handle(IPC_CHANNELS.TERMINAL_DETACH, () => {});

  // Commands
  ipcMain.handle(IPC_CHANNELS.COMMANDS_LIST, (_e, projectId: string) =>
    commands.filter(c => c.projectId === projectId).sort((a, b) => a.order - b.order),
  );

  ipcMain.handle(IPC_CHANNELS.COMMANDS_ADD, (_e, projectId: string, name: string, command: string) => {
    const existing = commands.filter(c => c.projectId === projectId);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(c => c.order)) : -1;
    const cmd: Command = { id: `demo-cmd-${nextId++}`, projectId, name, command, order: maxOrder + 1, createdAt: Date.now() };
    commands.push(cmd);
    return cmd;
  });

  ipcMain.handle(IPC_CHANNELS.COMMANDS_UPDATE, (_e, id: string, data: { name?: string; command?: string }) => {
    const cmd = commands.find(c => c.id === id);
    if (!cmd) throw new Error(`Command ${id} not found`);
    if (data.name !== undefined) cmd.name = data.name;
    if (data.command !== undefined) cmd.command = data.command;
    return cmd;
  });

  ipcMain.handle(IPC_CHANNELS.COMMANDS_REMOVE, (_e, id: string) => {
    const idx = commands.findIndex(c => c.id === id);
    if (idx >= 0) commands.splice(idx, 1);
  });

  ipcMain.handle(IPC_CHANNELS.COMMANDS_REORDER, (_e, projectId: string, orderedIds: string[]) => {
    for (const cmd of commands) {
      if (cmd.projectId === projectId) {
        const idx = orderedIds.indexOf(cmd.id);
        if (idx >= 0) cmd.order = idx;
      }
    }
  });

  // Claude
  ipcMain.handle(IPC_CHANNELS.CLAUDE_SKILLS, () => skills);
  ipcMain.handle(IPC_CHANNELS.CLAUDE_AGENTS, () => agents);
  ipcMain.handle(IPC_CHANNELS.CLAUDE_MCP_SERVERS, () => mcpServers);

  ipcMain.handle(IPC_CHANNELS.CLAUDE_MCP_LIST_TOOLS, (_e, command: string, args: string[]) => {
    // Match server by args (e.g. contains "filesystem", "github", "postgres")
    const key = args.join(' ');
    if (key.includes('filesystem')) return mcpTools.filesystem;
    if (key.includes('github')) return mcpTools.github;
    if (key.includes('postgres')) return mcpTools.postgres;
    return mcpTools.filesystem; // fallback
  });
};

export const cleanupDemo = (): void => {
  cleanupAllSessions();
};
