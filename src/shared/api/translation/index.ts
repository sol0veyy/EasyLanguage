// Внешний API: машинный перевод en→ru (открытый эндпоинт Google, без ключа).

export async function fetchTranslation(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url, { headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as [string[][]]
  const result = (data[0] ?? []).map((seg) => seg?.[0] ?? "").join("")
  if (!result) throw new Error("empty translation")
  return result
}
