// Извлечение и нормализация выделенного текста со страницы.

import { log } from "../../../shared/lib/logger"

const MAX_PHRASE_LENGTH = 300
const MAX_WORD_COUNT = 50

export interface SelectionInfo {
  text: string
  isPhrase: boolean
  rect: DOMRect
}

export function getSelectedText(
  popupEl: HTMLDivElement | null
): SelectionInfo | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

  const raw = sel.toString()
  if (!raw) return null

  // не переводим выделение, сделанное внутри нашего же окошка
  if (popupEl) {
    const node = sel.anchorNode
    if (node && (node as Element).closest?.("[data-easylang-popup]")) {
      log("selection: пропущено — выделение внутри нашего окошка")
      return null
    }
  }

  // Нормализуем выделение:
  // - по каждому токену выкидываем всё, кроме латиницы/цифр/'/-
  //   («hello,» -> «hello», «I have, like, 3 cats» -> «I have like 3 cats»)
  // - кириллица и иероглифы выпадают целиком — не-английское не показываем
  const normalized = raw
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[^A-Za-z0-9'\u2019-]/g, ""))
    .filter(Boolean)
    .join(" ")

  if (!normalized) {
    log("selection: пропущено — нет латинских букв", JSON.stringify(raw.slice(0, 60)))
    return null
  }
  if (normalized.length > MAX_PHRASE_LENGTH) {
    log("selection: пропущено — фраза длиннее", MAX_PHRASE_LENGTH)
    return null
  }
  const words = normalized.split(" ")
  if (words.length > MAX_WORD_COUNT) {
    log("selection: пропущено — слов больше", MAX_WORD_COUNT)
    return null
  }
  // отбрасываем «выделения» из одних цифр/знаков
  if (normalized.replace(/[^A-Za-z]/g, "").length < 2) {
    log("selection: пропущено — только цифры/знаки", JSON.stringify(raw.slice(0, 60)))
    return null
  }

  const rect = sel.getRangeAt(0).getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    log("selection: пропущено — пустой rect")
    return null
  }

  log(
    "selection:",
    JSON.stringify(normalized),
    words.length > 1 ? "(фраза)" : "(слово)"
  )
  return { text: normalized, isPhrase: words.length > 1, rect }
}
