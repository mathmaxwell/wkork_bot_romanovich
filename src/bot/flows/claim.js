import { saveClaim } from '../../services/reports.js'
import { notifyManagerClaim } from '../notify.js'
import { showMenu } from '../menu.js'

const required = (label) => (v) =>
  v && String(v).trim() ? true : `Поле «${label}» не может быть пустым.`

// 2.5 Претензия — причины из выпадающего списка.
const CLAIM_REASONS = [
  'Оставить у двери (комментарий в МП)',
  'Оставить у двери (звонок клиенту)',
  'Отмена заказа (звонок клиенту)',
  'Отмена заказа (через поддержку)',
  'Отмена заказа (системой)',
]

export const claimFlow = {
  title: 'Претензия',
  intro: '📝 Оформление претензии.',
  confirm: true,
  submitLabel: '📨 Отправить претензию',
  buildFields: () => [
    { key: 'reason', label: 'Причина', type: 'choice', options: CLAIM_REASONS,
      prompt: 'Выберите причину:' },
    { key: 'order_number', label: 'Номер заказа', type: 'text',
      prompt: 'Введите номер заказа из МП:', validate: required('Номер заказа') },
    { key: 'description', label: 'Описание проблемы', type: 'text',
      prompt: 'Опишите проблему:', validate: required('Описание проблемы') },
    { key: 'attachments', label: 'Скрины/фото', type: 'media', optional: true,
      prompt: 'Прикрепите скрин из МП / поддержки / звонка / фото заказа (при наличии) или «Пропустить».' },
  ],
  onComplete: async (ctx, draft, courier) => {
    if (!courier?.id) {
      await ctx.reply('Сначала пройдите регистрацию через /start.')
      return
    }
    const claim = await saveClaim(courier.id, draft)
    await notifyManagerClaim(ctx.api, courier, claim)
    await showMenu(ctx, '✅ Претензия отправлена менеджеру.')
  },
}

export const claimFlows = { claim: claimFlow }
