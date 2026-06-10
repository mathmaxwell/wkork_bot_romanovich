import { Keyboard, InlineKeyboard } from 'grammy'
import { myDataKeyboard } from './keyboards.js'
import { countCompletedSlots } from '../services/reports.js'

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

// 2.2 Подменю отчётов по слотам.
export const slotReportKeyboard = () =>
  new InlineKeyboard()
    .text('▶️ Выход в смену', 'flowstart:slot_shift_start').row()
    .text('⏹ Завершение смены', 'flowstart:slot_shift_end').row()
    .text('🚫 Невыход в смену', 'flowstart:slot_no_show').row()
    .text('⏏️ Ранний сход со смены', 'flowstart:slot_early_leave')

// 2.5 Подменю светофора (экипировка + претензия).
export const trafficLightKeyboard = () =>
  new InlineKeyboard()
    .text('🧰 Экипировка: получил', 'flowstart:equipment_received').row()
    .text('🧰 Экипировка: сдал', 'flowstart:equipment_returned').row()
    .text('📝 Претензия', 'flowstart:claim')

export async function showSlotReports(ctx) {
  await ctx.reply('📊 Отчёт по слотам. Выберите тип:', { reply_markup: slotReportKeyboard() })
}

// 2.5 Светофор: 1/5 слотов + зелёная галочка при достижении 5.
export async function showTrafficLight(ctx, courier) {
  if (!courier?.id) {
    await ctx.reply('Сначала пройдите регистрацию через /start.')
    return
  }
  const done = await countCompletedSlots(courier.id)
  const target = 5
  const reached = done >= target
  const mark = reached ? '✅' : '🟡'
  const text =
    `🚦 Светофор\n\n` +
    `Отработано слотов: ${Math.min(done, target)}/${target} ${mark}\n` +
    (reached
      ? 'Поздравляем! Порог в 5 слотов достигнут.'
      : `До зелёной галочки осталось слотов: ${target - done}.`)
  await ctx.reply(text, { reply_markup: trafficLightKeyboard() })
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
