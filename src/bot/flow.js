import { buildCourierFields } from './fields.js'
import {
  contactKeyboard, choiceKeyboard, textStepKeyboard,
  confirmKeyboard, SKIP_LABEL, CANCEL_LABEL,
} from './keyboards.js'
import { Keyboard } from 'grammy'

const removeKb = { remove_keyboard: true }

/**
 * Старт пошаговой регистрации (1.4 / 1.5 / редактирование).
 * type: 'new' | 'existing' | 'edit'
 */
export async function startFlow(ctx, type) {
  ctx.session.flow = {
    type,
    fields: buildCourierFields(),
    tail: [],
    index: 0,
    draft: {},
    done: false,
  }
  await ctx.reply(
    type === 'edit'
      ? 'Изменение данных. Заполните анкету заново.'
      : 'Заполните анкету курьера. В любой момент можно нажать «Отмена».',
    { reply_markup: removeKb },
  )
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

// Сохранить значение, выполнить инъекцию городских полей и перейти к след. шагу.
function storeAndAdvance(flow, field, value) {
  flow.draft[field.key] = value

  if (field.inject) {
    const injected = field.inject(value, flow) || {}
    if (injected.now?.length) flow.fields.splice(flow.index + 1, 0, ...injected.now)
    if (injected.end?.length) flow.tail.push(...injected.end)
  }

  flow.index += 1

  // Когда базовые поля закончились — добавляем отложенные (городские) блоки.
  while (flow.index >= flow.fields.length && flow.tail.length) {
    flow.fields.push(...flow.tail.splice(0))
  }
}

async function finishFlow(ctx) {
  const flow = ctx.session.flow
  flow.done = true
  await ctx.reply(buildSummary(flow), {
    reply_markup: confirmKeyboard(),
  })
  // Убираем reply-клавиатуру, оставляя inline-кнопки подтверждения.
  await ctx.reply('Проверьте данные и подтвердите отправку.', { reply_markup: removeKb })
}

export function buildSummary(flow) {
  const lines = ['📋 Проверьте данные:\n']
  const byKey = new Map()
  for (const f of flow.fields) {
    if (flow.draft[f.key] !== undefined) byKey.set(f.key, { label: f.label, value: flow.draft[f.key] })
  }
  for (const { label, value } of byKey.values()) {
    lines.push(`• ${label}: ${value ?? '—'}`)
  }
  return lines.join('\n')
}
