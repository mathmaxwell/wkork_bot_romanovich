import { config } from '../config.js'

// Уведомление менеджеру: данные грузятся в чат/таблицу менеджера (1.4).
export async function notifyManager(api, courier, type) {
  if (!config.managerChatId) return
  const typeLabel = type === 'existing' ? 'действующий курьер' : (type === 'edit' ? 'обновление данных' : 'новый курьер')
  const lines = [
    `📨 Заявка на регистрацию (${typeLabel})`,
    `ID в системе: ${courier.system_uid}`,
    `Telegram ID: ${courier.telegram_id}`,
    '',
    `ФИО: ${[courier.last_name, courier.first_name, courier.middle_name].filter(Boolean).join(' ')}`,
    `Телефон: ${courier.phone || '—'}`,
    `Номер Рокет: ${courier.rocket_number || '—'}`,
    `Дата рождения: ${courier.birth_date || '—'}`,
    `ИНН: ${courier.inn || '—'}`,
    `Город: ${courier.city || '—'}`,
    `Гражданство: ${courier.citizenship || '—'}`,
    `Тип ТС: ${courier.vehicle_type || '—'}`,
    `Номер авто: ${courier.car_number || '—'}`,
    `Зона: ${courier.zone || '—'}`,
  ]
  const extra = courier.extra || {}
  if (Object.keys(extra).length) {
    lines.push('', 'Доп. поля:')
    for (const [key, value] of Object.entries(extra)) {
      if (value) lines.push(`  ${key}: ${value}`)
    }
  }
  try {
    await api.sendMessage(config.managerChatId, lines.join('\n'))
  } catch (err) {
    console.error('Не удалось отправить уведомление менеджеру:', err.message)
  }
}
