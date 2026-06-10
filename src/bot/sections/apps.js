import { InlineKeyboard } from 'grammy'
import { config } from '../../config.js'

// 2.9 Рабочие приложения.
const APPS = [
  { label: '🚀 Рокет', url: () => config.rocketUrl },
  { label: '🧲 Магнит Курьер', url: () => config.magnitUrl },
  { label: '🎥 Запись экрана', url: () => config.screenRecorderUrl },
]

export const APPS_NOTE =
  '🧰 Рабочие приложения\n\n' +
  'До 18:00 курьер обязан прислать всю отчётность за смену. ' +
  'В противном случае выплата ставится на стоп до получения отчётов.'

export function appsKeyboard() {
  const kb = new InlineKeyboard()
  let any = false
  for (const app of APPS) {
    const url = app.url()
    if (url) { kb.url(app.label, url).row(); any = true }
  }
  return any ? kb : null
}
