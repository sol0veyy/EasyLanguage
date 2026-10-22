// Модель личного словаря: типы и константы. Чистая доменная логика, без chrome.*.

export type WordStatus = "new" | "learning" | "learned"

export interface WordEntry {
  word: string
  translation: string
  status: WordStatus
  addedAt: number
}

export type Wordbook = Record<string, WordEntry>

export const STORAGE_KEY = "easylang.wordbook"

export const STATUS_LABELS: Record<WordStatus, string> = {
  new: "не изучено",
  learning: "в изучении",
  learned: "изучен",
}

export const STATUS_COLORS: Record<WordStatus, string> = {
  new: "#94a3b8",
  learning: "#fbbf24",
  learned: "#34d399",
}

export function keyOf(text: string): string {
  return text.toLowerCase()
}
