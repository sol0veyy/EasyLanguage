// Точка входа content script (слой app).
// Конвенция Plasmo требует, чтобы файл content script лежал в корне src,
// поэтому здесь только инициализация виджета; вся логика — в widgets/word-tooltip.

import { initWordTooltip } from "./widgets/word-tooltip"

initWordTooltip()
