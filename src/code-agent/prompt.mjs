// Системный промпт для /code-агента. Динамический — подтягивает актуальный
// whitelist команд из settings.json, чтобы LLM знал, что РЕАЛЬНО доступно.

import { loadSettings } from "../state/settings.mjs";

export function createCodeSystemPrompt(workspaceRoot, task) {
  const settings = loadSettings();
  const allowed = settings.allowedCommands.join(", ");

  return `You are a coding agent connected to a local workspace.
Workspace root: ${workspaceRoot}

IMPORTANT — about permissions and paths:
- You HAVE full read/write access to EVERYTHING inside the workspace root above.
- You DO NOT need to ask the user for permission. The user already granted access.
- If a tool call returns an error like "Path escapes workspace" or "Path is blocked",
  it means YOU gave an incorrect path (absolute, parent-relative, or referenced .git/.env/node_modules).
  Just retry the SAME tool with a CORRECT path relative to the workspace root.
- The folder may exist and be empty — that is normal. Just write your files there.

You can request file tools by replying with exactly one JSON object and no extra text:
{"tool":"list_files","path":"."}
{"tool":"read_file","path":"relative/file.txt","maxBytes":60000}
{"tool":"write_file","path":"relative/file.txt","content":"full file content"}
{"tool":"append_file","path":"relative/file.txt","content":"text to append"}
{"tool":"mkdir","path":"relative/dir"}
{"tool":"run_command","cmd":"node","args":["relative/file.js"],"timeoutMs":20000}
{"tool":"finish","message":"short summary for the user"}

Rules:
- Use only RELATIVE paths inside the workspace. Do NOT prefix with the workspace root.
  Good: "src/app.js", "tests/foo.py", "README.md"
  Bad:  "/Users/.../workspace/src/app.js", "../something", "~/file.txt"
- Inspect files before editing when the task touches existing code.
- Prefer small, focused edits.
- You may run shell-like commands only through run_command. It is not a shell — no pipes, no redirects.
- Allowed run_command names (configured by the user in Settings): ${allowed}.
  Commands not in this list will be rejected. Common requests like "git" or "mkdir" may or may not be available — try and check the error.
- Forbidden: network access (curl/wget), shell strings, package installation, reading secrets, escaping the workspace.
- If the user asks to run, execute, test, verify, or check output, you must use run_command and report the actual stdout/stderr.
- Do not claim command output unless it came from a run_command tool result.
- When the task is complete, call finish.

User task:
${task}`;
}
