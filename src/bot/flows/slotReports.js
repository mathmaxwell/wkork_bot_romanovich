import { saveSlotReport } from '../../services/reports.js'
import { notifyManagerReport } from '../notify.js'
import { showMenu } from '../menu.js'

const required = (label) => (v) =>
  v && String(v).trim() ? true : `Поле «${label}» не может быть пустым.`

const dateField = {
  key: 'slot_date', label: 'Дата слота', type: 'text',
  prompt: 'Укажите дату слота (например 10.06.2026):', validate: required('Дата слота'),
}
const timeField = {
  key: 'slot_time', label: 'Время слота', type: 'text',
  prompt: 'Укажите время слота (например 10:00–14:00):', validate: required('Время слота'),
}
const zoneField = {
  key: 'zone', label: 'Зона', type: 'text',
  prompt: 'Укажите зону:', validate: required('Зона'),
}

const KINDS = {
  slot_shift_start: {
    kind: 'shift_start',
    title: 'Выход в смену',
    intro: '📊 Отчёт: выход в смену.',
    fields: [
      dateField, timeField, zoneField,
      { key: 'attachments', label: 'Скриншот о начале смены', type: 'media',
        prompt: 'Прикрепите скриншот о начале смены (фото).' },
    ],
  },
  slot_shift_end: {
    kind: 'shift_end',
    title: 'Завершение смены',
    intro: '📊 Отчёт: завершение смены.',
    fields: [
      dateField, timeField, zoneField,
      { key: 'attachments', label: 'Скриншот о завершении смены', type: 'media',
        prompt: 'Прикрепите скриншот о завершении смены (фото).' },
    ],
  },
  slot_no_show: {
    kind: 'no_show',
    title: 'Невыход в смену',
    intro: '📊 Отчёт: невыход в смену.',
    fields: [
      dateField, timeField, zoneField,
      { key: 'reason', label: 'Причина невыхода', type: 'text',
        prompt: 'Опишите причину невыхода на слот:', validate: required('Причина') },
      { key: 'attachments', label: 'Фото/видео доказательства', type: 'media', optional: true,
        prompt: 'Прикрепите фото/видео доказательства (при наличии) или нажмите «Пропустить».' },
    ],
  },
  slot_early_leave: {
    kind: 'early_leave',
    title: 'Ранний сход со смены',
    intro: '📊 Отчёт: ранний сход со смены.',
    fields: [
      dateField, timeField, zoneField,
      { key: 'reason', label: 'Причина раннего схода', type: 'text',
        prompt: 'Опишите причину раннего схода со слота:', validate: required('Причина') },
      { key: 'attachments', label: 'Фото/видео доказательства', type: 'media', optional: true,
        prompt: 'Прикрепите фото/видео доказательства (при наличии) или нажмите «Пропустить».' },
    ],
  },
}

function make({ kind, title, intro, fields }) {
  return {
    title,
    intro,
    confirm: true,
    submitLabel: '📨 Отправить отчёт',
    buildFields: () => fields.map((f) => ({ ...f })),
    onComplete: async (ctx, draft, courier) => {
      if (!courier?.id) {
        await ctx.reply('Сначала пройдите регистрацию через /start.')
        return
      }
      const report = await saveSlotReport(courier.id, kind, draft)
      await notifyManagerReport(ctx.api, courier, { ...report, title })
      await showMenu(ctx, '✅ Отчёт отправлен менеджеру.')
    },
  }
}

export const slotReportFlows = Object.fromEntries(
  Object.entries(KINDS).map(([name, def]) => [name, make(def)]),
)
