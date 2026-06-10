import { Keyboard } from 'grammy'
import { myDataKeyboard } from './keyboards.js'
import { REGION } from './fields.js'

// Пункты меню (раздел 2). Пока заглушки — будут реализованы на следующих этапах.
export const MENU_ITEMS = [
  '📊 Отчёт слоты',
  '👤 Связь с менеджером',
  '🗓 Слоты',
  '🚦 Светофор',
  'ℹ️ Информация по проекту',
  '📈 Отчёты',
  '🔔 Уведомления',
  '🧰 Рабочие приложения',
  '🪪 Мои данные',
]

export const mainMenuKeyboard = () => {
  const kb = new Keyboard()
  kb.text(MENU_ITEMS[0]).text(MENU_ITEMS[1]).row()
  kb.text(MENU_ITEMS[2]).text(MENU_ITEMS[3]).row()
  kb.text(MENU_ITEMS[4]).text(MENU_ITEMS[5]).row()
  kb.text(MENU_ITEMS[6]).text(MENU_ITEMS[7]).row()
  kb.text(MENU_ITEMS[8])
  return kb.resized()
}

export async function showMenu(ctx, greeting) {
  const text = greeting || 'Главное меню. Выберите раздел:'
  await ctx.reply(text, { reply_markup: mainMenuKeyboard() })
}

const FIELD_LABELS = [
  ['last_name', 'Фамилия'], ['first_name', 'Имя'], ['middle_name', 'Отчество'],
  ['phone', 'Телефон'], ['rocket_number', 'Номер Рокет'], ['birth_date', 'Дата рождения'],
  ['inn', 'ИНН'], ['city', 'Город'], ['citizenship', 'Гражданство'],
  ['vehicle_type', 'Тип ТС'], ['car_number', 'Номер авто'], ['zone', 'Зона'],
]

const EXTRA_LABELS = {
  kis_art: 'КИС АРТ',
  evelo_module: 'Номер модуля Эвело',
  ts_number: 'Номер ТС',
  birth_city: 'Город рождения',
  registration_address: 'Адрес прописки',
  actual_address: 'Адрес проживания',
  mobile_operator: 'Оператор связи',
  snils: 'СНИЛС',
}

export async function showMyData(ctx, courier) {
  if (!courier || !courier.registered_at) {
    await ctx.reply('Данные ещё не заполнены. Используйте /start для регистрации.')
    return
  }
  const lines = [`🪪 Ваши данные (ID в системе: ${courier.system_uid})\n`]
  for (const [key, label] of FIELD_LABELS) {
    if (courier[key]) lines.push(`• ${label}: ${courier[key]}`)
  }
  const extra = courier.extra || {}
  for (const [key, value] of Object.entries(extra)) {
    if (value) lines.push(`• ${EXTRA_LABELS[key] || key}: ${value}`)
  }
  await ctx.reply(lines.join('\n'), { reply_markup: myDataKeyboard() })
}
