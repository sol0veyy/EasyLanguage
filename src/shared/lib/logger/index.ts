// Логгер расширения: префикс [easylang] позволяет отфильтровать наши логи
// в консоли браузера (страница / service worker / popup).

export function log(...args: unknown[]): void {
  console.log("[easylang]", ...args)
}

export function logWarn(...args: unknown[]): void {
  console.warn("[easylang]", ...args)
}

export function logError(...args: unknown[]): void {
  console.error("[easylang]", ...args)
}
