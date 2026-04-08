import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Command, GLOBAL_PROJECT_ID } from '@shared/types';
import { useAppStore } from './appStore';

export interface PendingExecution {
  commandTemplate: string;
  variables: string[];
  paneId: string | null; // null = new terminal
}

interface CommandsState {
  commandsPanelOpen: boolean;
  projectCommands: Map<string, Command[]>;
  pendingExecution: PendingExecution | null;
  toggleCommandsPanel: () => void;
  loadCommands: (projectId: string) => Promise<void>;
  addCommand: (projectId: string, name: string, command: string) => Promise<void>;
  updateCommand: (projectId: string, id: string, data: { name?: string; command?: string }) => Promise<void>;
  removeCommand: (projectId: string, id: string) => Promise<void>;
  requestExecution: (command: string, paneId: string | null) => void;
  confirmExecution: (values: Record<string, string>) => Promise<void>;
  cancelExecution: () => void;
}

export const parseVariables = (command: string): string[] => {
  const matches = command.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  const vars = matches.map((m) => m.slice(1, -1));
  return [...new Set(vars)];
};

const substituteVariables = (command: string, values: Record<string, string>): string => {
  return command.replace(/\{([^}]+)\}/g, (_, name) => values[name] ?? '');
};

const getActiveProjectId = (): string | null => {
  const { activeSessionId, sessions } = useAppStore.getState();
  if (!activeSessionId) return null;
  for (const [projectId, list] of sessions) {
    if (list.some((s) => s.id === activeSessionId)) return projectId;
  }
  return null;
};

const EMPTY_COMMANDS: Command[] = [];

export const useActiveCommands = (): Command[] => {
  return useCommandsStore(
    useShallow((s) => {
      const projectId = getActiveProjectId();
      if (!projectId) return EMPTY_COMMANDS;
      return s.projectCommands.get(projectId) ?? EMPTY_COMMANDS;
    }),
  );
};

export const useGlobalCommands = (): Command[] => {
  return useCommandsStore(
    useShallow((s) => s.projectCommands.get(GLOBAL_PROJECT_ID) ?? EMPTY_COMMANDS),
  );
};

const executeInPane = async (command: string, paneId: string): Promise<void> => {
  await window.api.terminalInput(paneId, command + '\n');
};

const executeInNewTerminal = async (command: string): Promise<void> => {
  const appStore = useAppStore.getState();
  await appStore.createTerminalTab();
  const projectId = getActiveProjectId();
  if (!projectId) return;
  const terminals = useAppStore.getState().projectTerminals.get(projectId) ?? [];
  const lastTerminal = terminals[terminals.length - 1];
  if (lastTerminal && lastTerminal.panes.length > 0) {
    await executeInPane(command, lastTerminal.panes[0].id);
  }
};

export const useCommandsStore = create<CommandsState>((set, get) => ({
  commandsPanelOpen: false,
  projectCommands: new Map(),
  pendingExecution: null,

  toggleCommandsPanel: () => {
    const opening = !get().commandsPanelOpen;
    if (opening) {
      const appState = useAppStore.getState();
      if (appState.fileBrowserOpen) {
        appState.toggleFileBrowser();
      }
      if (!get().projectCommands.has(GLOBAL_PROJECT_ID)) {
        get().loadCommands(GLOBAL_PROJECT_ID);
      }
      const projectId = getActiveProjectId();
      if (projectId && !get().projectCommands.has(projectId)) {
        get().loadCommands(projectId);
      }
    }
    set({ commandsPanelOpen: opening });
  },

  loadCommands: async (projectId) => {
    const commands = await window.api.listCommands(projectId);
    const updated = new Map(get().projectCommands);
    updated.set(projectId, commands);
    set({ projectCommands: updated });
  },

  addCommand: async (projectId, name, command) => {
    const cmd = await window.api.addCommand(projectId, name, command);
    const updated = new Map(get().projectCommands);
    const existing = updated.get(projectId) ?? [];
    updated.set(projectId, [...existing, cmd]);
    set({ projectCommands: updated });
  },

  updateCommand: async (projectId, id, data) => {
    const cmd = await window.api.updateCommand(id, data);
    const updated = new Map(get().projectCommands);
    const existing = updated.get(projectId) ?? [];
    updated.set(projectId, existing.map((c) => (c.id === id ? cmd : c)));
    set({ projectCommands: updated });
  },

  removeCommand: async (projectId, id) => {
    await window.api.removeCommand(id);
    const updated = new Map(get().projectCommands);
    const existing = updated.get(projectId) ?? [];
    updated.set(projectId, existing.filter((c) => c.id !== id));
    set({ projectCommands: updated });
  },

  requestExecution: (command, paneId) => {
    const variables = parseVariables(command);
    if (variables.length === 0) {
      if (paneId) {
        executeInPane(command, paneId);
      } else {
        executeInNewTerminal(command);
      }
    } else {
      set({ pendingExecution: { commandTemplate: command, variables, paneId } });
    }
  },

  confirmExecution: async (values) => {
    const pending = get().pendingExecution;
    if (!pending) return;
    const finalCommand = substituteVariables(pending.commandTemplate, values);
    set({ pendingExecution: null });
    if (pending.paneId) {
      await executeInPane(finalCommand, pending.paneId);
    } else {
      await executeInNewTerminal(finalCommand);
    }
  },

  cancelExecution: () => {
    set({ pendingExecution: null });
  },
}));

// Mutual exclusivity: close commands panel when file browser opens
useAppStore.subscribe((state) => {
  if (state.fileBrowserOpen && useCommandsStore.getState().commandsPanelOpen) {
    useCommandsStore.setState({ commandsPanelOpen: false });
  }
});
