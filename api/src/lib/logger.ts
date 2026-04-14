/**
 * Structured logger for ContentAI backend.
 * Logs human-readable output to terminal + appends to app.log for persistence.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const MIN_LEVEL = (Deno.env.get("LOG_LEVEL") || "INFO") as LogLevel;
const isEnabled = (level: LogLevel) =>
  LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];

type LogFields = Record<string, unknown>;

// File writer
let logFile: Deno.FsFile | null = null;
let logFilePath = "";

async function writeToFile(line: string) {
  if (!logFile) {
    logFilePath = new URL("../../app.log", import.meta.url).pathname;
    try {
      logFile = await Deno.open(logFilePath, { write: true, create: true, append: true });
      console.log(`[file-log] ${logFilePath}`);
    } catch (e) {
      console.warn(`[file-log] Cannot open: ${e}`);
    }
  }
  if (logFile) {
    try {
      await logFile.write(new TextEncoder().encode(line + "\n"));
    } catch {
      logFile = null;
    }
  }
}

/** Colors for terminal */
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  DEBUG: C.gray,
  INFO: C.green,
  WARN: C.yellow,
  ERROR: C.red,
};

function stripAnsi(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.charCodeAt(i) === 27 && text[i + 1] === "[") {
      i += 2;
      while (i < text.length && text[i] !== "m") i++;
      if (i < text.length) i++;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

function formatHuman(level: LogLevel, msg: string, fields?: LogFields): string {
  const reqId = fields?.reqId as string | undefined;
  const prefix = reqId ? `${C.cyan}[${reqId.slice(0, 8)}]${C.reset}` : "";
  const color = LEVEL_COLOR[level];
  const levelStr = `${color}[${level}]${C.reset}`;

  const pairs: string[] = [];
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (k === "reqId" || k === "ts") continue;
    if (k === "durationMs") {
      pairs.push(`${C.dim}${(v as number / 1000).toFixed(2)}s${C.reset}`);
    } else if (k === "content") {
      pairs.push(`${C.magenta}${v}${C.reset}`);
    } else if (typeof v === "number") {
      pairs.push(`${C.cyan}${v}${C.reset}`);
    } else if (typeof v === "boolean") {
      pairs.push(`${v ? C.green : C.red}${v}${C.reset}`);
    } else {
      pairs.push(`${C.dim}${k}=${v}${C.reset}`);
    }
  }

  const meta = pairs.length > 0 ? ` ${pairs.join(" ")}` : "";
  return `${prefix}${levelStr} ${msg}${meta}`;
}

function log(level: LogLevel, msg: string, fields?: LogFields) {
  if (!isEnabled(level)) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };

  const human = formatHuman(level, msg, fields);

  if (level === "ERROR") {
    console.error(human);
    console.error(JSON.stringify(entry));
  } else if (level === "WARN") {
    console.warn(human);
    console.warn(JSON.stringify(entry));
  } else {
    console.log(human);
    console.log(JSON.stringify(entry));
  }

  // Also append human-readable line to app.log
  const plainLine = stripAnsi(human);
  writeToFile(plainLine);
}

export const logger = {
  debug(msg: string, fields?: LogFields) { log("DEBUG", msg, fields); },
  info(msg: string, fields?: LogFields) { log("INFO", msg, fields); },
  warn(msg: string, fields?: LogFields) { log("WARN", msg, fields); },
  error(msg: string, fields?: LogFields) { log("ERROR", msg, fields); },
};
