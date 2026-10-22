// Виджет word-tooltip: при выделении английского слова или фразы показывает
// под выделением всплывающее окошко с переводом на русский.
// Слово/фразу можно добавить в личный словарь (кнопка в окошке).

import {
  addWord,
  getWordbook,
  keyOf,
  STATUS_COLORS,
  STATUS_LABELS,
  STORAGE_KEY,
  type Wordbook,
  type WordEntry
} from "../../entities/wordbook"
import { chromeAlive } from "../../shared/lib/chrome"
import { log, logError, logWarn } from "../../shared/lib/logger"
import { getSelectedText } from "./lib/selection"
import { translateText } from "./lib/translate"

let popup: HTMLDivElement | null = null
let requestId = 0
let lastKey = ""
let debounceTimer: number | undefined
// актуальное состояние тултипа — для синхронизации при изменениях словаря
let current: {
  text: string
  translation: string
  footer: HTMLDivElement
} | null = null

/* --------------------------------- popup --------------------------------- */

function ensurePopup(): HTMLDivElement {
  if (popup && document.documentElement.contains(popup)) return popup

  const el = document.createElement("div")
  el.setAttribute("data-easylang-popup", "")
  el.style.cssText = [
    "position:fixed",
    "z-index:2147483647",
    "max-width:360px",
    "min-width:40px",
    "max-height:240px",
    "overflow:hidden",
    "padding:6px 10px",
    "border-radius:8px",
    "background:rgba(17,24,39,0.95)",
    "color:#f9fafb",
    'font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    "box-shadow:0 4px 16px rgba(0,0,0,0.28)",
    "pointer-events:none",
    "opacity:0",
    "transition:opacity 0.12s ease",
    "word-break:break-word"
  ].join(";")
  document.documentElement.appendChild(el)
  popup = el
  return el
}

function hidePopup() {
  if (current) log("tooltip: скрыт")
  requestId++ // прерываем "устаревшие" переводы
  lastKey = ""
  if (current) current.footer.textContent = "" // не оставлять невидимую, но кликабельную кнопку
  current = null
  if (popup) popup.style.opacity = "0"
}

// Собирает содержимое тултипа и позиционирует его; возвращает footer,
// в который потом рендерится кнопка/бейдж словаря.
function buildPopup(
  el: HTMLDivElement,
  rect: DOMRect,
  source: string | null,
  text: string
): HTMLDivElement {
  el.textContent = ""

  if (source) {
    const src = document.createElement("div")
    src.style.cssText =
      "font-size:11px;color:rgba(249,250,251,0.6);margin-bottom:3px"
    src.textContent = source
    el.appendChild(src)
  }

  const body = document.createElement("div")
  body.textContent = text
  el.appendChild(body)

  const footer = document.createElement("div")
  footer.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;min-height:16px"
  el.appendChild(footer)

  el.style.left = "-9999px"
  el.style.top = "0"
  el.style.opacity = "1"

  const w = el.offsetWidth
  const h = el.offsetHeight
  let left = rect.left + rect.width / 2 - w / 2
  left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - w - 8))
  let top = rect.bottom + 8 // снизу под выделением
  if (top + h > window.innerHeight - 8) {
    top = rect.top - h - 8 // не хватает места — показываем сверху
    if (top < 8) top = 8
  }
  el.style.left = `${left}px`
  el.style.top = `${top}px`

  return footer
}

