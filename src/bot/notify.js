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

// ФИО + системный ID + ссылка на прямой чат с курьером (2.3).
function courierHeader(courier) {
  const fio = [courier.last_name, courier.first_name, courier.middle_name].filter(Boolean).join(' ') || '—'
  return [
    `Курьер: ${fio}`,
    `ID в системе: ${courier.system_uid || '—'}`,
    `Телефон: ${courier.phone || '—'}`,
    `Открыть чат: tg://user?id=${courier.telegram_id}`,
  ]
}

// Отправка вложений [{type,file_id}] в чат менеджера.
async function sendAttachments(api, attachments) {
  for (const att of attachments || []) {
    try {
      if (att.type === 'video') await api.sendVideo(config.managerChatId, att.file_id)
      else if (att.type === 'document') await api.sendDocument(config.managerChatId, att.file_id)
      else await api.sendPhoto(config.managerChatId, att.file_id)
    } catch (err) {
      console.error('Не удалось переслать вложение менеджеру:', err.message)
    }
  }
}

async function send(api, lines) {
  if (!config.managerChatId) return
  try {
    await api.sendMessage(config.managerChatId, lines.join('\n'))
  } catch (err) {
    console.error('Не удалось отправить уведомление менеджеру:', err.message)
  }
}

// 2.2 Отчёт по слоту.
export async function notifyManagerReport(api, courier, report) {
  if (!config.managerChatId) return
  await send(api, [
    `📊 Отчёт по слоту: ${report.title}`,
    ...courierHeader(courier),
    '',
    `Дата: ${report.slot_date || '—'}`,
    `Время: ${report.slot_time || '—'}`,
    `Зона: ${report.zone || '—'}`,
    ...(report.reason ? [`Причина: ${report.reason}`] : []),
  ])
  await sendAttachments(api, report.attachments)
}

// 2.5 Экипировка.
export async function notifyManagerEquipment(api, courier, event) {
  if (!config.managerChatId) return
  await send(api, [
    `🧰 Экипировка: ${event.title}`,
    ...courierHeader(courier),
    '',
    `Номер сумки: ${event.bag_number || '—'}`,
    `Город: ${event.city || '—'}`,
  ])
  if (event.photo_file_id) await sendAttachments(api, [{ type: 'photo', file_id: event.photo_file_id }])
}

// 2.5 Претензия.
export async function notifyManagerClaim(api, courier, claim) {
  if (!config.managerChatId) return
  await send(api, [
    '📝 Претензия',
    ...courierHeader(courier),
    '',
    `Причина: ${claim.reason}`,
    `Номер заказа: ${claim.order_number || '—'}`,
    `Описание: ${claim.description || '—'}`,
  ])
  await sendAttachments(api, claim.attachments)
}

// 2.3 Связь с менеджером.
export async function notifyManagerContact(api, courier, message) {
  if (!config.managerChatId) return
  await send(api, [
    '📞 Запрос связи с менеджером',
    ...courierHeader(courier),
    `Город: ${courier.city || '—'}`,
    `Зона: ${courier.zone || '—'}`,
    ...(message ? ['', `Сообщение: ${message}`] : []),
  ])
}
