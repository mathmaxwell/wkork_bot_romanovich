import { Bot, session } from 'grammy'
import { config } from '../config.js'
import {
  getOrCreateByTelegramId, getByTelegramId, setConsent,
  saveRegistration, resetData,
} from '../services/courier.js'
import { consentKeyboard, courierTypeKeyboard, myDataKeyboard } from './keyboards.js'
import { startFlow, onText, onContact } from './flow.js'
import { showMenu, showMyData, MENU_ITEMS } from './menu.js'
import { notifyManager } from './notify.js'

const CONSENT_TEXT =
  'Согласие на обработку персональных данных\n\n' +
  'Для работы с ботом необходимо ваше согласие на обработку персональных данных ' +
  '(ФИО, телефон, паспортные и иные данные) в целях регистрации и сопровождения ' +
  'курьерской деятельности. Данные передаются менеджеру проекта и хранятся в системе.\n\n' +
  'Нажимая «Согласен», вы подтверждаете согласие на обработку персональных данных.'

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
    await startFlow(ctx, 'new')
  })

  bot.callbackQuery('reg:existing', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Регистрация: действующий курьер.')
    await startFlow(ctx, 'existing')
  })

  // --- Подтверждение/отмена отправки анкеты ---
  bot.callbackQuery('reg:submit', async (ctx) => {
    const flow = ctx.session.flow
    await ctx.answerCallbackQuery()
    if (!flow || !flow.done) {
      await ctx.reply('Анкета не найдена. Отправьте /start, чтобы начать заново.')
      return
    }
    const courier = await saveRegistration(ctx.from.id, flow.type, flow.draft)
    ctx.session.flow = null
    await notifyManager(ctx.api, courier, flow.type)
    await ctx.editMessageText('✅ Данные отправлены на регистрацию менеджеру.')
    await showMenu(ctx, 'Готово! Данные сохранены.')
  })

  bot.callbackQuery('reg:cancel', async (ctx) => {
    ctx.session.flow = null
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Отправка отменена. Чтобы начать заново — /start.')
  })

  // --- Мои данные: изменение / сброс (1.5) ---
  bot.callbackQuery('data:edit', async (ctx) => {
    await ctx.answerCallbackQuery()
    await startFlow(ctx, 'edit')
  })

  bot.callbackQuery('data:reset', async (ctx) => {
    await resetData(ctx.from.id)
    ctx.session.flow = null
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('🗑 Данные сброшены. Чтобы зарегистрироваться заново — /start.')
  })

  // --- Контакт (телефон) во время анкеты ---
  bot.on('message:contact', async (ctx) => {
    const handled = await onContact(ctx)
    if (!handled) await ctx.reply('Сейчас контакт не требуется. Отправьте /start.')
  })

  // --- Текстовые сообщения: сначала движок анкеты, затем пункты меню ---
  bot.on('message:text', async (ctx) => {
    if (await onText(ctx)) return

    const text = ctx.message.text
    if (text === '🪪 Мои данные') {
      const courier = await getByTelegramId(ctx.from.id)
      await showMyData(ctx, courier)
      return
    }
    if (MENU_ITEMS.includes(text)) {
      await ctx.reply(`Раздел «${text}» в разработке. Скоро будет доступен.`)
      return
    }
    await ctx.reply('Не понимаю команду. Откройте меню через /start.')
  })

  bot.catch((err) => {
    console.error('Ошибка в обработчике бота:', err.error || err)
  })

  return bot
}
