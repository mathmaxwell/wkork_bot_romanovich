import { config } from '../config.js'

export const REGION = {
  MOSCOW: 'Москва',
  SPB: 'Санкт-Петербург',
  OTHER: 'Другой город',
}

const required = (label) => (v) =>
  v && String(v).trim() ? true : `Поле «${label}» не может быть пустым. Попробуйте ещё раз.`

function validateInn(v) {
  const digits = String(v).replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 12) return true
  return 'ИНН должен содержать 10 или 12 цифр. Введите корректный ИНН.'
}

function validateDate(v) {
  const m = String(v).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return 'Введите дату в формате ДД.ММ.ГГГГ, например 01.05.1995.'
  const [, d, mo] = m
  if (+d < 1 || +d > 31 || +mo < 1 || +mo > 12) return 'Некорректная дата. Формат ДД.ММ.ГГГГ.'
  return true
}

// Городские поля Москвы (1.4)
const moscowFields = () => [
  {
    key: 'kis_art',
    label: 'КИС АРТ',
    type: 'text',
    optional: true,
    prompt:
      'Введите номер КИС АРТ.' +
      (config.kisArtLink ? `\nЕсли его нет — создайте по ссылке: ${config.kisArtLink}` : '\nЕсли его нет — обратитесь к менеджеру.') +
      '\n\n(или нажмите «Пропустить»)',
  },
  { key: 'evelo_module', label: 'Номер модуля для Эвело', type: 'text', optional: true, prompt: 'Введите номер модуля для Эвело (или «Пропустить»):' },
  { key: 'ts_number', label: 'Номер ТС (авто/эвело/вело)', type: 'text', optional: true, prompt: 'Введите номер ТС (или «Пропустить»):' },
]

// Городские поля Санкт-Петербурга (1.4)
const spbFields = () => [
  { key: 'birth_city', label: 'Город рождения', type: 'text', prompt: 'Введите город рождения:', validate: required('Город рождения') },
  { key: 'registration_address', label: 'Адрес прописки', type: 'text', prompt: 'Введите адрес прописки:', validate: required('Адрес прописки') },
  { key: 'actual_address', label: 'Адрес фактического проживания', type: 'text', prompt: 'Введите адрес фактического проживания:', validate: required('Адрес фактического проживания') },
  { key: 'mobile_operator', label: 'Оператор мобильной связи', type: 'text', prompt: 'Введите оператора мобильной связи:', validate: required('Оператор мобильной связи') },
  { key: 'snils', label: 'СНИЛС', type: 'text', prompt: 'Введите СНИЛС:', validate: required('СНИЛС') },
]

// Поле выбора города с инъекцией городских блоков.
function injectCity(value, flow) {
  if (value === REGION.OTHER) {
    return {
      now: [{
        key: 'city',
        label: 'Город',
        type: 'text',
        prompt: 'Введите название города:',
        validate: required('Город'),
      }],
    }
  }
  // Городские блоки (Москва/СПб) запрашиваются только при полной регистрации нового
  // курьера и при редактировании. Для «действующего» курьера (1.5) — базовый набор.
  const wantsCityBlock = flow.type === 'new' || flow.type === 'edit'
  if (!wantsCityBlock) return {}
  if (value === REGION.MOSCOW) return { end: moscowFields() }
  if (value === REGION.SPB) return { end: spbFields() }
  return {}
}

/**
 * Базовый набор полей курьера (1.4 / 1.5).
 * Возвращаем фабрикой, чтобы у каждого запуска был свой массив.
 */
export function buildCourierFields() {
  return [
    { key: 'last_name', label: 'Фамилия', type: 'text', prompt: 'Введите фамилию:', validate: required('Фамилия') },
    { key: 'first_name', label: 'Имя', type: 'text', prompt: 'Введите имя:', validate: required('Имя') },
    { key: 'middle_name', label: 'Отчество', type: 'text', prompt: 'Введите отчество:', validate: required('Отчество') },
    { key: 'phone', label: 'Номер телефона', type: 'contact', prompt: 'Отправьте номер телефона кнопкой ниже или введите вручную:' },
    { key: 'rocket_number', label: 'Номер Рокет', type: 'text', prompt: 'Введите номер Рокет (смена — через менеджера):', validate: required('Номер Рокет') },
    { key: 'birth_date', label: 'Дата рождения', type: 'text', prompt: 'Введите дату рождения в формате ДД.ММ.ГГГГ (смена — через менеджера):', validate: validateDate },
    { key: 'inn', label: 'ИНН', type: 'text', prompt: 'Введите ИНН:', validate: validateInn },
    { key: 'city', label: 'Город', type: 'choice', options: [REGION.MOSCOW, REGION.SPB, REGION.OTHER], prompt: 'Выберите город:', inject: injectCity },
    { key: 'citizenship', label: 'Гражданство', type: 'text', prompt: 'Укажите гражданство:', validate: required('Гражданство') },
    { key: 'vehicle_type', label: 'Тип ТС', type: 'choice', options: ['Авто', 'Эвело', 'Вело'], prompt: 'Выберите тип ТС:' },
    { key: 'car_number', label: 'Номер авто', type: 'text', optional: true, prompt: 'Введите номер авто (или «Пропустить», если нет):' },
    { key: 'zone', label: 'Зона', type: 'text', prompt: 'Укажите зону:', validate: required('Зона') },
  ]
}
