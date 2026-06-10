import { Bot, session } from 'grammy'
import { config } from '../config.js'
import {
  getOrCreateByTelegramId, getByTelegramId, setConsent, resetData,
} from '../services/courier.js'
import { createManagerRequest } from '../services/reports.js'
import { consentKeyboard, courierTypeKeyboard } from './keyboards.js'
import { startFlow, onText, onContact, onMedia, submitFlow, cancelFlow } from './engine.js'
import {
  showMenu, showMyData, showSlotReports, showTrafficLight,
} from './menu.js'
import { notifyManagerContact } from './notify.js'
import { infoMenuKeyboard, getInfoSection } from './sections/info.js'
import { appsKeyboard, APPS_NOTE } from './sections/apps.js'

const CONSENT_TEXT =
  'Согласие на обработку персональных данных\n\n' +
  'Для работы с ботом необходимо ваше согласие на обработку персональных данных ' +
  '(ФИО, телефон, паспортные и иные данные) в целях регистрации и сопровождения ' +
  'курьерской деятельности. Данные передаются менеджеру проекта и хранятся в системе.\n\n' +
  'Нажимая «Согласен», вы подтверждаете согласие на обработку персональных данных.'

// Сопоставление пунктов главного меню с обработчиками.
const MENU_HANDLERS = {
  '📊 Отчёт слоты': (ctx) => showSlotReports(ctx),
  '👤 Связь с менеджером': (ctx) => handleManagerContact(ctx),
  '🗓 Слоты': (ctx) => ctx.reply('Раздел «Слоты» (биржа, отдать/запросить) в разработке.'),
  '🚦 Светофор': async (ctx) => showTrafficLight(ctx, await getByTelegramId(ctx.from.id)),
  'ℹ️ Информация по проекту': (ctx) =>
    ctx.reply('ℹ️ Информация по проекту. Выберите раздел:', { reply_markup: infoMenuKeyboard() }),
  '📈 Отчёты': (ctx) => ctx.reply('Раздел «Отчёты» (штрафы, доход, заказы) в разработке.'),
  '🔔 Уведомления': (ctx) => ctx.reply('Раздел «Уведомления» (напоминания о слотах) в разработке.'),
  '🧰 Рабочие приложения': (ctx) => handleApps(ctx),
  '🪪 Мои данные': async (ctx) => showMyData(ctx, await getByTelegramId(ctx.from.id)),
}

async function handleManagerContact(ctx) {
  const courier = await getByTelegramId(ctx.from.id)
  if (!courier?.id) {
    await ctx.reply('Сначала пройдите регистрацию через /start.')
    return
  }
  const res = await createManagerRequest(courier.id, null)
  if (!res.ok) {
    const min = Math.ceil(res.retryAfterSec / 60)
    await ctx.reply(`Запрос уже отправлен. Повторно можно обратиться через ~${min} мин.`)
    return
  }
  await notifyManagerContact(ctx.api, courier, null)
  await ctx.reply('✅ Запрос отправлен. Менеджер свяжется с вами в ближайшее время.')
}

async function handleApps(ctx) {
  const kb = appsKeyboard()
  if (kb) await ctx.reply(APPS_NOTE, { reply_markup: kb })
  else await ctx.reply(APPS_NOTE + '\n\nСсылки на приложения ещё не настроены менеджером.')
}

