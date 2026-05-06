import { session, app, dialog, BrowserWindow } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface InstalledExtension {
  id: string;
  name: string;
  version: string;
  path: string;
  description?: string;
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'atlas-extensions.json');
}

function loadPaths(): string[] {
  try {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) return [];
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePaths(paths: string[]): void {
  try {
    writeFileSync(getConfigPath(), JSON.stringify(paths, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

export async function loadAllExtensions(): Promise<InstalledExtension[]> {
  const paths = loadPaths();
  const loaded: InstalledExtension[] = [];

  for (const extPath of paths) {
    if (!existsSync(extPath)) continue;
    try {
      const ext = await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
      loaded.push({
        id: ext.id,
        name: ext.name,
        version: ext.manifest?.version ?? '?',
        path: ext.path,
        description: ext.manifest?.description,
      });
    } catch {
      // ignore
    }
  }

  return loaded;
}

export async function installExtension(win: BrowserWindow): Promise<InstalledExtension | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Install Extension',
    message: 'Select an unpacked extension folder',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const extPath = result.filePaths[0];
  const manifestPath = join(extPath, 'manifest.json');

  if (!existsSync(manifestPath)) return null;

  try {
    const ext = await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });

    const paths = loadPaths();
    if (!paths.includes(extPath)) {
      paths.push(extPath);
      savePaths(paths);
    }

    return {
      id: ext.id,
      name: ext.name,
      version: ext.manifest?.version ?? '?',
      path: ext.path,
      description: ext.manifest?.description,
    };
  } catch {
    return null;
  }
}

export function getInstalledExtensions(): InstalledExtension[] {
  return session.defaultSession.getAllExtensions().map((ext) => ({
    id: ext.id,
    name: ext.name,
    version: ext.manifest?.version ?? '?',
    path: ext.path,
    description: ext.manifest?.description,
  }));
}

export function removeExtension(id: string): void {
  const ext = session.defaultSession.getAllExtensions().find((e) => e.id === id)
  session.defaultSession.removeExtension(id)
  if (ext) {
    const updated = loadPaths().filter((p) => p !== ext.path)
    savePaths(updated)
  }
}
