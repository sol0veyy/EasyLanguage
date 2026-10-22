// Обёртки над глобальным chrome.* API без привязки к домену.

/**
 * Контекст расширения "умер" (расширение перезагрузили, а вкладка открыта
 * была до этого) — обращения к chrome.* бросают "Extension context invalidated".
 */
export function chromeAlive(): boolean {
  try {
    return Boolean(chrome.runtime?.id)
  } catch {
    return false
  }
}
