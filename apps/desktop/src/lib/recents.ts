export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number;
}

const KEY = "opentree.recentProjects";
const MAX = 5;

/** Derive a display name from a project folder path (Unix or Windows). */
export function basename(path: string): string {
  const parts = path.split(/[/\\]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function getRecents(): RecentProject[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is RecentProject => !!r && typeof r.path === "string")
      .map((r) => ({ path: r.path, name: r.name || basename(r.path), lastOpened: r.lastOpened ?? 0 }))
      .sort((a, b) => b.lastOpened - a.lastOpened)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function addRecent(path: string): RecentProject[] {
  const next: RecentProject[] = [
    { path, name: basename(path), lastOpened: Date.now() },
    ...getRecents().filter((r) => r.path !== path),
  ].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be unavailable */
  }
  return next;
}
