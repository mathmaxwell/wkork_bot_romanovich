import { InlineKeyboard, Keyboard } from 'grammy'

export const SKIP_LABEL = 'Пропустить'
export const CANCEL_LABEL = 'Отмена'

export const consentKeyboard = () =>
  new InlineKeyboard()
    .text('✅ Согласен', 'consent:yes')
    .text('❌ Не согласен', 'consent:no')

export const courierTypeKeyboard = () =>
  new InlineKeyboard()
    .text('🆕 Новый курьер', 'reg:new').row()
    .text('♻️ Действующий курьер', 'reg:existing')

export const confirmKeyboard = () =>
  new InlineKeyboard()
    .text('📨 Отправить на регистрацию', 'reg:submit').row()
    .text('✖️ Отменить', 'reg:cancel')

export const myDataKeyboard = () =>
  new InlineKeyboard()
    .text('✏️ Изменить данные', 'data:edit').row()
    .text('🗑 Сбросить данные', 'data:reset')

// Клавиатура для шага типа contact (запрос телефона).
export const contactKeyboard = () =>
  new Keyboard()
    .requestContact('📱 Отправить номер телефона')
    .row()
    .text(CANCEL_LABEL)
    .resized()

// Клавиатура выбора из вариантов (choice). По 1 кнопке в ряд для читаемости.
export const choiceKeyboard = (options, { optional = false } = {}) => {
  const kb = new Keyboard()
  for (const opt of options) kb.text(opt).row()
  if (optional) kb.text(SKIP_LABEL).row()
  kb.text(CANCEL_LABEL)
  return kb.resized()
}

// Клавиатура для обычного текстового шага (с «Пропустить», если поле опционально).
export const textStepKeyboard = ({ optional = false } = {}) => {
  const kb = new Keyboard()
  if (optional) kb.text(SKIP_LABEL).row()
  kb.text(CANCEL_LABEL)
  return kb.resized()
}
