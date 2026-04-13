import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { SkillInfo, AgentInfo, McpServerConfig, McpTool } from '@shared/types';

const GLOBAL_CLAUDE_DIR = path.join(os.homedir(), '.claude');

const parseFrontmatter = (content: string): Record<string, string> => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
};

const readSkillsFromDir = async (skillsDir: string, isGlobal: boolean): Promise<SkillInfo[]> => {
  const skills: SkillInfo[] = [];
  let entries;
  try {
    entries = await fs.promises.readdir(skillsDir, { withFileTypes: true });
  } catch {
    return skills;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    let skillFile: string;
    if (entry.isDirectory()) {
      skillFile = path.join(skillsDir, entry.name, 'skill.md');
    } else if (entry.name.endsWith('.md')) {
      skillFile = path.join(skillsDir, entry.name);
    } else {
      continue;
    }
    try {
      const content = await fs.promises.readFile(skillFile, 'utf-8');
      const fm = parseFrontmatter(content);
      skills.push({
        name: fm['name'] || entry.name.replace('.md', ''),
        description: fm['description'] || '',
        filePath: skillFile,
        isGlobal,
      });
    } catch {
      // skip unreadable skills
    }
  }
  return skills;
};

export const listSkills = async (projectPath: string | null): Promise<SkillInfo[]> => {
  const globalSkills = await readSkillsFromDir(path.join(GLOBAL_CLAUDE_DIR, 'skills'), true);
  let projectSkills: SkillInfo[] = [];
  if (projectPath) {
    projectSkills = await readSkillsFromDir(path.join(projectPath, '.claude', 'skills'), false);
  }
  return [...projectSkills, ...globalSkills];
};

const readAgentsFromDir = async (agentsDir: string): Promise<AgentInfo[]> => {
  const agents: AgentInfo[] = [];
  let entries;
  try {
    entries = await fs.promises.readdir(agentsDir, { withFileTypes: true });
  } catch {
    return agents;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || !entry.name.endsWith('.md')) continue;
    const filePath = path.join(agentsDir, entry.name);
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      agents.push({
        name: fm['name'] || entry.name.replace('.md', ''),
        description: fm['description'] || '',
        model: fm['model'] || '',
        filePath,
      });
    } catch {
      // skip
    }
  }
  return agents;
};

export const listAgents = async (projectPath: string | null): Promise<AgentInfo[]> => {
  if (!projectPath) return [];
  return readAgentsFromDir(path.join(projectPath, '.claude', 'agents'));
};

const readSettingsFile = async (filePath: string): Promise<Record<string, unknown>> => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const listMcpServers = async (projectPath: string | null): Promise<McpServerConfig[]> => {
  const servers: McpServerConfig[] = [];
  const seen = new Set<string>();

  const addServers = (mcpServers: Record<string, { command?: string; type?: string; args?: string[]; env?: Record<string, string> }> | undefined): void => {
    if (!mcpServers) return;
    for (const [name, config] of Object.entries(mcpServers)) {
      if (seen.has(name)) continue;
      seen.add(name);
      servers.push({
        name,
        command: config.command || '',
        args: config.args || [],
        env: config.env || {},
      });
    }
  };

  // Global: ~/.claude.json (main config)
  const globalConfig = await readSettingsFile(path.join(os.homedir(), '.claude.json'));
  addServers(globalConfig['mcpServers'] as Record<string, { command?: string; args?: string[]; env?: Record<string, string> }> | undefined);

  // Global: ~/.claude/settings.json
  const globalSettings = await readSettingsFile(path.join(GLOBAL_CLAUDE_DIR, 'settings.json'));
  addServers(globalSettings['mcpServers'] as Record<string, { command?: string; args?: string[]; env?: Record<string, string> }> | undefined);

  // Project: .mcp.json (Claude Code project MCP config)
  if (projectPath) {
    const mcpJson = await readSettingsFile(path.join(projectPath, '.mcp.json'));
    addServers(mcpJson['mcpServers'] as Record<string, { command?: string; args?: string[]; env?: Record<string, string> }> | undefined);
  }

  // Project: .claude/settings.json
  if (projectPath) {
    const projSettings = await readSettingsFile(path.join(projectPath, '.claude', 'settings.json'));
    addServers(projSettings['mcpServers'] as Record<string, { command?: string; args?: string[]; env?: Record<string, string> }> | undefined);
  }

  return servers;
};

export const mcpListTools = (command: string, args: string[], env: Record<string, string>): Promise<McpTool[]> => {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });

    let buffer = '';
    let resolved = false;
    let initialized = false;
    let msgId = 1;

    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; proc.kill(); resolve([]); }
    }, 20000);

    const finish = (tools: McpTool[]): void => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      proc.kill();
      resolve(tools);
    };

    // Send as plain JSON lines (works with mcp-remote and most servers)
    const sendJsonLine = (method: string, params: Record<string, unknown> = {}, isNotification = false): void => {
      const payload: Record<string, unknown> = { jsonrpc: '2.0', method, params };
      if (!isNotification) payload.id = msgId++;
      proc.stdin.write(JSON.stringify(payload) + '\n');
    };

    const handleMessage = (msg: Record<string, unknown>): void => {
      const result = msg.result as Record<string, unknown> | undefined;
      if (!result) return;
      if (!initialized && result.protocolVersion) {
        initialized = true;
        sendJsonLine('notifications/initialized', {}, true);
        sendJsonLine('tools/list');
      } else if (result.tools) {
        finish(
          (result.tools as McpTool[]).map((t) => ({
            name: t.name || '',
            description: t.description || '',
            inputSchema: t.inputSchema || { type: 'object', properties: {}, required: [] },
          })),
        );
      }
    };

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();

      // Try plain JSON lines first (one JSON object per line)
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Content-Length')) continue;
        try {
          handleMessage(JSON.parse(trimmed));
        } catch {
          // Not JSON - might be Content-Length framed, put back
          buffer = trimmed + '\n' + buffer;
        }
      }

      // Also try Content-Length framing for standard SDK servers
      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        const header = buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) break;
        const contentLength = parseInt(match[1], 10);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + contentLength) break;
        const body = buffer.slice(bodyStart, bodyStart + contentLength);
        buffer = buffer.slice(bodyStart + contentLength);
        try {
          handleMessage(JSON.parse(body));
        } catch {
          // skip
        }
      }
    });

    proc.on('error', () => finish([]));
    proc.on('exit', () => { if (!resolved) finish([]); });

    sendJsonLine('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'solmeron', version: '1.0.0' },
    });
  });
};
