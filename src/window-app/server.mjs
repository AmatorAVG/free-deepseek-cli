// HTTP-сервер окна чатов на 127.0.0.1:port. Биндится только на loopback —
// снаружи недоступен. Реализует все REST-эндпойнты, которые рисует фронт.
// На SIGINT/SIGTERM/SIGHUP — graceful shutdown, фронт замечает через heartbeat и закрывается.

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { openAppWindow } from "../browser/launch.mjs";
import { runCodeTask } from "../code-agent/run.mjs";
import { COMMAND_CATALOG, loadSettings, saveSettings } from "../state/settings.mjs";
import { conversationList, makeConversationTitle, shouldAutoTitle } from "../state/conversations.mjs";
import { getStateFile, loadWindowState, saveWindowState } from "../state/window-state.mjs";
import { readJsonBody, sendHtml, sendJson } from "./http.mjs";
import { renderWindowHtml } from "./ui-html.mjs";

export async function runWindowApp({ client, workspaceRoot, port, modelType, thinkingEnabled, searchEnabled }) {
  const state = loadWindowState(workspaceRoot);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/") {
        return sendHtml(res, renderWindowHtml());
      }

      // Lifeline для фронта. Если этот endpoint не отвечает 3 раза подряд → окно закрывается.
      if (req.method === "GET" && url.pathname === "/api/heartbeat") {
        return sendJson(res, { ok: true, ts: Date.now() });
      }

      if (req.method === "GET" && url.pathname === "/api/state") {
        return sendJson(res, {
          workspaceRoot,
          stateFile: getStateFile(),
          activeConversationId: state.activeConversationId,
          conversations: conversationList(state),
        });
      }

      // ===== Файловый браузер для модалки «Новый чат» =====

      if (req.method === "POST" && url.pathname === "/api/browse/mkdir") {
        const body = await readJsonBody(req);
        const parentRaw = String(body.parent || "").trim();
        const name = String(body.name || "").trim();
        if (!parentRaw) return sendJson(res, { error: "parent обязателен" }, 400);
        if (!name) return sendJson(res, { error: "Имя папки не может быть пустым." }, 400);
        if (name.includes("/") || name.includes("\\") || name === "." || name === ".." || name.startsWith("..")) {
          return sendJson(res, { error: "Имя не может содержать /, \\, или быть '.', '..'." }, 400);
        }
        const parent = path.resolve(parentRaw);
        const target = path.join(parent, name);
        const safeRoots = [os.homedir(), path.resolve(workspaceRoot), path.join(os.homedir(), "Documents")];
        const isUnderSafe = safeRoots.some((r) => target === r || target.startsWith(r + path.sep));
        if (!isUnderSafe) {
          return sendJson(res, { error: `Создание разрешено только под ${os.homedir()}/.` }, 400);
        }
        if (fs.existsSync(target)) {
          return sendJson(res, { error: `Папка уже существует: ${target}` }, 409);
        }
        try {
          fs.mkdirSync(target, { recursive: false });
        } catch (error) {
          return sendJson(res, { error: `Не удалось создать: ${error.message}` }, 500);
        }
        return sendJson(res, { path: target });
      }

      if (req.method === "GET" && url.pathname === "/api/browse") {
        const requested = url.searchParams.get("path");
        const showHidden = url.searchParams.get("hidden") === "1";
        let target;
        try {
          let p = (requested || os.homedir()).trim();
          if (p.startsWith("~/") || p === "~") p = path.join(os.homedir(), p.slice(1));
          target = path.resolve(p);
        } catch {
          return sendJson(res, { error: "Невалидный путь" }, 400);
        }
        if (!fs.existsSync(target)) {
          return sendJson(res, { error: `Папка не существует: ${target}` }, 404);
        }
        if (!fs.statSync(target).isDirectory()) {
          return sendJson(res, { error: `Не папка: ${target}` }, 400);
        }
        let raw;
        try {
          raw = fs.readdirSync(target, { withFileTypes: true });
        } catch (error) {
          return sendJson(res, { error: `Не могу прочитать папку: ${error.message}` }, 403);
        }
        const folders = raw
          .filter((entry) => {
            try { return entry.isDirectory(); } catch { return false; }
          })
          .filter((entry) => (showHidden ? true : !entry.name.startsWith(".")))
          .map((entry) => ({
            name: entry.name,
            path: path.join(target, entry.name),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
          .slice(0, 500);
        const parent = path.dirname(target);
        return sendJson(res, {
          path: target,
          parent: parent !== target ? parent : null,
          entries: folders,
          home: os.homedir(),
          truncated: raw.filter((e) => { try { return e.isDirectory(); } catch { return false; } }).length > 500,
        });
      }

      // ===== Проекты (workspace'ы из чатов) =====

      if (req.method === "GET" && url.pathname === "/api/projects") {
        const seen = new Set();
        const projects = [];
        for (const c of state.conversations) {
          const w = String(c.workspace || workspaceRoot);
          if (seen.has(w)) continue;
          seen.add(w);
          projects.push({
            path: w,
            name: path.basename(w) || w,
            exists: fs.existsSync(w),
          });
        }
        if (!seen.has(workspaceRoot)) {
          projects.unshift({
            path: workspaceRoot,
            name: path.basename(workspaceRoot) || workspaceRoot,
            exists: fs.existsSync(workspaceRoot),
            isDefault: true,
          });
        }
        return sendJson(res, { projects, defaultWorkspace: workspaceRoot, home: os.homedir() });
      }

      // ===== Settings (whitelist команд для /code) =====

      if (req.method === "GET" && url.pathname === "/api/settings") {
        const current = loadSettings();
        const catalog = Object.entries(COMMAND_CATALOG).map(([name, meta]) => ({
          name,
          description: meta.description,
          risk: meta.risk,
        }));
        return sendJson(res, {
          allowedCommands: current.allowedCommands,
          catalog,
        });
      }

      if (req.method === "PUT" && url.pathname === "/api/settings") {
        const body = await readJsonBody(req);
        const saved = saveSettings({ allowedCommands: body.allowedCommands });
        return sendJson(res, { allowedCommands: saved.allowedCommands });
      }

      // ===== Conversations =====

      if (req.method === "POST" && url.pathname === "/api/conversations") {
        const body = await readJsonBody(req);

        let workspace = String(body.workspace || workspaceRoot).trim() || workspaceRoot;
        if (workspace.startsWith("~/") || workspace === "~") {
          workspace = path.join(os.homedir(), workspace.slice(1));
        }
        workspace = path.resolve(workspace);

        const exists = fs.existsSync(workspace);
        if (!exists) {
          if (!body.createFolder) {
            return sendJson(
              res,
              { error: `Папка не существует: ${workspace}. Поставь галочку «Создать папку», если хочешь чтобы я её создал.` },
              400,
            );
          }
          const safeRoots = [os.homedir(), path.resolve(workspaceRoot), path.join(os.homedir(), "Documents")];
          const isUnderSafe = safeRoots.some((root) => workspace === root || workspace.startsWith(root + path.sep));
          if (!isUnderSafe) {
            return sendJson(
              res,
              { error: `Создание новой папки разрешено только под ${os.homedir()}/. Укажи путь в твоей домашней директории.` },
              400,
            );
          }
          try {
            fs.mkdirSync(workspace, { recursive: true });
          } catch (error) {
            return sendJson(res, { error: `Не удалось создать папку: ${error.message}` }, 500);
          }
        } else if (!fs.statSync(workspace).isDirectory()) {
          return sendJson(res, { error: `Путь существует, но это не папка: ${workspace}` }, 400);
        }

        const sessionId = await client.createSession();
        const now = new Date().toISOString();
        const rawTitle = String(body.title || "").trim();
        const conversation = {
          id: randomUUID(),
          sessionId,
          title: rawTitle || "New chat",
          autoTitle: !rawTitle,
          workspace,
          parentMessageId: null,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        state.conversations.unshift(conversation);
        state.activeConversationId = conversation.id;
        saveWindowState(workspaceRoot, state);
        return sendJson(res, { conversation });
      }

      const conversationMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
      if (req.method === "GET" && conversationMatch) {
        const conversation = state.conversations.find((item) => item.id === conversationMatch[1]);
        if (!conversation) return sendJson(res, { error: "Conversation not found" }, 404);
        state.activeConversationId = conversation.id;
        saveWindowState(workspaceRoot, state);
        return sendJson(res, { conversation });
      }

      if (req.method === "DELETE" && conversationMatch) {
        const id = conversationMatch[1];
        const beforeCount = state.conversations.length;
        state.conversations = state.conversations.filter((item) => item.id !== id);
        if (state.conversations.length === beforeCount) {
          return sendJson(res, { error: "Conversation not found" }, 404);
        }
        if (state.activeConversationId === id) {
          state.activeConversationId = state.conversations[0]?.id || null;
        }
        saveWindowState(workspaceRoot, state);
        return sendJson(res, {
          activeConversationId: state.activeConversationId,
          conversations: conversationList(state),
        });
      }

      const messageMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
      if (req.method === "POST" && messageMatch) {
        const body = await readJsonBody(req);
        const conversation = state.conversations.find((item) => item.id === messageMatch[1]);
        if (!conversation) return sendJson(res, { error: "Conversation not found" }, 404);

        const prompt = String(body.content || "").trim();
        if (!prompt) return sendJson(res, { error: "Message is empty" }, 400);

        const now = new Date().toISOString();
        const isFirstUserMessage = !conversation.messages.some((message) => message.role === "user");
        if (isFirstUserMessage && shouldAutoTitle(conversation)) {
          conversation.title = makeConversationTitle(prompt);
        }
        conversation.messages.push({ role: "user", content: prompt, createdAt: now });
        conversation.updatedAt = now;
        state.activeConversationId = conversation.id;
        saveWindowState(workspaceRoot, state);

        if (prompt === "/code" || prompt.startsWith("/code ")) {
          const task = prompt.slice(5).trim();
          if (!task) {
            conversation.messages.push({
              role: "assistant",
              content: "Напиши задачу после /code. Например: /code создай файл notes.txt с текстом hello",
              createdAt: new Date().toISOString(),
            });
            conversation.updatedAt = new Date().toISOString();
            saveWindowState(workspaceRoot, state);
            return sendJson(res, { conversation });
          }

          const codeResult = await runCodeTask(client, {
            sessionId: conversation.sessionId,
            modelType,
            thinkingEnabled,
            searchEnabled,
          }, path.resolve(conversation.workspace || workspaceRoot), task, conversation.parentMessageId);

          conversation.parentMessageId = codeResult.parentMessageId ?? conversation.parentMessageId;
          const toolText = codeResult.toolLogs.length ? `${codeResult.toolLogs.join("\n")}\n\n` : "";
          conversation.messages.push({
            role: "assistant",
            content: `${toolText}${codeResult.message}`.trimEnd(),
            createdAt: new Date().toISOString(),
          });
          conversation.updatedAt = new Date().toISOString();
          saveWindowState(workspaceRoot, state);
          return sendJson(res, { conversation });
        }

        const result = await client.complete({
          sessionId: conversation.sessionId,
          prompt,
          parentMessageId: conversation.parentMessageId,
          modelType,
          thinkingEnabled,
          searchEnabled,
        });

        conversation.parentMessageId = result.lastAssistantMessageId ?? conversation.parentMessageId;
        conversation.messages.push({
          role: "assistant",
          content: result.text.trimEnd(),
          createdAt: new Date().toISOString(),
        });
        conversation.updatedAt = new Date().toISOString();
        saveWindowState(workspaceRoot, state);

        return sendJson(res, { conversation });
      }

      return sendJson(res, { error: "Not found" }, 404);
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const url = `http://127.0.0.1:${port}`;
  console.log(`DeepSeek window: ${url}`);
  openAppWindow(url);

  // Graceful shutdown: Ctrl+C / kill / закрытие терминала.
  // Сервер закрывается → фронт через heartbeat видит мёртвый CLI → окно закрывается.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (signal) console.log(`\nReceived ${signal}, stopping window server...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGHUP", () => shutdown("SIGHUP"));
}
