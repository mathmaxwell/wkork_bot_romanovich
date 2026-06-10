import { config } from '../../config.js'
import { showMenu } from '../menu.js'
import { REGION } from '../fields.js'

// 2.6 Тарифы: выбор города и типа передвижения → запрос менеджеру с просьбой ждать.
export const tariffsFlow = {
  title: 'Тарифы',
  intro: '💰 Запрос тарифов. Выберите город и тип передвижения.',
  confirm: false,
  buildFields: () => [
    { key: 'city', label: 'Город', type: 'choice',
      options: [REGION.MOSCOW, REGION.SPB, REGION.OTHER], prompt: 'Выберите город:' },
    { key: 'vehicle_type', label: 'Тип передвижения', type: 'choice',
      options: ['Авто', 'Эвело', 'Вело'], prompt: 'Выберите тип передвижения:' },
  ],
  onComplete: async (ctx, draft, courier) => {
    if (config.managerChatId) {
      const fio = [courier?.last_name, courier?.first_name].filter(Boolean).join(' ') || '—'
      try {
        await ctx.api.sendMessage(config.managerChatId, [
          '💰 Запрос тарифов',
          `Курьер: ${fio} (ID: ${courier?.system_uid || '—'})`,
          `Открыть чат: tg://user?id=${ctx.from.id}`,
          '',
          `Город: ${draft.city}`,
          `Тип передвижения: ${draft.vehicle_type}`,
        ].join('\n'))
      } catch (err) {
        console.error('Не удалось отправить запрос тарифов менеджеру:', err.message)
      }
    }
    await showMenu(ctx, '✅ Запрос на тарифы отправлен менеджеру. Пожалуйста, ожидайте ответа.')
  },
}

export const tariffsFlows = { tariffs: tariffsFlow }
