import type { HistoryItem, Lang, Settings, StoredServer } from "../types";

const KEYS = {
  server: "khmerclip.server",
  settings: "khmerclip.settings",
  history: "khmerclip.history",
  lang: "khmerclip.lang",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the app still works.
  }
}

export const DEFAULT_SETTINGS: Settings = {
  aspect: "16:9",
  quality: "standard",
  length: "single",
  seed: "",
  negative: "blurry, low quality, distorted, watermark, text, extra limbs",
  translate: true,
};

export function loadServer(): StoredServer {
  return read<StoredServer>(KEYS.server, { url: "", token: "" });
}

export function saveServer(server: StoredServer): void {
  write(KEYS.server, server);
}

export function loadSettings(): Settings {
  return read<Settings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  write(KEYS.settings, settings);
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.history);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]).slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  write(KEYS.history, items.slice(0, 24));
}

export function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(KEYS.lang);
    return raw === "en" ? "en" : "km";
  } catch {
    return "km";
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(KEYS.lang, lang);
  } catch {
    // ignore
  }
}
