// Перевод слова/фразы для тултипа: сначала прямой запрос, при неудаче
// (CORS/сеть) просим background — у него есть host_permissions.

import { fetchTranslation } from "../../../shared/api/translation"
import { chromeAlive } from "../../../shared/lib/chrome"
import { log, logWarn } from "../../../shared/lib/logger"

export async function translateText(text: string): Promise<string> {
  try {
    const translation = await fetchTranslation(text)
    log("translation: прямой запрос ok")
    return translation
  } catch (err) {
    logWarn("translation: прямой запрос не удался, пробую через background", err)
    if (!chromeAlive()) throw new Error("extension context invalidated")
    const res = (await chrome.runtime.sendMessage({
      type: "easylang:translate",
      text,
    })) as { translation?: string } | undefined
    if (res?.translation) {
      log("translation: через background ok")
      return res.translation
    }
    logWarn("translation: background не вернул перевод")
    throw new Error("translation unavailable")
  }
}
