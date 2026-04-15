/**
 * In-memory log store for request tracking.
 * Stores logs indexed by request ID for easy retrieval.
 * Ring buffer: keeps last MAX_ENTRIES per request, auto-evicts oldest entries.
 */

import { logger } from "./logger.ts";

const MAX_ENTRIES = 500;
const MAX_PER_REQUEST = 100;

interface LogEntry {
  ts: string;
  level: string;
  msg: string;
  [key: string]: unknown;
}

const store = new Map<string, LogEntry[]>();

// Also capture console output by redirecting
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
let consolePatched = false;

function stringifyArg(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable object]";
  }
}

function addEntry(entry: LogEntry) {
  const reqId = entry.reqId as string | undefined;
  if (reqId) {
    if (!store.has(reqId)) {
      store.set(reqId, []);
    }
    const reqLogs = store.get(reqId)!;
    // Trim per-request limit
    if (reqLogs.length >= MAX_PER_REQUEST) {
      reqLogs.shift();
    }
    reqLogs.push(entry);
  }

  // Trim global store
  if (store.size > MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

// Patch console methods to capture structured output
function patchConsole() {
  if (consolePatched) return;

  const capture = (level: string) => (...args: unknown[]) => {
    const str = args.map(stringifyArg).join(" ");
    try {
      const parsed = JSON.parse(str);
      addEntry({ ts: new Date().toISOString(), level, msg: parsed.msg || str, ...parsed });
    } catch {
      // Not JSON — just plain text
      addEntry({ ts: new Date().toISOString(), level, msg: str });
    }
  };
  console.log = (...args: unknown[]) => { originalLog(...args); capture("INFO")(...args); };
  console.warn = (...args: unknown[]) => { originalWarn(...args); capture("WARN")(...args); };
  console.error = (...args: unknown[]) => { originalError(...args); capture("ERROR")(...args); };
  consolePatched = true;
}

export const logStore = {
  get(reqId: string): LogEntry[] {
    return store.get(reqId) || [];
  },
  list(): { reqId: string; count: number; firstTs: string; lastTs: string }[] {
    const results: { reqId: string; count: number; firstTs: string; lastTs: string }[] = [];
    for (const [reqId, entries] of store.entries()) {
      if (entries.length === 0) continue;
      results.push({
        reqId,
        count: entries.length,
        firstTs: entries[0].ts,
        lastTs: entries[entries.length - 1].ts,
      });
    }
    return results.sort((a, b) => b.lastTs.localeCompare(a.lastTs));
  },
  clear() {
    store.clear();
  },
};

export function startLogCapture() {
  patchConsole();
  console.log("[log] Structured log capture started");
}

export { logger };
