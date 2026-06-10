import { saveEquipmentEvent } from '../../services/reports.js'
import { notifyManagerEquipment } from '../notify.js'
import { showMenu } from '../menu.js'

const required = (label) => (v) =>
  v && String(v).trim() ? true : `Поле «${label}» не может быть пустым.`

// 2.5 Экипировка: получил / сдал. Фото с номером сумки, дата (авто), город.
function make(action, title) {
  return {
    title,
    intro: `🧰 Экипировка: ${title.toLowerCase()}.`,
    confirm: true,
    submitLabel: '📨 Отправить',
    buildFields: () => [
      { key: 'bag_number', label: 'Номер сумки', type: 'text',
        prompt: 'Введите номер сумки:', validate: required('Номер сумки') },
      { key: 'city', label: 'Город', type: 'text',
        prompt: action === 'received' ? 'Город получения:' : 'Город сдачи:', validate: required('Город') },
      { key: 'photo', label: 'Фото с номером сумки', type: 'media',
        prompt: 'Прикрепите фото с номером сумки.' },
    ],
    onComplete: async (ctx, draft, courier) => {
      if (!courier?.id) {
        await ctx.reply('Сначала пройдите регистрацию через /start.')
        return
      }
      const photo = Array.isArray(draft.photo) ? draft.photo[0] : null
      const event = await saveEquipmentEvent(courier.id, action, {
        bag_number: draft.bag_number,
        city: draft.city,
        photo_file_id: photo?.file_id || null,
      })
      await notifyManagerEquipment(ctx.api, courier, { ...event, title })
      await showMenu(ctx, '✅ Данные по экипировке отправлены менеджеру.')
    },
  }
}

export const equipmentFlows = {
  equipment_received: make('received', 'Получил'),
  equipment_returned: make('returned', 'Сдал'),
}
