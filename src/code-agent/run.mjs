// Главная петля /code-агента. Шлёт system prompt → парсит ответ → если это tool-call,
// исполняет → формирует следующий prompt с результатом → повторяет до finish.
// Жёсткий лимит 10 шагов на задачу.

import { createCodeSystemPrompt } from "./prompt.mjs";
import { parseToolCall } from "./parser.mjs";
import { executeWorkspaceTool } from "./executor.mjs";

export async function runCodeTask(
  client,
  baseOptions,
  workspaceRoot,
  task,
  parentMessageId = null,
  options = {},
) {
  let prompt = createCodeSystemPrompt(workspaceRoot, task);
  let parent = parentMessageId;
  const toolLogs = [];

  for (let step = 0; step < 10; step += 1) {
    const result = await client.complete({
      ...baseOptions,
      prompt,
      parentMessageId: parent,
    });
    parent = result.lastAssistantMessageId ?? parent;

    const call = parseToolCall(result.text);
    if (!call) {
      options.onAssistant?.(result.text);
      return { parentMessageId: parent, message: result.text, toolLogs };
    }

    let toolResult;
    try {
      toolResult = await executeWorkspaceTool(workspaceRoot, call);
    } catch (error) {
      toolResult = { ok: false, error: error.message };
    }

    if (toolResult.done) {
      options.onAssistant?.(toolResult.message);
      return { parentMessageId: parent, message: toolResult.message, toolLogs };
    }

    const log = formatToolLog(call, toolResult);
    toolLogs.push(log);
    options.onTool?.(call, toolResult, log);
    prompt = `Tool result for ${call.tool}:
${JSON.stringify(toolResult, null, 2)}

Continue the task. If more file access is needed, request one tool call as JSON. If finished, call finish.`;
  }

  const message = "Error: /code reached the tool-step limit.";
  options.onAssistant?.(message);
  return { parentMessageId: parent, message, toolLogs };
}

export function formatToolLog(call, result) {
  const target = call.path || call.cmd || "";
  const header = `[tool] ${call.tool} ${target}`.trim();

  if (call.tool !== "run_command") return header;

  const lines = [
    header,
    `status: ${result.status}${result.timedOut ? " (timed out)" : ""}`,
  ];

  if (result.stdout) lines.push(`stdout:\n${result.stdout.trimEnd()}`);
  if (result.stderr) lines.push(`stderr:\n${result.stderr.trimEnd()}`);
  if (!result.stdout && !result.stderr) lines.push("[no output]");

  return lines.join("\n");
}
