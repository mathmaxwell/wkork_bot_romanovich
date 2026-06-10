import {
  contactKeyboard, choiceKeyboard, textStepKeyboard, mediaKeyboard,
  confirmKeyboard, SKIP_LABEL, CANCEL_LABEL,
} from './keyboards.js'
import { getDefinition } from './flows/index.js'
import { getByTelegramId } from '../services/courier.js'

const removeKb = { remove_keyboard: true }

/**
 * Универсальный пошаговый движок анкет.
 *
 * Определение потока (см. ./flows) описывает поля и обработчик завершения,
 * а движок ведёт пользователя по шагам, хранит черновик в ctx.session.flow
 * и по подтверждению вызывает def.onComplete(ctx, draft, courier).
 *
 * Поле: { key, label, prompt, type, optional?, options?, validate?, inject? }
 *   type: 'text' | 'contact' | 'choice' | 'media'
 */
export async function startFlow(ctx, name) {
  const def = getDefinition(name)
  if (!def) throw new Error(`Неизвестный поток: ${name}`)

  const flow = {
    name,
    fields: def.buildFields(ctx),
    tail: [],
    index: 0,
    draft: {},
    done: false,
    confirm: def.confirm !== false,
    submitLabel: def.submitLabel || '📨 Отправить',
  }
  if (def.init) def.init(flow, ctx)
  ctx.session.flow = flow

  if (def.intro) await ctx.reply(def.intro, { reply_markup: removeKb })
  await promptCurrent(ctx)
}

function currentField(flow) {
  return flow.fields[flow.index] || null
}

export async function promptCurrent(ctx) {
  const flow = ctx.session.flow
  const field = currentField(flow)
  if (!field) return finishFlow(ctx)

  const total = countableTotal(flow)
  const n = Math.min(flow.index + 1, total)
  const header = `Шаг ${n}/${total} · ${field.label}\n\n`

  let reply_markup
  if (field.type === 'contact') reply_markup = contactKeyboard()
  else if (field.type === 'choice') reply_markup = choiceKeyboard(field.options, { optional: field.optional })
  else if (field.type === 'media') reply_markup = mediaKeyboard({ optional: field.optional })
  else reply_markup = textStepKeyboard({ optional: field.optional })

  await ctx.reply(header + field.prompt, { reply_markup })
}

// Грубая оценка общего числа шагов (для индикатора прогресса).
function countableTotal(flow) {
  return flow.fields.length + flow.tail.length
}

/** Обработка контакта (телефон). */
export async function onContact(ctx) {
  const flow = ctx.session.flow
  const field = currentField(flow)
  if (!flow || flow.done || !field || field.type !== 'contact') return false
  const phone = ctx.message.contact?.phone_number
  if (!phone) return false
  storeAndAdvance(flow, field, phone)
  await promptCurrent(ctx)
  return true
}

/** Обработка вложения (фото / видео / документ) в активном media-шаге. */
export async function onMedia(ctx) {
  const flow = ctx.session.flow
  const field = currentField(flow)
  if (!flow || flow.done || !field || field.type !== 'media') return false

  const msg = ctx.message
  let att = null
  if (msg.photo?.length) att = { type: 'photo', file_id: msg.photo[msg.photo.length - 1].file_id }
  else if (msg.video) att = { type: 'video', file_id: msg.video.file_id }
  else if (msg.document) att = { type: 'document', file_id: msg.document.file_id }
  if (!att) return false

  storeAndAdvance(flow, field, [att])
  await promptCurrent(ctx)
  return true
}

/**
 * Обработка текстового ввода в активном шаге.
 * Возвращает true, если ввод «съеден» движком.
 */
export async function onText(ctx) {
  const flow = ctx.session.flow
  if (!flow) return false
  const text = (ctx.message.text || '').trim()

  if (text === CANCEL_LABEL) {
    ctx.session.flow = null
    await ctx.reply('Заполнение отменено.', { reply_markup: removeKb })
    return true
  }

  if (flow.done) {
    await ctx.reply('Анкета заполнена. Подтвердите отправку кнопками выше.')
    return true
  }

  const field = currentField(flow)
  if (!field) return false

  // Пропуск опционального поля
  if (text === SKIP_LABEL) {
    if (field.optional) {
      storeAndAdvance(flow, field, null)
      await promptCurrent(ctx)
      return true
    }
    await ctx.reply('Это поле обязательно для заполнения.')
    return true
  }

  // Шаг ожидает вложение
  if (field.type === 'media') {
    await ctx.reply('Пришлите фото или видео' + (field.optional ? ', либо нажмите «Пропустить».' : '.'))
    return true
  }

  // Выбор из вариантов
  if (field.type === 'choice' && !field.options.includes(text)) {
    await ctx.reply('Пожалуйста, выберите один из вариантов кнопками ниже.')
    return true
  }

  // Валидация
  if (field.validate) {
    const result = field.validate(text)
    if (result !== true) {
      await ctx.reply(result)
      return true
    }
  }

  storeAndAdvance(flow, field, text)
  await promptCurrent(ctx)
  return true
}

// Сохранить значение, выполнить инъекцию доп. полей и перейти к след. шагу.
function storeAndAdvance(flow, field, value) {
  flow.draft[field.key] = value

  if (field.inject) {
    const injected = field.inject(value, flow) || {}
    if (injected.now?.length) flow.fields.splice(flow.index + 1, 0, ...injected.now)
    if (injected.end?.length) flow.tail.push(...injected.end)
  }

  flow.index += 1

  // Когда базовые поля закончились — добавляем отложенные блоки.
  while (flow.index >= flow.fields.length && flow.tail.length) {
    flow.fields.push(...flow.tail.splice(0))
  }
}

async function finishFlow(ctx) {
  const flow = ctx.session.flow
  flow.done = true
  if (!flow.confirm) {
    await submitFlow(ctx)
    return
  }
  await ctx.reply(buildSummary(flow), { reply_markup: removeKb })
  await ctx.reply('Проверьте данные и подтвердите отправку.', {
    reply_markup: confirmKeyboard(flow.submitLabel),
  })
}

/** Подтверждение отправки (callback flow:submit или авто при confirm:false). */
export async function submitFlow(ctx) {
  const flow = ctx.session.flow
  if (!flow || !flow.done) {
    await ctx.reply('Активная анкета не найдена. Откройте меню через /start.')
    return
  }
  const def = getDefinition(flow.name)
  const courier = await getByTelegramId(ctx.from.id)
  ctx.session.flow = null
  await def.onComplete(ctx, flow.draft, courier)
}

export function cancelFlow(ctx) {
  ctx.session.flow = null
}

export function buildSummary(flow) {
  const lines = ['📋 Проверьте данные:\n']
  const byKey = new Map()
  for (const f of flow.fields) {
    if (flow.draft[f.key] !== undefined) byKey.set(f.key, { label: f.label, value: flow.draft[f.key] })
  }
  for (const { label, value } of byKey.values()) {
    lines.push(`• ${label}: ${formatValue(value)}`)
  }
  return lines.join('\n')
}

function formatValue(value) {
  if (value == null) return '—'
  if (Array.isArray(value)) {
    if (!value.length) return '—'
    const kinds = value.map((a) => (a.type === 'video' ? 'видео' : a.type === 'document' ? 'файл' : 'фото'))
    return `вложение (${kinds.join(', ')})`
  }
  return String(value)
}
