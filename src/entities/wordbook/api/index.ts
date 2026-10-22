// Хранилище личного словаря: chrome.storage.local (ключ STORAGE_KEY).

import { fetchTranslation } from "../../../shared/api/translation"
import {
  keyOf,
  STORAGE_KEY,
  type WordEntry,
  type WordStatus,
  type Wordbook,
} from "../model"

export async function getWordbook(): Promise<Wordbook> {
  const { [STORAGE_KEY]: wb } = await chrome.storage.local.get(STORAGE_KEY)
  return (wb as Wordbook) ?? {}
}

async function setWordbook(wb: Wordbook): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: wb })
}

/** Добавляет слово (upsert). Если слово уже есть — не трогает статус,
 *  подставляет перевод, только если его не было. */
export async function addWord(word: string, translation = ""): Promise<WordEntry> {
  const wb = await getWordbook()
  const key = keyOf(word)
  const existing = wb[key]
  if (existing) {
    if (translation && !existing.translation) {
      existing.translation = translation
      wb[key] = existing
      await setWordbook(wb)
    }
    return existing
  }
  const entry: WordEntry = { word, translation, status: "new", addedAt: Date.now() }
  wb[key] = entry
  await setWordbook(wb)
  return entry
}

/** Как addWord, но при отсутствии перевода делает запрос к переводчику. */
export async function addWordWithTranslation(word: string): Promise<WordEntry> {
  let translation = ""
  try {
    translation = await fetchTranslation(word)
  } catch {
    /* без интернета/ошибка — сохраняем без перевода */
  }
  return addWord(word, translation)
}

export async function setStatus(word: string, status: WordStatus): Promise<void> {
  const wb = await getWordbook()
  const entry = wb[keyOf(word)]
  if (!entry) return
  entry.status = status
  await setWordbook(wb)
}

export async function removeWord(word: string): Promise<void> {
  const wb = await getWordbook()
  delete wb[keyOf(word)]
  await setWordbook(wb)
}
