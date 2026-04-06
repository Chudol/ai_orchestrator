import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Project, Session, SessionStateInfo, OpenFile } from '@shared/types';

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
  fileBrowserOpen: boolean;
  toggleFileBrowser: () => void;
  projectFiles: Map<string, { files: OpenFile[]; activeFilePath: string | null }>;
  openFile: (filePath: string, name: string) => Promise<void>;
  closeFile: (filePath: string) => void;
  setActiveFile: (filePath: string) => void;
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
  fileBrowserOpen: false,
  projectFiles: new Map(),

  loadProjects: async () => {
    const projects = await window.api.listProjects();
    const sessions = new Map<string, Session[]>();
    for (const project of projects) {
      const projectSessions = await window.api.listSessions(project.id);
      sessions.set(project.id, projectSessions);
    }
    set({ projects, sessions });
  },

  addProject: async (name, path) => {
    const project = await window.api.addProject({ name, path });
    set((state) => ({
      projects: [...state.projects, project],
      sessions: new Map(state.sessions).set(project.id, []),
    }));
  },

  removeProject: async (id) => {
    await window.api.removeProject(id);
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.delete(id);
      return {
        projects: state.projects.filter((p) => p.id !== id),
        sessions,
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
      set({ projectFiles: updated });
      return;
    }
    const content = await window.api.readFile(filePath);
    const updated = new Map(get().projectFiles);
    updated.set(projectId, {
      files: [...pf.files, { path: filePath, name, content }],
      activeFilePath: filePath,
    });
    set({ projectFiles: updated });
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
    set({ projectFiles: updated });
  },

  updateSessionState: (sessionId, info) => {
    const updated = new Map(get().sessionStates);
    updated.set(sessionId, info);
    set({ sessionStates: updated });
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
