<!-- Виджет wordbook-list: список слов личного словаря + форма добавления. -->
<script setup lang="ts">
import { onMounted, ref } from "vue"
import {
  addWordWithTranslation,
  getWordbook,
  removeWord,
  setStatus,
  STORAGE_KEY,
  STATUS_COLORS,
  STATUS_LABELS,
  type WordEntry,
  type WordStatus,
} from "../../entities/wordbook"

const STATUS_ORDER: WordStatus[] = ["new", "learning", "learned"]

const entries = ref<WordEntry[]>([])
const newWord = ref("")
const busy = ref(false)
const copied = ref(false)
let copiedTimer: number | undefined

async function refresh() {
  const wb = await getWordbook()
  entries.value = Object.values(wb).sort((a, b) => b.addedAt - a.addedAt)
}

async function onAdd() {
  const word = newWord.value.trim()
  if (!word || busy.value) return
  busy.value = true
  await addWordWithTranslation(word)
  newWord.value = ""
  await refresh()
  busy.value = false
}

async function onStatus(e: WordEntry, s: WordStatus) {
  if (e.status === s) return
  await setStatus(e.word, s)
  await refresh()
}

async function onRemove(e: WordEntry) {
  await removeWord(e.word)
  await refresh()
}

// Копирует текст в буфер: Clipboard API, при недоступности — textarea + execCommand.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* пробуем fallback ниже */
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    ta.remove()
    return ok
  } catch {
    return false
  }
}

// Экспорт в DuoCards: их импорт — «одна строка -> одна карта», вставка текста
// в первый вход («английский»). Копируем все слова, по одному в строку.
async function onExportToDuo() {
  if (!entries.value.length) return
  const text = entries.value.map((e) => e.word).join("\n")
  if (!(await copyToClipboard(text))) return
  copied.value = true
  if (copiedTimer !== undefined) window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(() => {
  refresh()
  // словарь мог измениться из тултипа или другой вкладки — обновляем список
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) refresh()
  })
})
</script>

<template>
  <div
    class="w-[360px] font-sans text-[13px] leading-[1.45] text-gray-800"
  >
    <header
      class="flex items-center justify-between px-3.5 pt-3 pb-2 text-[15px] font-semibold"
    >
      <span>Словарь</span>
      <div class="flex items-center gap-2">
        <span class="text-xs font-normal text-gray-400">{{ entries.length }} слов</span>
        <button
          type="button"
          :disabled="!entries.length || copied"
          :title="
            copied
              ? 'Скопировано — вставьте в DuoCards (импорт: первая строка, одна строка = одна карта)'
              : 'Скопировать все слова в буфер (по одному в строке) для вставки в DuoCards'
          "
          class="cursor-pointer rounded-md border border-gray-200 px-2 py-1 text-[11px] font-normal text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-default disabled:opacity-40"
          :class="copied ? 'border-green-300 text-green-600' : ''"
          @click="onExportToDuo"
        >
          {{ copied ? "Скопировано ✓" : "В DuoCards" }}
        </button>
      </div>
    </header>

    <form class="flex gap-2 px-3.5 pb-2.5" @submit.prevent="onAdd">
      <input
        v-model="newWord"
        type="text"
        placeholder="Новое слово или фраза…"
        autocomplete="off"
        class="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        :disabled="busy || !newWord.trim()"
        class="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-white whitespace-nowrap disabled:cursor-default disabled:opacity-50"
      >
        {{ busy ? "…" : "Добавить" }}
      </button>
    </form>

    <ul
      v-if="entries.length"
      class="m-0 flex max-h-[400px] list-none flex-col gap-2 overflow-y-auto px-3.5 pb-3.5"
    >
      <li
        v-for="e in entries"
        :key="e.word"
        class="rounded-[10px] border border-gray-200 px-2.5 py-2"
      >
        <div class="flex items-baseline justify-between gap-2">
          <span class="font-semibold break-words">{{ e.word }}</span>
          <button
            class="cursor-pointer bg-transparent px-0.5 text-[15px] leading-none text-gray-400 hover:text-red-500"
            title="Удалить из словаря"
            @click="onRemove(e)"
          >
            ×
          </button>
        </div>
        <div v-if="e.translation" class="mt-px text-gray-500 break-words">
          {{ e.translation }}
        </div>
        <div class="mt-[7px] flex flex-wrap gap-1">
          <button
            v-for="s in STATUS_ORDER"
            :key="s"
            class="cursor-pointer rounded-full border border-gray-200 bg-transparent px-2 py-[3px] text-[11px] text-gray-500"
            :class="{ 'font-semibold': e.status === s }"
            :style="
              e.status === s
                ? {
                    background: STATUS_COLORS[s],
                    color: '#111827',
                    borderColor: 'transparent',
                  }
                : {}
            "
            @click="onStatus(e, s)"
          >
            {{ STATUS_LABELS[s] }}
          </button>
        </div>
      </li>
    </ul>

    <p v-else class="m-0 px-3.5 pt-1 pb-3.5 text-gray-400">
      Пока пусто. Выделите английское слово на странице и нажмите «＋ В словарь»
      во всплывающем окошке — или введите слово в поле выше.
    </p>
  </div>
</template>
