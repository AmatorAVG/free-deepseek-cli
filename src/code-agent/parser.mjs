// Парсер JSON-tool-call'а из ответа LLM. Терпим к обёрткам в ```json...``` и
// к лишнему тексту вокруг JSON-объекта.

export function parseToolCall(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let candidate = fenced ? fenced[1].trim() : trimmed;

  candidate = extractFirstJsonObject(candidate) || candidate;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && typeof parsed.tool === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

// Безопасный экстрактор первого валидного JSON-объекта из текста.
// Уважает строки и эскейпы, не путается на скобках внутри значений.
export function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}
