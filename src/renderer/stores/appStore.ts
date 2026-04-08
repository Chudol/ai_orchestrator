import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Project, Session, SessionStateInfo, OpenFile, OpenTerminal, TrackedRepoInfo } from '@shared/types';

interface AppState {
  projects: Project[];
  sessions: Map<string, Session[]>;
  activeSessionId: string | null;
  loadProjects: () => Promise<void>;
  addProject: (name: string, path: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  createSession: (projectId: string, name: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setActiveSession: (sessionId: string | null) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  updateSessionStatus: (sessionId: string, status: Session['status']) => void;
  sessionStates: Map<string, SessionStateInfo>;
  updateSessionState: (sessionId: string, info: SessionStateInfo) => void;
  sessionClaudeIds: Map<string, string>;
  updateSessionClaudeId: (sessionId: string, claudeId: string) => void;
  fileBrowserOpen: boolean;
  toggleFileBrowser: () => void;
  projectFiles: Map<string, { files: OpenFile[]; activeFilePath: string | null }>;
  openFile: (filePath: string, name: string) => Promise<void>;
  closeFile: (filePath: string) => void;
  setActiveFile: (filePath: string) => void;
  projectTerminals: Map<string, OpenTerminal[]>;
  trackedRepos: Map<string, TrackedRepoInfo[]>;
  trackRepo: (dirPath: string) => Promise<void>;
  untrackRepo: (dirPath: string) => Promise<void>;
  refreshTrackedRepoBranches: () => Promise<void>;
  activeBottomTab: { type: 'file'; path: string } | { type: 'terminal'; id: string } | null;
  setActiveBottomTab: (tab: { type: 'file'; path: string } | { type: 'terminal'; id: string } | null) => void;
  createTerminalTab: () => Promise<void>;
  closeTerminalTab: (terminalId: string) => Promise<void>;
  splitTerminal: (terminalTabId: string) => Promise<void>;
  closeTerminalPane: (terminalTabId: string, paneId: string) => Promise<void>;
}

const findProjectIdForSession = (
  sessionId: string | null,
  sessions: Map<string, Session[]>,
): string | null => {
  if (!sessionId) return null;
  for (const [projectId, list] of sessions) {
    if (list.some((s) => s.id === sessionId)) return projectId;
  }
  return null;
};

const EMPTY_FILES: OpenFile[] = [];
const EMPTY_TERMINALS: OpenTerminal[] = [];

// Selector hooks for derived state
export const useActiveProjectId = (): string | null => {
  return useAppStore((s) => findProjectIdForSession(s.activeSessionId, s.sessions));
};

export const useActiveProjectPath = (): string | null => {
  return useAppStore((s) => {
    const projectId = findProjectIdForSession(s.activeSessionId, s.sessions);
    if (!projectId) return null;
    return s.projects.find((p) => p.id === projectId)?.path ?? null;
  });
};

export const useActiveOpenFiles = (): OpenFile[] => {
  return useAppStore(
    useShallow((s) => {
      const projectId = findProjectIdForSession(s.activeSessionId, s.sessions);
      if (!projectId) return EMPTY_FILES;
      return s.projectFiles.get(projectId)?.files ?? EMPTY_FILES;
    }),
  );
};

export const useActiveTerminals = (): OpenTerminal[] => {
  return useAppStore(
    useShallow((s) => {
      const projectId = findProjectIdForSession(s.activeSessionId, s.sessions);
      if (!projectId) return EMPTY_TERMINALS;
      return s.projectTerminals.get(projectId) ?? EMPTY_TERMINALS;
    }),
  );
};

const EMPTY_TRACKED: TrackedRepoInfo[] = [];

export const useActiveTrackedRepos = (): TrackedRepoInfo[] => {
  return useAppStore(
    useShallow((s) => {
      const projectId = findProjectIdForSession(s.activeSessionId, s.sessions);
      if (!projectId) return EMPTY_TRACKED;
      return s.trackedRepos.get(projectId) ?? EMPTY_TRACKED;
    }),
  );
};

export const useActiveFilePath = (): string | null => {
  return useAppStore((s) => {
    const projectId = findProjectIdForSession(s.activeSessionId, s.sessions);
    if (!projectId) return null;
    return s.projectFiles.get(projectId)?.activeFilePath ?? null;
  });
};

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  sessions: new Map(),
  activeSessionId: null,
  sessionStates: new Map(),
  sessionClaudeIds: new Map(),
  trackedRepos: new Map(),
  fileBrowserOpen: false,
  projectFiles: new Map(),
  projectTerminals: new Map(),
  activeBottomTab: null,

  loadProjects: async () => {
    const projects = await window.api.listProjects();
    const sessions = new Map<string, Session[]>();
    for (const project of projects) {
      const projectSessions = await window.api.listSessions(project.id);
      sessions.set(project.id, projectSessions);
    }
    const trackedRepos = new Map<string, TrackedRepoInfo[]>();
    for (const project of projects) {
      const rootRepo: TrackedRepoInfo = {
        path: project.path,
        folderName: project.name,
        branch: await window.api.getGitBranch(project.path),
      };
      const userPaths = await window.api.getTrackedRepoPaths(project.id);
      const userRepos = await Promise.all(
        userPaths.map(async (p) => ({
          path: p,
          folderName: p.split('/').pop() ?? p,
          branch: await window.api.getGitBranch(p),
        })),
      );
      trackedRepos.set(project.id, [rootRepo, ...userRepos]);
    }
    set({ projects, sessions, trackedRepos });
  },

  addProject: async (name, path) => {
    const project = await window.api.addProject({ name, path });
    const branch = await window.api.getGitBranch(project.path);
    set((state) => {
      const trackedRepos = new Map(state.trackedRepos);
      trackedRepos.set(project.id, [{ path: project.path, folderName: project.name, branch }]);
      return {
        projects: [...state.projects, project],
        sessions: new Map(state.sessions).set(project.id, []),
        trackedRepos,
      };
    });
  },

  removeProject: async (id) => {
    await window.api.removeProject(id);
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.delete(id);
      const trackedRepos = new Map(state.trackedRepos);
      trackedRepos.delete(id);
      return {
        projects: state.projects.filter((p) => p.id !== id),
        sessions,
        trackedRepos,
      };
    });
  },

  createSession: async (projectId, name) => {
    const session = await window.api.createSession(projectId, name);
    set((state) => {
      const sessions = new Map(state.sessions);
      const existing = sessions.get(projectId) ?? [];
      sessions.set(projectId, [...existing, session]);
      return { sessions };
    });
  },

  stopSession: async (sessionId) => {
    await window.api.stopSession(sessionId);
    const { sessions } = get();
    const updated = new Map(sessions);
    for (const [projectId, list] of updated) {
      updated.set(
        projectId,
        list.map((s) => (s.id === sessionId ? { ...s, status: 'stopped' as const } : s)),
      );
    }
    set({ sessions: updated });
  },

  deleteSession: async (sessionId) => {
    await window.api.deleteSession(sessionId);
    const { sessions, activeSessionId } = get();
    const updated = new Map(sessions);
    for (const [projectId, list] of updated) {
      updated.set(projectId, list.filter((s) => s.id !== sessionId));
    }
    set({
      sessions: updated,
      activeSessionId: activeSessionId === sessionId ? null : activeSessionId,
    });
  },

  setActiveSession: async (sessionId) => {
    const { activeSessionId } = get();
    if (activeSessionId) {
      await window.api.detachSession(activeSessionId);
    }
    if (sessionId) {
      await window.api.attachSession(sessionId);
      // After attach (which may respawn), mark session as running
      const { sessions } = get();
      const updated = new Map(sessions);
      for (const [projectId, list] of updated) {
        updated.set(
          projectId,
          list.map((s) => (s.id === sessionId ? { ...s, status: 'running' as const } : s)),
        );
      }
      set({ activeSessionId: sessionId, sessions: updated });
      get().refreshTrackedRepoBranches();
    } else {
      set({ activeSessionId: sessionId });
    }
  },

  renameSession: async (sessionId, name) => {
    await window.api.renameSession(sessionId, name);
    const { sessions } = get();
    const updated = new Map(sessions);
    for (const [projectId, list] of updated) {
      updated.set(
        projectId,
        list.map((s) => (s.id === sessionId ? { ...s, name } : s)),
      );
    }
    set({ sessions: updated });
  },

  trackRepo: async (dirPath) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    await window.api.trackRepo(projectId, dirPath);
    const branch = await window.api.getGitBranch(dirPath);
    const trackedRepos = new Map(get().trackedRepos);
    const existing = trackedRepos.get(projectId) ?? [];
    trackedRepos.set(projectId, [
      ...existing,
      { path: dirPath, folderName: dirPath.split('/').pop() ?? dirPath, branch },
    ]);
    set({ trackedRepos });
  },

  untrackRepo: async (dirPath) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    await window.api.untrackRepo(projectId, dirPath);
    const trackedRepos = new Map(get().trackedRepos);
    const existing = trackedRepos.get(projectId) ?? [];
    trackedRepos.set(projectId, existing.filter((r) => r.path !== dirPath));
    set({ trackedRepos });
  },

  refreshTrackedRepoBranches: async () => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const repos = get().trackedRepos.get(projectId);
    if (!repos || repos.length === 0) return;
    const updated = await Promise.all(
      repos.map(async (r) => ({
        ...r,
        branch: await window.api.getGitBranch(r.path),
      })),
    );
    const trackedRepos = new Map(get().trackedRepos);
    trackedRepos.set(projectId, updated);
    set({ trackedRepos });
  },

  toggleFileBrowser: () => {
    set((state) => ({ fileBrowserOpen: !state.fileBrowserOpen }));
  },

  openFile: async (filePath, name) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const pf = get().projectFiles.get(projectId) ?? { files: [], activeFilePath: null };
    if (pf.files.some((f) => f.path === filePath)) {
      const updated = new Map(get().projectFiles);
      updated.set(projectId, { ...pf, activeFilePath: filePath });
      set({ projectFiles: updated, activeBottomTab: { type: 'file', path: filePath } });
      return;
    }
    const content = await window.api.readFile(filePath);
    const updated = new Map(get().projectFiles);
    updated.set(projectId, {
      files: [...pf.files, { path: filePath, name, content }],
      activeFilePath: filePath,
    });
    set({ projectFiles: updated, activeBottomTab: { type: 'file', path: filePath } });
  },

  closeFile: (filePath) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const pf = get().projectFiles.get(projectId);
    if (!pf) return;
    const filtered = pf.files.filter((f) => f.path !== filePath);
    let newActive = pf.activeFilePath;
    if (pf.activeFilePath === filePath) {
      newActive = filtered.length > 0 ? filtered[filtered.length - 1].path : null;
    }
    const updated = new Map(get().projectFiles);
    updated.set(projectId, { files: filtered, activeFilePath: newActive });
    set({ projectFiles: updated });
  },

  setActiveFile: (filePath) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const pf = get().projectFiles.get(projectId);
    if (!pf) return;
    const updated = new Map(get().projectFiles);
    updated.set(projectId, { ...pf, activeFilePath: filePath });
    set({ projectFiles: updated, activeBottomTab: { type: 'file', path: filePath } });
  },

  setActiveBottomTab: (tab) => {
    set({ activeBottomTab: tab });
  },

  createTerminalTab: async () => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const paneId = await window.api.createTerminal(project.path);
    const terminals = get().projectTerminals.get(projectId) ?? [];
    const tabId = `tab-${Date.now()}`;
    const name = `Terminal ${terminals.length + 1}`;
    const updated = new Map(get().projectTerminals);
    updated.set(projectId, [...terminals, { id: tabId, name, panes: [{ id: paneId }] }]);
    set({ projectTerminals: updated, activeBottomTab: { type: 'terminal', id: tabId } });
  },

  splitTerminal: async (terminalTabId) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const paneId = await window.api.createTerminal(project.path);
    const terminals = get().projectTerminals.get(projectId) ?? [];
    const updated = new Map(get().projectTerminals);
    updated.set(projectId, terminals.map((t) =>
      t.id === terminalTabId ? { ...t, panes: [...t.panes, { id: paneId }] } : t,
    ));
    set({ projectTerminals: updated });
  },

  closeTerminalPane: async (terminalTabId, paneId) => {
    await window.api.destroyTerminal(paneId);
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const terminals = get().projectTerminals.get(projectId) ?? [];
    const tab = terminals.find((t) => t.id === terminalTabId);
    if (!tab) return;
    const remainingPanes = tab.panes.filter((p) => p.id !== paneId);
    const updated = new Map(get().projectTerminals);
    if (remainingPanes.length === 0) {
      // Last pane closed - remove whole tab
      updated.set(projectId, terminals.filter((t) => t.id !== terminalTabId));
      const { activeBottomTab } = get();
      const needSwitch = activeBottomTab?.type === 'terminal' && activeBottomTab.id === terminalTabId;
      set({ projectTerminals: updated, activeBottomTab: needSwitch ? null : activeBottomTab });
    } else {
      updated.set(projectId, terminals.map((t) =>
        t.id === terminalTabId ? { ...t, panes: remainingPanes } : t,
      ));
      set({ projectTerminals: updated });
    }
  },

  closeTerminalTab: async (terminalTabId) => {
    const projectId = findProjectIdForSession(get().activeSessionId, get().sessions);
    if (!projectId) return;
    const terminals = get().projectTerminals.get(projectId) ?? [];
    const tab = terminals.find((t) => t.id === terminalTabId);
    if (tab) {
      for (const pane of tab.panes) {
        await window.api.destroyTerminal(pane.id);
      }
    }
    const filtered = terminals.filter((t) => t.id !== terminalTabId);
    const updated = new Map(get().projectTerminals);
    updated.set(projectId, filtered);
    const { activeBottomTab } = get();
    const needSwitch = activeBottomTab?.type === 'terminal' && activeBottomTab.id === terminalTabId;
    set({
      projectTerminals: updated,
      activeBottomTab: needSwitch
        ? (filtered.length > 0 ? { type: 'terminal', id: filtered[filtered.length - 1].id } : null)
        : activeBottomTab,
    });
  },

  updateSessionState: (sessionId, info) => {
    const updated = new Map(get().sessionStates);
    updated.set(sessionId, info);
    set({ sessionStates: updated });
  },

  updateSessionClaudeId: (sessionId, claudeId) => {
    const updated = new Map(get().sessionClaudeIds);
    updated.set(sessionId, claudeId);
    set({ sessionClaudeIds: updated });
  },

  updateSessionStatus: (sessionId, status) => {
    const { sessions } = get();
    const updated = new Map(sessions);
    for (const [projectId, list] of updated) {
      updated.set(
        projectId,
        list.map((s) => (s.id === sessionId ? { ...s, status } : s)),
      );
    }
    set({ sessions: updated });
  },
}));
