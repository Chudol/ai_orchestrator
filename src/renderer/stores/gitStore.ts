import { create } from 'zustand';

interface GitState {
  gitPanelOpen: boolean;
  toggleGitPanel: () => void;
}

export const useGitStore = create<GitState>((set) => ({
  gitPanelOpen: false,

  toggleGitPanel: () => {
    set((state) => ({ gitPanelOpen: !state.gitPanelOpen }));
  },
}));