// Футер тултипа: либо кнопка «＋ В словарь», либо бейдж статуса + «в словаре».
function renderFooter(
  footer: HTMLDivElement,
  text: string,
  translation: string,
  entry: WordEntry | null
) {
  footer.textContent = ""

  if (entry) {
    const badge = document.createElement("span")
    badge.textContent = STATUS_LABELS[entry.status]
    badge.style.cssText = `font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;background:${STATUS_COLORS[entry.status]};color:#111827`
    footer.appendChild(badge)

    const saved = document.createElement("span")
    saved.textContent = "в словаре"
    saved.style.cssText = "font-size:11px;color:rgba(249,250,251,0.5)"
    footer.appendChild(saved)
    return
  }

  log("tooltip: слово не в словаре — рендер кнопки «＋ В словарь»")

  const btn = document.createElement("button")
  btn.textContent = "＋ В словарь"
  btn.style.cssText =
    "pointer-events:auto;cursor:pointer;border:none;border-radius:6px;padding:2px 10px;font-size:12px;background:rgba(255,255,255,0.14);color:#f9fafb"
  btn.addEventListener("mousedown", (e) => e.preventDefault()) // не терять выделение
  btn.addEventListener("click", async () => {
    log(`wordbook: клик «＋ В словарь» для «${text}»`)
    if (!chromeAlive()) {
      logWarn("wordbook: контекст расширения мёртв — не могу добавить")
      renderDeadHint(footer)
      return
    }
    try {
      await addWord(text, translation)
      log(`wordbook: добавлено «${text}»`)
      const wb = await getWordbook()
      if (current && current.text === text) {
        renderFooter(footer, text, translation, wb[keyOf(text)] ?? null)
      }
    } catch (err) {
      if (!chromeAlive()) renderDeadHint(footer)
      else logError("wordbook: не удалось добавить в словарь", err)
    }
  })
  footer.appendChild(btn)
}

// Контекст расширения "умер" — словарь недоступен. Показываем подсказку, а не молчим.
function renderDeadHint(footer: HTMLDivElement) {
  footer.textContent = ""
  const hint = document.createElement("span")
  hint.textContent = "расширение перезагрузилось — обновите страницу (F5)"
  hint.style.cssText = "font-size:11px;color:#fbbf24"
  footer.appendChild(hint)
}

/* ------------------------------- selection ------------------------------- */

function onSelection() {
  const info = getSelectedText(popup)
  if (!info) {
    hidePopup()
    return
  }

  const key = `${info.text}\u0000${Math.round(info.rect.left)},${Math.round(info.rect.top)}`
  if (key === lastKey) return // дублирующее событие (mouseup + selectionchange)
  hidePopup() // прячем старое окошко; сбрасывает lastKey в "", поэтому...
  lastKey = key // ...key ставим после
  const el = ensurePopup()
  const source = info.isPhrase ? info.text : null
  buildPopup(el, info.rect, source, "…")
  const id = ++requestId

  translateText(info.text)
    .then((translation) => {
      if (id !== requestId) return
      const footer = buildPopup(el, info.rect, source, translation)
      current = { text: info.text, translation, footer }
      if (!chromeAlive()) {
        logWarn("tooltip: контекст расширения мёртв — словарь недоступен")
        renderDeadHint(footer)
        return
      }
      renderFooter(footer, info.text, translation, null)
      getWordbook().then((wb) => {
        if (id !== requestId) return
        renderFooter(
          footer,
          info.text,
          translation,
          wb[keyOf(info.text)] ?? null
        )
      })
    })
    .catch((err) => {
      if (id !== requestId) return
      logWarn("translation: не удалось перевести, тултип скрыт", err)
      hidePopup()
    })
}

function scheduleSelection() {
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(onSelection, 150)
}

/* --------------------------------- init ---------------------------------- */

/** Подключает виджет к странице: слушатели выделения и изменений словаря. */
export function initWordTooltip(): void {
  log("word-tooltip: инициализирован")
  document.addEventListener("mouseup", onSelection, true)
  document.addEventListener("selectionchange", scheduleSelection)

  // при прокрутке/ресайзе окошко "отваливается" от выделения — прячем
  window.addEventListener("scroll", hidePopup, true)
  window.addEventListener("resize", hidePopup)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hidePopup()
  })

  // словарь могли поменять в попапе или в другой вкладке — обновляем футер
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY] || !current) return
    log("wordbook: изменён извне — обновляю футер тултипа")
    const wb = (changes[STORAGE_KEY].newValue ?? {}) as Wordbook
    renderFooter(
      current.footer,
      current.text,
      current.translation,
      wb[keyOf(current.text)] ?? null
    )
  })
}
