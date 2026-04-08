import { create } from 'zustand';
import { SkillInfo, AgentInfo, McpServerConfig, OpenFile } from '@shared/types';

interface ClaudeState {
  claudePanelOpen: boolean;
  toggleClaudePanel: () => void;
  skills: SkillInfo[];
  agents: AgentInfo[];
  mcpServers: McpServerConfig[];
  loading: boolean;
  loadClaudeData: (projectPath: string | null) => Promise<void>;
  selectedMcpServer: McpServerConfig | null;
  setSelectedMcpServer: (server: McpServerConfig | null) => void;
  openFiles: OpenFile[];
  activeFilePath: string | null;
  openFile: (filePath: string, name: string) => Promise<void>;
  closeFile: (filePath: string) => void;
  setActiveFile: (filePath: string) => void;
}

export const useClaudeStore = create<ClaudeState>((set, get) => ({
  claudePanelOpen: false,
  skills: [],
  agents: [],
  mcpServers: [],
  loading: false,
  selectedMcpServer: null,
  openFiles: [],
  activeFilePath: null,

  toggleClaudePanel: () => {
    set((state) => ({ claudePanelOpen: !state.claudePanelOpen }));
  },

  loadClaudeData: async (projectPath) => {
    set({ loading: true });
    const [skills, agents, mcpServers] = await Promise.all([
      window.api.listSkills(projectPath),
      window.api.listAgents(projectPath),
      window.api.listMcpServers(projectPath),
    ]);
    set({ skills, agents, mcpServers, loading: false });
  },

  setSelectedMcpServer: (server) => {
    set({ selectedMcpServer: server });
  },

  openFile: async (filePath, name) => {
    const { openFiles } = get();
    if (openFiles.some((f) => f.path === filePath)) {
      set({ activeFilePath: filePath });
      return;
    }
    const content = await window.api.readFile(filePath);
    set({
      openFiles: [...openFiles, { path: filePath, name, content }],
      activeFilePath: filePath,
    });
  },

  closeFile: (filePath) => {
    const { openFiles, activeFilePath } = get();
    const filtered = openFiles.filter((f) => f.path !== filePath);
    let newActive = activeFilePath;
    if (activeFilePath === filePath) {
      newActive = filtered.length > 0 ? filtered[filtered.length - 1].path : null;
    }
    set({ openFiles: filtered, activeFilePath: newActive });
  },

  setActiveFile: (filePath) => {
    set({ activeFilePath: filePath });
  },
}));
