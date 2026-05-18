// Огромный HTML-шаблон окна чатов: layout, стили, фронтенд JS.
// Самодостаточный — никаких внешних зависимостей и шаблонизации.
//
// При изменении: тест — открыть localhost:4317, проверить, что сайдбар, чат,
// модалки (Settings, New chat, файловый браузер) рендерятся и работают.

export function renderWindowHtml() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DeepSeek Workspace</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0d10;
      --sidebar: #111418;
      --panel: #15191f;
      --panel-2: #0f1216;
      --line: #2a3038;
      --line-strong: #3a4350;
      --text: #edf1f7;
      --muted: #929baa;
      --accent: #4d7cff;
      --accent-strong: #7fa0ff;
      --accent-soft: #18264a;
      --bubble: #1b2028;
      --danger: #ff776d;
    }
    * { box-sizing: border-box; }
    html {
      height: 100%;
      overflow: hidden;
      background: var(--bg);
    }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      overflow: hidden;
    }
    button, input, textarea {
      font: inherit;
    }
    ::selection {
      background: rgba(77, 124, 255, 0.35);
    }
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #343c47;
      border: 2px solid transparent;
      background-clip: content-box;
      border-radius: 999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #48515f;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .app {
      --sidebar-width: 300px;
      display: grid;
      grid-template-columns: var(--sidebar-width) 6px minmax(0, 1fr);
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
    .sidebar {
      background: var(--sidebar);
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-width: 0;
      overflow: hidden;
    }
    .sidebarResizer {
      width: 6px;
      height: 100vh;
      background: var(--panel-2);
      border-left: 1px solid var(--line);
      border-right: 1px solid var(--line);
      cursor: col-resize;
      touch-action: none;
    }
    .sidebarResizer:hover,
    .sidebarResizer.dragging {
      background: var(--accent);
      border-color: var(--accent);
    }
    body.resizingSidebar {
      cursor: col-resize;
      user-select: none;
    }
    .sideHead {
      padding: 14px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand {
      font-weight: 700;
      flex: 1;
      min-width: 0;
      color: var(--text);
    }
    .iconBtn, .sendBtn {
      border: 1px solid var(--line);
      background: #1a1f27;
      color: var(--text);
      height: 36px;
      min-width: 36px;
      border-radius: 6px;
      cursor: pointer;
    }
    .iconBtn:hover, .sendBtn:hover {
      border-color: var(--line-strong);
      background: #222936;
    }
    .newForm {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      display: grid;
      gap: 8px;
    }
    .newForm input {
      width: 100%;
      border: 1px solid var(--line);
      background: var(--panel-2);
      color: var(--text);
      border-radius: 6px;
      padding: 9px 10px;
      min-width: 0;
    }
    .newForm input::placeholder,
    textarea::placeholder {
      color: #687181;
    }
    .chatList {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px;
      display: grid;
      align-content: start;
      gap: 4px;
    }
    .chatItem {
      border: 1px solid transparent;
      background: transparent;
      color: var(--text);
      border-radius: 6px;
      padding: 10px;
      text-align: left;
      cursor: pointer;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      width: 100%;
    }
    .chatItem:hover { background: #171c24; }
    .chatItem.active {
      background: var(--accent-soft);
      border-color: #304b8f;
    }
    .chatTitle {
      font-size: 14px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chatMeta {
      color: var(--muted);
      font-size: 12px;
    }
    .chatDelete {
      width: 28px;
      height: 28px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--muted);
      border-radius: 6px;
      cursor: pointer;
      align-self: center;
      grid-row: 1 / span 2;
      grid-column: 2;
    }
    .chatDelete:hover {
      color: var(--danger);
      border-color: #5a3030;
      background: #2b1719;
    }
    .main {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-width: 0;
      height: 100vh;
      min-height: 0;
      background: var(--panel);
      overflow: hidden;
    }
    .topbar {
      border-bottom: 1px solid var(--line);
      padding: 12px 18px;
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      gap: 3px 12px;
      align-items: center;
    }
    .title {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      grid-column: 1;
      grid-row: 1;
    }
    .workspace {
      color: var(--muted);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      grid-column: 1;
      grid-row: 2;
    }
    .settingsBtn {
      grid-column: 2;
      grid-row: 1 / span 2;
      font-size: 18px;
      padding: 6px 10px;
    }
    .settingsOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .settingsOverlay.hidden { display: none; }
    .settingsPanel {
      background: var(--panel);
      color: var(--text);
      width: min(720px, 92vw);
      max-height: 86vh;
      border-radius: 12px;
      border: 1px solid var(--line);
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .settingsHead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--line);
    }
    .settingsHead h2 {
      margin: 0;
      font-size: 16px;
    }
    .settingsHint {
      margin: 12px 20px 4px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .settingsHint code {
      background: var(--code-bg, #1e1e1e);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .settingsBody {
      overflow-y: auto;
      padding: 12px 20px 20px;
      display: grid;
      gap: 18px;
    }
    .settingsGroup h3 {
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
    }
    .settingsItem {
      display: grid;
      grid-template-columns: 24px 1fr auto;
      gap: 10px;
      align-items: start;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      margin-bottom: 6px;
    }
    .settingsItem input[type="checkbox"] {
      margin-top: 3px;
      width: 18px;
      height: 18px;
    }
    .settingsItem .name {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-weight: 600;
      font-size: 14px;
    }
    .settingsItem .desc {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
      margin-top: 2px;
    }
    .riskBadge {
      align-self: center;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .riskBadge.low    { background: rgba(34,197,94,0.15);  color: #22c55e; border: 1px solid rgba(34,197,94,0.35); }
    .riskBadge.medium { background: rgba(234,179,8,0.15);  color: #eab308; border: 1px solid rgba(234,179,8,0.35); }
    .riskBadge.high   { background: rgba(239,68,68,0.15);  color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }

    .newChatBtn {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      margin: 8px 0;
    }
    .formField {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }
    .formField > span {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .formField input {
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      font-size: 14px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
    }
    .recentProjects {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }
    .recentProjects .chip {
      cursor: pointer;
      font-size: 12px;
      padding: 4px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: transparent;
      color: var(--muted);
    }
    .recentProjects .chip:hover {
      color: var(--text);
      border-color: var(--text);
    }
    .recentProjects .chip.missing {
      opacity: 0.5;
      text-decoration: line-through;
    }
    .checkboxRow {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 14px;
      font-size: 13px;
      color: var(--muted);
    }
    .formActions {
      display: flex;
      justify-content: flex-end;
    }
    .primaryBtn {
      background: var(--accent, #4f46e5);
      color: white;
      padding: 8px 16px;
      font-weight: 600;
    }
    .formError {
      margin-top: 10px;
      padding: 10px 12px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.35);
      border-radius: 8px;
      color: #ef4444;
      font-size: 13px;
    }
    .formError.hidden { display: none; }
    .chatItem .chatFolder {
      font-size: 11px;
      color: var(--muted);
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pathRow {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .pathRow input {
      flex: 1;
    }
    .pathRow .iconBtn {
      white-space: nowrap;
    }
    .browseSection {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      background: #0f1115;
    }
    .browseSection.hidden { display: none; }
    .browsePath {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12px;
      color: var(--text);
      margin-bottom: 10px;
      padding: 6px 8px;
      background: rgba(255,255,255,0.04);
      border-radius: 4px;
      word-break: break-all;
    }
    .browseControls {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .checkboxRow.inline {
      margin: 0;
    }
    .browseList {
      max-height: 280px;
      overflow-y: auto;
      display: grid;
      gap: 2px;
      font-size: 13px;
    }
    .browseRow {
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text);
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      display: block;
      width: 100%;
    }
    .browseRow:hover {
      background: rgba(255,255,255,0.05);
      border-color: var(--line);
    }
    .browseEmpty {
      color: var(--muted);
      font-size: 13px;
      padding: 8px;
      text-align: center;
    }
    .browseTruncated {
      margin-top: 6px;
      font-size: 11px;
      color: var(--muted);
      font-style: italic;
    }
    .browseTruncated.hidden { display: none; }
    .createFolderRow {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .createFolderRow.hidden { display: none; }
    .createFolderRow input {
      flex: 1;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
    }
    .messages {
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--panel);
    }
    .empty {
      margin: auto;
      color: var(--muted);
      text-align: center;
      max-width: 420px;
      line-height: 1.5;
    }
    .msg {
      max-width: min(860px, 92%);
      display: grid;
      gap: 6px;
    }
    .msg.user {
      align-self: flex-end;
    }
    .msg.assistant {
      align-self: flex-start;
    }
    .role {
      font-size: 12px;
      color: var(--muted);
      padding: 0 2px;
    }
    .bubble {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px 14px;
      line-height: 1.48;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--bubble);
      color: var(--text);
    }
    .user .bubble {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .composer {
      padding: 14px 18px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 10px;
      background: var(--panel-2);
    }
    .bottomBar {
      border-top: 1px solid var(--line);
      background: var(--panel-2);
    }
    textarea {
      resize: none;
      min-height: 48px;
      max-height: 180px;
      border: 1px solid var(--line);
      background: #10141a;
      color: var(--text);
      border-radius: 8px;
      padding: 12px;
      line-height: 1.4;
      width: 100%;
    }
    .sendBtn {
      height: 48px;
      padding: 0 16px;
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
      font-weight: 700;
    }
    .sendBtn:hover {
      background: var(--accent-strong);
      border-color: var(--accent-strong);
    }
    .codeBtn {
      height: 48px;
      padding: 0 14px;
      border: 1px solid var(--line);
      background: #1a1f27;
      color: var(--text);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
    }
    .codeBtn:hover {
      border-color: var(--line-strong);
      background: #222936;
    }
    .codeBtn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .sendBtn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .status {
      color: var(--muted);
      font-size: 12px;
      min-height: 16px;
      padding: 0 18px 12px;
      background: var(--panel-2);
    }
    .error { color: var(--danger); }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="sideHead">
        <div class="brand">DeepSeek Workspace</div>
        <button id="refreshBtn" class="iconBtn" title="Refresh">↻</button>
      </div>
      <button id="openNewChat" class="iconBtn newChatBtn" type="button">+ New chat</button>

      <div id="newChatOverlay" class="settingsOverlay hidden" aria-hidden="true">
        <div class="settingsPanel" role="dialog" aria-modal="true" aria-labelledby="newChatTitle">
          <div class="settingsHead">
            <h2 id="newChatTitle">Новый чат</h2>
            <button id="newChatClose" class="iconBtn" type="button" aria-label="Close">✕</button>
          </div>
          <form id="newForm" class="newForm" autocomplete="off">
            <label class="formField">
              <span>Название чата (опционально)</span>
              <input id="newTitle" placeholder="Например: рефакторинг auth" autocomplete="off">
            </label>

            <label class="formField">
              <span>Папка проекта</span>
              <div class="pathRow">
                <input id="newWorkspace" placeholder="/Users/.../project или ~/Projects/new-thing" autocomplete="off">
                <button type="button" id="browseBtn" class="iconBtn">📁 Обзор</button>
              </div>
            </label>

            <div id="browseSection" class="browseSection hidden">
              <div class="browsePath" id="browsePath"></div>
              <div class="browseControls">
                <button type="button" id="browseUp" class="iconBtn">↑ Вверх</button>
                <button type="button" id="browseHome" class="iconBtn">🏠 Home</button>
                <button type="button" id="browseNewFolder" class="iconBtn">➕ Новая папка</button>
                <label class="checkboxRow inline">
                  <input type="checkbox" id="browseShowHidden">
                  <span>Скрытые</span>
                </label>
                <button type="button" id="browsePick" class="iconBtn primaryBtn">Выбрать эту папку</button>
              </div>
              <div id="createFolderRow" class="createFolderRow hidden">
                <input id="createFolderInput" placeholder="Имя новой папки" autocomplete="off">
                <button type="button" id="createFolderConfirm" class="iconBtn primaryBtn">Создать</button>
                <button type="button" id="createFolderCancel" class="iconBtn">Отмена</button>
              </div>
              <div id="createFolderError" class="formError hidden"></div>
              <div id="browseList" class="browseList">Loading...</div>
              <div id="browseTruncated" class="browseTruncated hidden">Показано первые 500 — папка содержит больше.</div>
            </div>

            <div id="recentProjects" class="recentProjects"></div>

            <label class="checkboxRow">
              <input id="newCreateFolder" type="checkbox">
              <span>Создать папку, если её ещё нет (только под твоим $HOME)</span>
            </label>

            <div class="formActions">
              <button type="submit" class="iconBtn primaryBtn">Создать чат</button>
            </div>
            <div id="newFormError" class="formError hidden"></div>
          </form>
        </div>
      </div>
      <div id="chatList" class="chatList"></div>
    </aside>
    <div id="sidebarResizer" class="sidebarResizer" title="Изменить ширину списка чатов"></div>
    <main class="main">
      <header class="topbar">
        <div id="activeTitle" class="title">No chat selected</div>
        <div id="workspace" class="workspace"></div>
        <button id="settingsBtn" class="iconBtn settingsBtn" type="button" title="Settings / разрешённые команды">⚙</button>
      </header>

      <div id="settingsOverlay" class="settingsOverlay hidden" aria-hidden="true">
        <div class="settingsPanel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
          <div class="settingsHead">
            <h2 id="settingsTitle">Settings — разрешённые команды для /code</h2>
            <button id="settingsClose" class="iconBtn" type="button" aria-label="Close">✕</button>
          </div>
          <p class="settingsHint">
            Каждая команда — это то, что LLM-агент может запустить через <code>run_command</code> в режиме <code>/code</code>.
            Включай только то, что реально нужно: чем шире allow-list, тем больше поверхность атаки.
            Файл настроек: <code>~/.deepseek-cli/settings.json</code>.
          </p>
          <div id="settingsBody" class="settingsBody">Loading…</div>
        </div>
      </div>
      <section id="messages" class="messages">
        <div class="empty">Создай чат слева. Каждый чат можно использовать как отдельный проект или рабочий контекст.</div>
      </section>
      <div class="bottomBar">
        <form id="composer" class="composer">
          <textarea id="messageInput" placeholder="Сообщение DeepSeek... или /code создай файл app.js" disabled></textarea>
          <button id="codeBtn" class="codeBtn" type="button" disabled>/code</button>
          <button id="sendBtn" class="sendBtn" type="submit" disabled>Send</button>
        </form>
        <div id="status" class="status"></div>
      </div>
    </main>
  </div>

  <script>
    let appState = { conversations: [], activeConversationId: null, workspaceRoot: "" };
    let activeConversation = null;
    let sending = false;

    const chatList = document.getElementById("chatList");
    const appShell = document.querySelector(".app");
    const sidebarResizer = document.getElementById("sidebarResizer");
    const messages = document.getElementById("messages");
    const activeTitle = document.getElementById("activeTitle");
    const workspace = document.getElementById("workspace");
    const statusEl = document.getElementById("status");
    const messageInput = document.getElementById("messageInput");
    const codeBtn = document.getElementById("codeBtn");
    const sendBtn = document.getElementById("sendBtn");
    const SIDEBAR_WIDTH_KEY = "deepseek.sidebarWidth";

    applySavedSidebarWidth();
    setupSidebarResize();

    document.getElementById("refreshBtn").addEventListener("click", loadState);
    // ---- New chat modal ----
    const newChatOverlay = document.getElementById("newChatOverlay");
    const openNewChatBtn = document.getElementById("openNewChat");
    const newChatClose = document.getElementById("newChatClose");
    const newTitleInput = document.getElementById("newTitle");
    const newWorkspaceInput = document.getElementById("newWorkspace");
    const newCreateFolder = document.getElementById("newCreateFolder");
    const newFormError = document.getElementById("newFormError");
    const recentProjects = document.getElementById("recentProjects");

    openNewChatBtn.addEventListener("click", openNewChatModal);
    newChatClose.addEventListener("click", closeNewChatModal);
    newChatOverlay.addEventListener("click", (e) => {
      if (e.target === newChatOverlay) closeNewChatModal();
    });

    async function openNewChatModal() {
      newFormError.classList.add("hidden");
      newFormError.textContent = "";
      newTitleInput.value = "";
      newCreateFolder.checked = false;
      recentProjects.innerHTML = "";
      newChatOverlay.classList.remove("hidden");
      newChatOverlay.setAttribute("aria-hidden", "false");
      // Подтягиваем список ранее использованных проектов.
      try {
        const data = await api("/api/projects");
        newWorkspaceInput.value = data.defaultWorkspace || "";
        for (const project of data.projects || []) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip" + (project.exists ? "" : " missing");
          chip.title = project.path + (project.isDefault ? " (по умолчанию)" : "");
          chip.textContent = project.name + (project.isDefault ? " ★" : "");
          chip.addEventListener("click", () => { newWorkspaceInput.value = project.path; });
          recentProjects.appendChild(chip);
        }
      } catch {
        // не критично — просто не покажем список
      }
      newTitleInput.focus();
    }
    function closeNewChatModal() {
      newChatOverlay.classList.add("hidden");
      newChatOverlay.setAttribute("aria-hidden", "true");
    }

    // ---- Folder browser inside new chat modal ----
    const browseBtn = document.getElementById("browseBtn");
    const browseSection = document.getElementById("browseSection");
    const browsePath = document.getElementById("browsePath");
    const browseUp = document.getElementById("browseUp");
    const browseHome = document.getElementById("browseHome");
    const browsePick = document.getElementById("browsePick");
    const browseList = document.getElementById("browseList");
    const browseShowHidden = document.getElementById("browseShowHidden");
    const browseTruncated = document.getElementById("browseTruncated");

    let currentBrowsePath = null;
    let currentBrowseParent = null;
    let browseHome_ = null;

    browseBtn.addEventListener("click", async () => {
      if (browseSection.classList.contains("hidden")) {
        browseSection.classList.remove("hidden");
        // Стартуем с того, что в поле ввода. Если пусто — с домашней папки.
        const start = newWorkspaceInput.value.trim() || null;
        await navigateBrowse(start);
      } else {
        browseSection.classList.add("hidden");
      }
    });

    browseUp.addEventListener("click", () => {
      if (currentBrowseParent) navigateBrowse(currentBrowseParent);
    });
    browseHome.addEventListener("click", () => navigateBrowse(browseHome_));
    browsePick.addEventListener("click", () => {
      if (currentBrowsePath) {
        newWorkspaceInput.value = currentBrowsePath;
        browseSection.classList.add("hidden");
      }
    });
    browseShowHidden.addEventListener("change", () => {
      if (currentBrowsePath) navigateBrowse(currentBrowsePath);
    });

    // ---- Create new folder inline ----
    const browseNewFolder = document.getElementById("browseNewFolder");
    const createFolderRow = document.getElementById("createFolderRow");
    const createFolderInput = document.getElementById("createFolderInput");
    const createFolderConfirm = document.getElementById("createFolderConfirm");
    const createFolderCancel = document.getElementById("createFolderCancel");
    const createFolderError = document.getElementById("createFolderError");

    function showCreateFolderRow() {
      createFolderError.classList.add("hidden");
      createFolderError.textContent = "";
      createFolderInput.value = "";
      createFolderRow.classList.remove("hidden");
      createFolderInput.focus();
    }
    function hideCreateFolderRow() {
      createFolderRow.classList.add("hidden");
      createFolderError.classList.add("hidden");
    }

    browseNewFolder.addEventListener("click", showCreateFolderRow);
    createFolderCancel.addEventListener("click", hideCreateFolderRow);
    createFolderInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createFolderConfirm.click();
      } else if (e.key === "Escape") {
        hideCreateFolderRow();
      }
    });

    createFolderConfirm.addEventListener("click", async () => {
      const name = createFolderInput.value.trim();
      if (!name) {
        createFolderError.textContent = "Введи имя.";
        createFolderError.classList.remove("hidden");
        return;
      }
      if (!currentBrowsePath) return;
      createFolderError.classList.add("hidden");
      try {
        const data = await api("/api/browse/mkdir", {
          method: "POST",
          body: { parent: currentBrowsePath, name },
        });
        hideCreateFolderRow();
        // Сразу заходим в созданную папку — обычно юзер хочет именно это.
        await navigateBrowse(data.path);
      } catch (err) {
        createFolderError.textContent = err.message;
        createFolderError.classList.remove("hidden");
      }
    });

    async function navigateBrowse(targetPath) {
      browseList.textContent = "Загружаю...";
      browseTruncated.classList.add("hidden");
      try {
        const params = new URLSearchParams();
        if (targetPath) params.set("path", targetPath);
        params.set("hidden", browseShowHidden.checked ? "1" : "0");
        const data = await api("/api/browse?" + params.toString());
        currentBrowsePath = data.path;
        currentBrowseParent = data.parent;
        browseHome_ = data.home;
        browsePath.textContent = data.path;
        browseUp.disabled = !data.parent;
        browseList.innerHTML = "";
        if (!data.entries.length) {
          const empty = document.createElement("div");
          empty.className = "browseEmpty";
          empty.textContent = "(нет подпапок)";
          browseList.appendChild(empty);
        } else {
          for (const entry of data.entries) {
            const row = document.createElement("button");
            row.type = "button";
            row.className = "browseRow";
            row.textContent = "📁  " + entry.name;
            row.title = entry.path;
            row.addEventListener("click", () => navigateBrowse(entry.path));
            browseList.appendChild(row);
          }
        }
        if (data.truncated) browseTruncated.classList.remove("hidden");
      } catch (err) {
        browseList.textContent = "Ошибка: " + err.message;
      }
    }

    document.getElementById("newForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = newTitleInput.value.trim();
      const workspace = newWorkspaceInput.value.trim();
      const createFolder = newCreateFolder.checked;
      newFormError.classList.add("hidden");
      newFormError.textContent = "";
      setStatus("Creating chat...");
      try {
        const data = await api("/api/conversations", {
          method: "POST",
          body: { title, workspace, createFolder },
        });
        activeConversation = data.conversation;
        await loadState(activeConversation.id);
        renderConversation(activeConversation);
        closeNewChatModal();
        setStatus("");
      } catch (err) {
        newFormError.textContent = err.message;
        newFormError.classList.remove("hidden");
        setStatus("");
      }
    });

    document.getElementById("composer").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!activeConversation || sending) return;
      const content = messageInput.value.trim();
      if (!content) return;

      sending = true;
      setComposerEnabled(false);
      messageInput.value = "";
      activeConversation.messages.push({ role: "user", content });
      renderConversation(activeConversation);
      setStatus("DeepSeek is thinking...");

      try {
        const data = await api("/api/conversations/" + activeConversation.id + "/messages", {
          method: "POST",
          body: { content },
        });
        activeConversation = data.conversation;
        await loadState(activeConversation.id);
        renderConversation(activeConversation);
        setStatus("");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        sending = false;
        setComposerEnabled(true);
        messageInput.focus();
      }
    });

    messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        document.getElementById("composer").requestSubmit();
      }
    });

    codeBtn.addEventListener("click", () => {
      if (!activeConversation || sending) return;
      const value = messageInput.value.trim();
      if (value.startsWith("/code")) {
        messageInput.focus();
        return;
      }
      messageInput.value = value ? "/code " + value : "/code ";
      messageInput.focus();
      messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
    });

    async function loadState(nextActiveId = null) {
      appState = await api("/api/state");
      if (nextActiveId) appState.activeConversationId = nextActiveId;
      renderList();
      if (appState.activeConversationId) {
        const data = await api("/api/conversations/" + appState.activeConversationId);
        activeConversation = data.conversation;
        renderConversation(activeConversation);
      } else {
        activeConversation = null;
        renderNoConversation();
      }
    }

    function renderList() {
      chatList.innerHTML = "";
      for (const conversation of appState.conversations) {
        const button = document.createElement("button");
        button.className = "chatItem" + (conversation.id === appState.activeConversationId ? " active" : "");
        button.innerHTML =
          '<div class="chatTitle"></div><div class="chatFolder"></div><div class="chatMeta"></div><button class="chatDelete" type="button" title="Удалить чат">×</button>';
        button.querySelector(".chatTitle").textContent = conversation.title;
        // Папка проекта — короткое имя (basename) с полным путём в tooltip.
        const folderEl = button.querySelector(".chatFolder");
        const ws = conversation.workspace || "";
        if (ws) {
          const parts = ws.split("/").filter(Boolean);
          folderEl.textContent = "📁 " + (parts[parts.length - 1] || ws);
          folderEl.title = ws;
        } else {
          folderEl.style.display = "none";
        }
        button.querySelector(".chatMeta").textContent =
          conversation.messageCount + " messages";
        button.querySelector(".chatDelete").addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!confirm("Удалить чат?")) return;
          await api("/api/conversations/" + conversation.id, { method: "DELETE" });
          if (activeConversation && activeConversation.id === conversation.id) {
            activeConversation = null;
          }
          await loadState();
          if (!appState.activeConversationId) renderNoConversation();
        });
        button.addEventListener("click", async () => {
          const data = await api("/api/conversations/" + conversation.id);
          appState.activeConversationId = conversation.id;
          activeConversation = data.conversation;
          renderList();
          renderConversation(activeConversation);
        });
        chatList.appendChild(button);
      }
    }

    function renderNoConversation() {
      activeTitle.textContent = "No chat selected";
      workspace.textContent = appState.workspaceRoot || "";
      messages.innerHTML = '<div class="empty">Создай чат слева. Каждый чат можно использовать как отдельный проект или рабочий контекст.</div>';
      setComposerEnabled(false);
    }

    function renderConversation(conversation) {
      activeTitle.textContent = conversation.title;
      workspace.textContent = conversation.workspace || appState.workspaceRoot;
      if (appState.stateFile) workspace.title = "History: " + appState.stateFile;
      setComposerEnabled(!sending);
      messages.innerHTML = "";

      if (!conversation.messages.length) {
        messages.innerHTML = '<div class="empty">Напиши первое сообщение для этого проекта.</div>';
        return;
      }

      for (const message of conversation.messages) {
        const row = document.createElement("article");
        row.className = "msg " + message.role;
        const role = document.createElement("div");
        role.className = "role";
        role.textContent = message.role === "user" ? "You" : "DeepSeek";
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.textContent = message.content;
        row.append(role, bubble);
        messages.appendChild(row);
      }
      messages.scrollTop = messages.scrollHeight;
    }

    function setComposerEnabled(enabled) {
      messageInput.disabled = !enabled || !activeConversation;
      codeBtn.disabled = !enabled || !activeConversation;
      sendBtn.disabled = !enabled || !activeConversation;
    }

    function setStatus(text, isError = false) {
      statusEl.textContent = text;
      statusEl.className = "status" + (isError ? " error" : "");
    }

    async function api(url, options = {}) {
      const fetchOptions = {
        method: options.method || "GET",
        headers: { "Content-Type": "application/json" },
      };
      if (options.body) fetchOptions.body = JSON.stringify(options.body);
      const res = await fetch(url, fetchOptions);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    }

    // ---- Heartbeat: закрываем окно, когда CLI остановлен (Ctrl+C / закрыли терминал).
    // Три промаха подряд → сервер точно мёртв → показываем сообщение и закрываем окно.
    // Порог в 3 защищает от случайного network blip (например, рестарт сервера юзером).
    let heartbeatFailures = 0;
    let shutdownStarted = false;
    async function tickHeartbeat() {
      if (shutdownStarted) return;
      try {
        const res = await fetch("/api/heartbeat", { cache: "no-store" });
        if (!res.ok) throw new Error("heartbeat not ok");
        heartbeatFailures = 0;
      } catch {
        heartbeatFailures += 1;
        if (heartbeatFailures >= 3) {
          shutdownStarted = true;
          // Показываем чистую заглушку и закрываем.
          document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;color:#888;font-family:system-ui;background:#0a0a0a;text-align:center;padding:24px">' +
            '<div style="font-size:18px">CLI остановлен</div>' +
            '<div style="font-size:13px;color:#666">Сервер больше не отвечает. Окно закроется автоматически.</div>' +
            "</div>";
          setTimeout(() => {
            try { window.close(); } catch {}
          }, 600);
        }
      }
    }
    setInterval(tickHeartbeat, 2000);

    // ---- Settings modal (разрешённые команды для /code) ----
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsClose = document.getElementById("settingsClose");
    const settingsBody = document.getElementById("settingsBody");

    settingsBtn.addEventListener("click", openSettings);
    settingsClose.addEventListener("click", closeSettings);
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !settingsOverlay.classList.contains("hidden")) closeSettings();
    });

    async function openSettings() {
      settingsOverlay.classList.remove("hidden");
      settingsOverlay.setAttribute("aria-hidden", "false");
      settingsBody.textContent = "Loading…";
      try {
        const data = await api("/api/settings");
        renderSettings(data);
      } catch (err) {
        settingsBody.textContent = "Не удалось загрузить настройки: " + err.message;
      }
    }
    function closeSettings() {
      settingsOverlay.classList.add("hidden");
      settingsOverlay.setAttribute("aria-hidden", "true");
    }

    function renderSettings({ catalog, allowedCommands }) {
      const allowed = new Set(allowedCommands || []);
      const groups = { low: [], medium: [], high: [] };
      for (const item of catalog) {
        (groups[item.risk] || groups.low).push(item);
      }
      const labels = { low: "Низкий риск", medium: "Средний риск", high: "Высокий риск" };
      const order = ["low", "medium", "high"];
      settingsBody.innerHTML = "";
      for (const key of order) {
        const items = groups[key];
        if (!items.length) continue;
        const groupEl = document.createElement("div");
        groupEl.className = "settingsGroup";
        const heading = document.createElement("h3");
        heading.textContent = labels[key];
        groupEl.appendChild(heading);
        for (const item of items) {
          const row = document.createElement("label");
          row.className = "settingsItem";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = allowed.has(item.name);
          cb.dataset.cmd = item.name;
          cb.addEventListener("change", onToggle);

          const textWrap = document.createElement("div");
          const nameEl = document.createElement("div");
          nameEl.className = "name";
          nameEl.textContent = item.name;
          const descEl = document.createElement("div");
          descEl.className = "desc";
          descEl.textContent = item.description;
          textWrap.appendChild(nameEl);
          textWrap.appendChild(descEl);

          const badge = document.createElement("span");
          badge.className = "riskBadge " + item.risk;
          badge.textContent = item.risk;

          row.appendChild(cb);
          row.appendChild(textWrap);
          row.appendChild(badge);
          groupEl.appendChild(row);
        }
        settingsBody.appendChild(groupEl);
      }
    }

    async function onToggle() {
      // Собираем актуальный список из всех чекбоксов и пушим на сервер.
      const allCheckboxes = settingsBody.querySelectorAll('input[type="checkbox"]');
      const selected = Array.from(allCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.dataset.cmd);
      try {
        await api("/api/settings", { method: "PUT", body: { allowedCommands: selected } });
      } catch (err) {
        // Откат UI на серверное состояние при ошибке.
        const data = await api("/api/settings").catch(() => null);
        if (data) renderSettings(data);
        alert("Не удалось сохранить: " + err.message);
      }
    }

    function applySavedSidebarWidth() {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (Number.isFinite(saved)) applySidebarWidth(saved);
    }

    function setupSidebarResize() {
      let dragging = false;

      sidebarResizer.addEventListener("pointerdown", (event) => {
        dragging = true;
        sidebarResizer.classList.add("dragging");
        document.body.classList.add("resizingSidebar");
        sidebarResizer.setPointerCapture(event.pointerId);
        event.preventDefault();
      });

      sidebarResizer.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const rect = appShell.getBoundingClientRect();
        applySidebarWidth(event.clientX - rect.left);
      });

      const finishDrag = (event) => {
        if (!dragging) return;
        dragging = false;
        sidebarResizer.classList.remove("dragging");
        document.body.classList.remove("resizingSidebar");
        try {
          sidebarResizer.releasePointerCapture(event.pointerId);
        } catch {}
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(getSidebarWidth()));
      };

      sidebarResizer.addEventListener("pointerup", finishDrag);
      sidebarResizer.addEventListener("pointercancel", finishDrag);
    }

    function applySidebarWidth(rawWidth) {
      const maxWidth = Math.max(260, Math.min(560, Math.floor(window.innerWidth * 0.55)));
      const width = Math.max(220, Math.min(maxWidth, Math.round(rawWidth)));
      appShell.style.setProperty("--sidebar-width", width + "px");
    }

    function getSidebarWidth() {
      return parseInt(getComputedStyle(appShell).getPropertyValue("--sidebar-width"), 10) || 300;
    }

    loadState().catch((error) => setStatus(error.message, true));
  </script>
</body>
</html>`;
}
