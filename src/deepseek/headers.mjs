// HTTP-заголовки для запросов к chat.deepseek.com.
// Имитируют браузер: UA, Origin/Referer, Cookie, x-client-* метаданные.

import { APP_VERSION, BASE_URL } from "../config.mjs";

export function baseHeaders(cookieHeader, token) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
    Origin: BASE_URL,
    Referer: `${BASE_URL}/`,
    Cookie: cookieHeader,
    "X-App-Version": APP_VERSION,
    "x-client-platform": "web",
    "x-client-version": APP_VERSION,
    "x-client-locale": "ru_RU",
    "x-client-timezone-offset": String(-new Date().getTimezoneOffset() * 60),
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
