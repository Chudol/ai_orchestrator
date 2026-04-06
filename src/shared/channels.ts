export const IPC_CHANNELS = {
  PROJECTS_LIST: 'projects:list',
  PROJECTS_ADD: 'projects:add',
  PROJECTS_REMOVE: 'projects:remove',
  SESSIONS_LIST: 'sessions:list',
  SESSIONS_CREATE: 'sessions:create',
  SESSIONS_STOP: 'sessions:stop',
  SESSIONS_ATTACH: 'sessions:attach',
  SESSIONS_DETACH: 'sessions:detach',
  SESSIONS_INPUT: 'sessions:input',
  SESSIONS_RENAME: 'sessions:rename',
  SESSIONS_DELETE: 'sessions:delete',
  SESSIONS_OUTPUT: 'sessions:output',
  SESSIONS_EXIT: 'sessions:exit',
  SESSIONS_STATE_UPDATE: 'sessions:state-update',
  DIALOG_SELECT_DIRECTORY: 'dialog:select-directory',
  FS_READDIR: 'fs:readdir',
  FS_READFILE: 'fs:readfile',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