export function createBot() {
  const bot = new Bot(config.botToken)

  bot.use(session({ initial: () => ({ flow: null }) }))

  // --- /start: первый вход, присвоение системного ID, согласие, маршрутизация ---
  bot.command('start', async (ctx) => {
    ctx.session.flow = null
    const { courier } = await getOrCreateByTelegramId(ctx.from.id)

    if (!courier.consent_given) {
      await ctx.reply(
        `Добро пожаловать! Ваш ID в системе: ${courier.system_uid}.\n\n${CONSENT_TEXT}`,
        { reply_markup: consentKeyboard() },
      )
      return
    }
    if (courier.registered_at) {
      await showMenu(ctx, `С возвращением! Ваш ID: ${courier.system_uid}.`)
      return
    }
    await ctx.reply('Вы новый курьер или уже действующий?', { reply_markup: courierTypeKeyboard() })
  })

  // --- Согласие на обработку ПД (1.2) ---
  bot.callbackQuery('consent:yes', async (ctx) => {
    await setConsent(ctx.from.id, true)
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('✅ Спасибо! Согласие получено.')
    await ctx.reply('Вы новый курьер или уже действующий?', { reply_markup: courierTypeKeyboard() })
  })

  bot.callbackQuery('consent:no', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(
      '❌ Без согласия на обработку персональных данных продолжить нельзя.\n' +
      'Когда будете готовы — отправьте /start.',
    )
  })

  // --- Выбор типа курьера (1.3) ---
  bot.callbackQuery('reg:new', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Регистрация: новый курьер.')
    await startFlow(ctx, 'registration_new')
  })

  bot.callbackQuery('reg:existing', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Регистрация: действующий курьер.')
    await startFlow(ctx, 'registration_existing')
  })

  // --- Универсальный запуск потока-анкеты (отчёты, экипировка, претензия, тарифы) ---
  bot.callbackQuery(/^flowstart:(.+)$/, async (ctx) => {
    const name = ctx.match[1]
    await ctx.answerCallbackQuery()
    try {
      await startFlow(ctx, name)
    } catch (err) {
      console.error('Не удалось запустить поток:', err.message)
      await ctx.reply('Не удалось открыть раздел. Попробуйте позже.')
    }
  })

  // --- Подтверждение / отмена отправки анкеты (универсально) ---
  bot.callbackQuery('flow:submit', async (ctx) => {
    await ctx.answerCallbackQuery()
    try { await ctx.editMessageReplyMarkup() } catch { /* кнопки уже убраны */ }
    await submitFlow(ctx)
  })

  bot.callbackQuery('flow:cancel', async (ctx) => {
    cancelFlow(ctx)
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Отправка отменена.')
    await showMenu(ctx)
  })

  // --- Мои данные: изменение / сброс (1.5) ---
  bot.callbackQuery('data:edit', async (ctx) => {
    await ctx.answerCallbackQuery()
    await startFlow(ctx, 'registration_edit')
  })

  bot.callbackQuery('data:reset', async (ctx) => {
    await resetData(ctx.from.id)
    ctx.session.flow = null
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('🗑 Данные сброшены. Чтобы зарегистрироваться заново — /start.')
  })

  // --- Информация по проекту (2.6) ---
  bot.callbackQuery('info:tariffs', async (ctx) => {
    await ctx.answerCallbackQuery()
    await startFlow(ctx, 'tariffs')
  })

  bot.callbackQuery(/^info:(.+)$/, async (ctx) => {
    const section = getInfoSection(ctx.match[1])
    await ctx.answerCallbackQuery()
    if (!section) {
      await ctx.reply('Раздел не найден.')
      return
    }
    await ctx.reply(`ℹ️ ${section.title}\n\n${section.text}`)
  })

  // --- Контакт (телефон) во время анкеты ---
  bot.on('message:contact', async (ctx) => {
    const handled = await onContact(ctx)
    if (!handled) await ctx.reply('Сейчас контакт не требуется. Отправьте /start.')
  })

  // --- Вложения (фото / видео / документ) во время анкеты ---
  bot.on(['message:photo', 'message:video', 'message:document'], async (ctx) => {
    const handled = await onMedia(ctx)
    if (!handled) await ctx.reply('Сейчас вложение не требуется. Откройте нужный раздел через меню.')
  })

  // --- Текстовые сообщения: сначала движок анкеты, затем пункты меню ---
  bot.on('message:text', async (ctx) => {
    if (await onText(ctx)) return

    const handler = MENU_HANDLERS[ctx.message.text]
    if (handler) {
      await handler(ctx)
      return
    }
    await ctx.reply('Не понимаю команду. Откройте меню через /start.')
  })

  bot.catch((err) => {
    console.error('Ошибка в обработчике бота:', err.error || err)
  })

  return bot
}
