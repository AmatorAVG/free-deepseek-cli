// Whitelist разрешённых команд для /code run_command.
// Каталог COMMAND_CATALOG — единый источник правды: что доступно, чем рискованно,
// какие точечные опасные паттерны блокировать (rm -rf, git push --force и т.п.).
// Юзерский выбор (галочки в UI) хранится в ~/.deepseek-cli/settings.json,
// бэкенд читает loadSettings() на каждый run_command вызов — без рестарта.

import fs from "node:fs";
import { AUTH_DIR, SETTINGS_FILE } from "../config.mjs";

export const COMMAND_CATALOG = {
  node:    { description: "Запуск JS-файлов через Node",                       risk: "low",    enabledByDefault: true },
  npm:     { description: "npm-скрипты (install/add/publish заблокированы)",   risk: "low",    enabledByDefault: true },
  python3: { description: "Запуск Python-файлов",                              risk: "low",    enabledByDefault: true },
  python:  { description: "Алиас для python3",                                 risk: "low",    enabledByDefault: true },
  ls:      { description: "Листинг файлов и папок",                            risk: "low",    enabledByDefault: true },
  cat:     { description: "Печать содержимого файла",                          risk: "low",    enabledByDefault: true },
  pwd:     { description: "Текущая рабочая папка",                             risk: "low",    enabledByDefault: true },

  mkdir:   { description: "Создание папок",                                    risk: "low",    enabledByDefault: false },
  cp:      { description: "Копирование файлов",                                risk: "low",    enabledByDefault: false },
  touch:   { description: "Создание пустого файла / обновление mtime",         risk: "low",    enabledByDefault: false },
  grep:    { description: "Поиск по тексту",                                   risk: "low",    enabledByDefault: false },
  head:    { description: "Первые N строк файла",                              risk: "low",    enabledByDefault: false },
  tail:    { description: "Последние N строк файла",                           risk: "low",    enabledByDefault: false },
  wc:      { description: "Подсчёт строк / слов / байт",                       risk: "low",    enabledByDefault: false },

  find: {
    description: "Поиск файлов (-exec / -delete заблокированы)",
    risk: "medium", enabledByDefault: false,
    validateArgs: (args) => {
      for (const arg of args) {
        if (arg === "-exec" || arg === "-execdir" || arg === "-delete" || arg === "-ok") {
          throw new Error(`find: опция ${arg} заблокирована (потенциальный RCE).`);
        }
      }
    },
  },
  git: {
    description: "git status/log/diff/add/commit/checkout/branch (clone, push --force, remote add — заблокированы)",
    risk: "medium", enabledByDefault: false,
    validateArgs: (args) => {
      const sub = (args[0] || "").toLowerCase();
      if (sub === "clone") throw new Error("git clone заблокирован (сетевая операция).");
      if (sub === "fetch" || sub === "pull") throw new Error(`git ${sub} заблокирован (сетевая операция).`);
      if (sub === "push" && (args.includes("--force") || args.includes("-f") || args.includes("+"))) {
        throw new Error("git push --force заблокирован.");
      }
      if (sub === "remote" && args[1] === "add") {
        throw new Error("git remote add заблокирован (добавление чужого репо).");
      }
      if (sub === "submodule" && args[1] === "add") {
        throw new Error("git submodule add заблокирован.");
      }
    },
  },
  mv: { description: "Перемещение/переименование", risk: "medium", enabledByDefault: false },
  sed: {
    description: "Замена/обработка текста",
    risk: "medium", enabledByDefault: false,
  },
  chmod: {
    description: "Изменение прав (777, +x на всё — заблокированы)",
    risk: "medium", enabledByDefault: false,
    validateArgs: (args) => {
      for (const arg of args) {
        if (arg === "777" || arg === "a+rwx" || arg === "ugo+rwx") {
          throw new Error(`chmod ${arg} заблокирован.`);
        }
      }
    },
  },
  make: {
    description: "Сборка по Makefile (выполняет команды из Makefile — будь осторожен)",
    risk: "medium", enabledByDefault: false,
  },

  rm: {
    description: "Удаление файлов (БЕЗ -r/-R/-rf)",
    risk: "high", enabledByDefault: false,
    validateArgs: (args) => {
      for (const arg of args) {
        if (arg === "--recursive" || arg === "--no-preserve-root") {
          throw new Error(`rm: ${arg} заблокирован.`);
        }
        const isShortFlag = arg.startsWith("-") && !arg.startsWith("--") && arg.length >= 2;
        if (isShortFlag && /[rR]/.test(arg)) {
          throw new Error(`rm: рекурсивные флаги (${arg}) заблокированы.`);
        }
      }
    },
  },
};

export function loadSettings() {
  const fallback = {
    allowedCommands: Object.keys(COMMAND_CATALOG).filter(
      (cmd) => COMMAND_CATALOG[cmd].enabledByDefault,
    ),
  };
  if (!fs.existsSync(SETTINGS_FILE)) return fallback;
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    const allowed = Array.isArray(raw?.allowedCommands)
      ? raw.allowedCommands.filter((cmd) => typeof cmd === "string" && COMMAND_CATALOG[cmd])
      : fallback.allowedCommands;
    return { allowedCommands: allowed };
  } catch {
    return fallback;
  }
}

export function saveSettings(settings) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const valid = (settings?.allowedCommands || []).filter((cmd) => COMMAND_CATALOG[cmd]);
  const payload = { allowedCommands: Array.from(new Set(valid)), savedAt: new Date().toISOString() };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2));
  try { fs.chmodSync(SETTINGS_FILE, 0o600); } catch {}
  return payload;
}
