// Исполнитель tool-call'ов от /code-агента. Файловые операции + run_command.
// Все пути валидируются через resolveWorkspacePath: за пределы workspace не выйти.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { COMMAND_CATALOG, loadSettings } from "../state/settings.mjs";

export async function executeWorkspaceTool(workspaceRoot, call) {
  const tool = call.tool;

  if (tool === "finish") {
    return { done: true, message: String(call.message || "Done.") };
  }

  if (tool === "list_files") {
    const target = resolveWorkspacePath(workspaceRoot, call.path || ".");
    const entries = listFiles(target, workspaceRoot);
    return { ok: true, entries };
  }

  if (tool === "read_file") {
    const target = resolveWorkspacePath(workspaceRoot, call.path);
    const maxBytes = Number.isFinite(Number(call.maxBytes)) ? Number(call.maxBytes) : 60000;
    const stat = fs.statSync(target);
    if (!stat.isFile()) throw new Error("read_file target is not a file.");
    const content = fs.readFileSync(target, "utf8").slice(0, maxBytes);
    return { ok: true, path: path.relative(workspaceRoot, target), bytes: stat.size, content };
  }

  if (tool === "write_file") {
    const target = resolveWorkspacePath(workspaceRoot, call.path);
    if (typeof call.content !== "string") throw new Error("write_file requires string content.");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, call.content, "utf8");
    return { ok: true, path: path.relative(workspaceRoot, target), bytes: Buffer.byteLength(call.content) };
  }

  if (tool === "append_file") {
    const target = resolveWorkspacePath(workspaceRoot, call.path);
    if (typeof call.content !== "string") throw new Error("append_file requires string content.");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, call.content, "utf8");
    return { ok: true, path: path.relative(workspaceRoot, target), bytes: Buffer.byteLength(call.content) };
  }

  if (tool === "mkdir") {
    const target = resolveWorkspacePath(workspaceRoot, call.path);
    fs.mkdirSync(target, { recursive: true });
    return { ok: true, path: path.relative(workspaceRoot, target) };
  }

  if (tool === "run_command") {
    return await runWorkspaceCommand(workspaceRoot, call);
  }

  throw new Error(`Unknown tool: ${tool}`);
}

export async function runWorkspaceCommand(workspaceRoot, call) {
  // Whitelist динамический — читаем settings.json на каждый вызов, чтобы изменения
  // в UI применялись сразу без рестарта.
  const settings = loadSettings();
  const allowedCommands = new Set(settings.allowedCommands);
  const cmd = String(call.cmd || "").trim();
  if (!allowedCommands.has(cmd)) {
    throw new Error(`Команда "${cmd}" не разрешена. Включи её в Settings → Allowed commands в окне чата.`);
  }

  const args = Array.isArray(call.args) ? call.args.map((arg) => String(arg)) : [];
  validateCommandArgs(workspaceRoot, cmd, args);

  // Точечный валидатор аргументов конкретной команды (rm -rf, git clone и т.п.).
  const catalogEntry = COMMAND_CATALOG[cmd];
  if (catalogEntry?.validateArgs) {
    catalogEntry.validateArgs(args);
  }

  const timeoutMs = Math.min(
    Math.max(Number.isFinite(Number(call.timeoutMs)) ? Number(call.timeoutMs) : 20000, 1000),
    30000,
  );

  const result = await spawnSyncSafe(cmd, args, {
    cwd: path.resolve(workspaceRoot),
    timeoutMs,
  });

  return {
    ok: result.status === 0,
    cmd,
    args,
    status: result.status,
    signal: result.signal,
    timedOut: result.timedOut,
    stdout: truncateOutput(result.stdout),
    stderr: truncateOutput(result.stderr),
  };
}

export function validateCommandArgs(workspaceRoot, cmd, args) {
  const blockedFlags = new Set([
    "install", "add", "remove", "uninstall", "publish", "login", "logout", "token",
  ]);

  if (cmd === "npm" && args.some((arg) => blockedFlags.has(arg))) {
    throw new Error(`npm ${args.find((arg) => blockedFlags.has(arg))} is blocked.`);
  }

  if (cmd === "node" && args.some((arg) => ["-e", "--eval", "-p", "--print"].includes(arg))) {
    throw new Error("node eval/print flags are blocked. Run a workspace file instead.");
  }

  if ((cmd === "python" || cmd === "python3") && args.some((arg) => ["-c", "-m"].includes(arg))) {
    throw new Error("python -c/-m is blocked. Run a workspace file instead.");
  }

  for (const arg of args) {
    if (!arg || arg.startsWith("-")) continue;
    if (/^https?:\/\//i.test(arg)) throw new Error("Network URLs are blocked in command args.");
    if (arg.includes(";") || arg.includes("&&") || arg.includes("|") || arg.includes("`")) {
      throw new Error("Shell operators are blocked in command args.");
    }

    if (looksLikePath(arg)) resolveWorkspacePath(workspaceRoot, arg);
  }
}

export function looksLikePath(value) {
  return (
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.includes("/") ||
    /\.(mjs|cjs|js|json|py|txt|md|html|css|ts|tsx|jsx)$/i.test(value)
  );
}

export function spawnSyncSafe(cmd, args, options) {
  const child = spawn(cmd, args, {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  return waitForChild(child, options.timeoutMs, {
    onStdout: (chunk) => { stdout += chunk; },
    onStderr: (chunk) => { stderr += chunk; },
    onTimeout: () => {
      timedOut = true;
      child.kill("SIGTERM");
    },
    onClose: (status, signal) => ({ status, signal, timedOut, stdout, stderr }),
  });
}

export function waitForChild(child, timeoutMs, handlers) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => handlers.onTimeout(), timeoutMs);
    child.stdout.on("data", (chunk) => handlers.onStdout(chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => handlers.onStderr(chunk.toString("utf8")));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      resolve(handlers.onClose(status, signal));
    });
  });
}

export function truncateOutput(text) {
  const value = String(text || "");
  return value.length > 12000 ? `${value.slice(0, 12000)}\n[truncated]` : value;
}

// Резолв пути к файлу/папке внутри workspace. Гарантирует, что результат
// НЕ выходит за пределы корня и не попадает в .git / node_modules / .env.
export function resolveWorkspacePath(workspaceRoot, requestedPath) {
  if (!requestedPath || typeof requestedPath !== "string") {
    throw new Error("Tool path is required.");
  }

  const root = path.resolve(workspaceRoot);
  const target = path.resolve(root, requestedPath);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace: ${requestedPath}`);
  }

  const parts = relative.split(path.sep);
  if (parts.includes(".git") || parts.includes("node_modules") || parts.includes(".env")) {
    throw new Error(`Path is blocked: ${requestedPath}`);
  }

  return target;
}

export function listFiles(target, workspaceRoot) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [path.relative(workspaceRoot, target)];

  const result = [];
  const walk = (dir, depth) => {
    if (depth > 2 || result.length >= 200) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", ".env"].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const rel = path.relative(workspaceRoot, fullPath);
      result.push(entry.isDirectory() ? `${rel}/` : rel);
      if (entry.isDirectory()) walk(fullPath, depth + 1);
      if (result.length >= 200) break;
    }
  };

  walk(target, 0);
  return result;
}
