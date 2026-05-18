// HTTP-клиент к chat.deepseek.com.
// На каждый запрос — подписи (cookies + Bearer), PoW для completion, SSE-парсинг.
// _withReauth: до двух retry на запрос — после silent refresh и после visible re-login.

import { BASE_URL, COMPLETION_PATH } from "../config.mjs";
import { baseHeaders } from "./headers.mjs";
import { solvePow } from "./pow.mjs";
import { streamSse } from "./sse.mjs";

export class DeepSeekChatClient {
  constructor({ cookieHeader, token, debug, authManager = null }) {
    this.cookieHeader = cookieHeader;
    this.token = token;
    this.debug = debug;
    this.authManager = authManager;
  }

  setAuthManager(authManager) {
    this.authManager = authManager;
  }

  _applyAuth(auth) {
    if (!auth) return;
    if (auth.cookieHeader) this.cookieHeader = auth.cookieHeader;
    if (auth.token) this.token = auth.token;
  }

  // Обёртка с эскалацией: до 2 retry на один API-вызов.
  // 1-й retry — после silent headless refresh.
  // 2-й retry — после visible re-login (forceVisible=true, силент пропускается).
  async _withReauth(fn) {
    let escalate = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        if (!error?.isAuthError || !this.authManager) throw error;
        if (attempt >= 2) throw error;
        if (this.debug) {
          console.error(`[auth] attempt ${attempt + 1} got auth error; refreshing (escalate=${escalate}).`);
        }
        const fresh = await this.authManager.refresh({ forceVisible: escalate });
        this._applyAuth(fresh);
        escalate = true;
      }
    }
    throw new Error("unreachable: _withReauth retry budget exhausted");
  }

  async json(path, opts = {}) {
    return await this._withReauth(() => this._jsonOnce(path, opts));
  }

  async _jsonOnce(path, { method = "GET", body, headers = {} } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...baseHeaders(this.cookieHeader, this.token), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      if (res.status === 401 || res.status === 403) {
        const err = new Error(`Auth required at ${path}: HTTP ${res.status}`);
        err.isAuthError = true;
        throw err;
      }
      throw new Error(
        `Expected JSON from ${path}, got HTTP ${res.status}: ${text.slice(0, 180)}`,
      );
    }

    if (this.debug) {
      console.error(`[debug] ${method} ${path} -> HTTP ${res.status}`, json);
    }

    if (
      res.status === 401 ||
      res.status === 403 ||
      (json && (json.code === 40002 || json.code === 40003))
    ) {
      const err = new Error(
        `Auth required at ${path}: code ${json?.code ?? ""}, http ${res.status}`,
      );
      err.isAuthError = true;
      throw err;
    }

    if (!res.ok || (json.code !== undefined && json.code !== 0)) {
      throw new Error(
        `DeepSeek API error at ${path}: HTTP ${res.status}, code ${json.code}, msg ${json.msg || ""}`,
      );
    }

    return json;
  }

  async createSession() {
    const json = await this.json("/api/v0/chat_session/create", {
      method: "POST",
      body: {},
    });

    const session = json?.data?.biz_data?.chat_session;
    if (!session?.id) {
      throw new Error(`Cannot read chat session id: ${JSON.stringify(json).slice(0, 300)}`);
    }
    return session.id;
  }

  async createPowHeader(targetPath) {
    const json = await this.json("/api/v0/chat/create_pow_challenge", {
      method: "POST",
      body: { target_path: targetPath },
    });

    const challenge = json?.data?.biz_data?.challenge;
    if (!challenge) {
      throw new Error(`Cannot read PoW challenge: ${JSON.stringify(json).slice(0, 300)}`);
    }

    const answer = await solvePow(challenge);
    const payload = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      salt: challenge.salt,
      answer,
      signature: challenge.signature,
      target_path: targetPath,
    };

    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  }

  async complete(args) {
    return await this._withReauth(() => this._completeOnce(args));
  }

  async _completeOnce({
    sessionId,
    prompt,
    parentMessageId = null,
    modelType = null,
    thinkingEnabled = false,
    searchEnabled = false,
    onText = null,
  }) {
    const pow = await this.createPowHeader(COMPLETION_PATH);
    const body = {
      chat_session_id: sessionId,
      parent_message_id: parentMessageId,
      model_type: modelType,
      prompt,
      ref_file_ids: [],
      thinking_enabled: thinkingEnabled,
      search_enabled: searchEnabled,
    };

    const res = await fetch(`${BASE_URL}${COMPLETION_PATH}`, {
      method: "POST",
      headers: {
        ...baseHeaders(this.cookieHeader, this.token),
        "X-DS-PoW-Response": pow,
      },
      body: JSON.stringify(body),
    });

    const contentType = String(res.headers.get("content-type") || "");
    if (!res.ok || !contentType.includes("text/event-stream")) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        const err = new Error(`Auth required during completion: HTTP ${res.status}`);
        err.isAuthError = true;
        throw err;
      }
      try {
        const parsed = JSON.parse(text);
        if (parsed && (parsed.code === 40002 || parsed.code === 40003)) {
          const err = new Error(`Auth required during completion: code ${parsed.code}`);
          err.isAuthError = true;
          throw err;
        }
      } catch (parseError) {
        if (parseError?.isAuthError) throw parseError;
      }
      throw new Error(`Completion failed: HTTP ${res.status}: ${text.slice(0, 1000)}`);
    }

    return streamSse(res, this.debug, onText);
  }
}
