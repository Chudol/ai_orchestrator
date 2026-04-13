import { create } from 'zustand';
import { StatusOption } from '@shared/types';

interface SettingsState {
  settingsPanelOpen: boolean;
  toggleSettingsPanel: () => void;
  patchNotesPanelOpen: boolean;
  togglePatchNotesPanel: () => void;
  statusOptions: StatusOption[];
  sessionUserStatuses: Map<string, string>; // sessionId -> statusOptionId
  loadSettings: () => Promise<void>;
  setStatusOptions: (options: StatusOption[]) => Promise<void>;
  setSessionUserStatus: (sessionId: string, statusId: string | null) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settingsPanelOpen: false,
  patchNotesPanelOpen: false,
  statusOptions: [],
  sessionUserStatuses: new Map(),

  toggleSettingsPanel: () => {
    set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen }));
  },

  togglePatchNotesPanel: () => {
    set((state) => ({ patchNotesPanelOpen: !state.patchNotesPanelOpen }));
  },

  loadSettings: async () => {
    const [options, statuses] = await Promise.all([
      window.api.getStatusOptions(),
      window.api.getAllSessionUserStatuses(),
    ]);
    set({
      statusOptions: options,
      sessionUserStatuses: new Map(Object.entries(statuses)),
    });
  },

  setStatusOptions: async (options) => {
    await window.api.setStatusOptions(options);
    set({ statusOptions: options });
  },

  setSessionUserStatus: async (sessionId, statusId) => {
    await window.api.setSessionUserStatus(sessionId, statusId);
    const updated = new Map(get().sessionUserStatuses);
    if (statusId === null) {
      updated.delete(sessionId);
    } else {
      updated.set(sessionId, statusId);
    }
    set({ sessionUserStatuses: updated });
  },
}));
