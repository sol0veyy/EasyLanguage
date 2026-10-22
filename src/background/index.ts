// Background (MV3 service worker, слой app): резервный перевод через запросы
// расширения. У service worker есть host_permissions, поэтому запрос не
// упирается в CORS.

import { fetchTranslation } from "../shared/api/translation"

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "easylang:translate" || typeof msg.text !== "string") return

  fetchTranslation(msg.text)
    .then((translation) => sendResponse({ translation }))
    .catch(() => sendResponse({ translation: "" }))

  return true // ответим асинхронно
})