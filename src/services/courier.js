import { pool } from '../db/pool.js'

// Колонки-поля, которые сохраняются в отдельные столбцы таблицы.
// Всё остальное из draft уходит в JSONB extra (городские поля).
const COLUMN_FIELDS = [
  'last_name', 'first_name', 'middle_name', 'phone', 'rocket_number',
  'birth_date', 'inn', 'city', 'citizenship', 'vehicle_type', 'car_number', 'zone',
]

/**
 * Первый вход (1.2.1): находим курьера или создаём запись и присваиваем
 * уникальный системный айди вида K000123.
 */
export async function getOrCreateByTelegramId(telegramId) {
  const found = await pool.query('SELECT * FROM couriers WHERE telegram_id = $1', [telegramId])
  if (found.rows[0]) return { courier: found.rows[0], created: false }

  const inserted = await pool.query(
    'INSERT INTO couriers (telegram_id) VALUES ($1) RETURNING *',
    [telegramId],
  )
  const row = inserted.rows[0]
  const uid = `K${String(row.id).padStart(6, '0')}`
  const updated = await pool.query(
    'UPDATE couriers SET system_uid = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [uid, row.id],
  )
  return { courier: updated.rows[0], created: true }
}

export async function getByTelegramId(telegramId) {
  const res = await pool.query('SELECT * FROM couriers WHERE telegram_id = $1', [telegramId])
  return res.rows[0] || null
}

export async function setConsent(telegramId, given) {
  const res = await pool.query(
    `UPDATE couriers
        SET consent_given = $1,
            consent_at = CASE WHEN $1 THEN now() ELSE NULL END,
            updated_at = now()
      WHERE telegram_id = $2
      RETURNING *`,
    [given, telegramId],
  )
  return res.rows[0] || null
}

/**
 * Сохранение данных регистрации (1.4 / 1.5).
 * type: 'new' | 'existing' | 'edit'
 */
export async function saveRegistration(telegramId, type, draft) {
  const extra = {}
  const columns = {}
  for (const [key, value] of Object.entries(draft)) {
    if (COLUMN_FIELDS.includes(key)) columns[key] = value
    else extra[key] = value
  }

  const status = type === 'edit' ? null : (type === 'existing' ? 'existing' : 'new')

  // Собираем динамический SET
  const sets = []
  const values = []
  let i = 1
  for (const [key, value] of Object.entries(columns)) {
    sets.push(`${key} = $${i++}`)
    values.push(value)
  }
  sets.push(`extra = extra || $${i++}::jsonb`)
  values.push(JSON.stringify(extra))

  if (status) {
    sets.push(`status = $${i++}`)
    values.push(status)
  }
  sets.push(`registered_at = COALESCE(registered_at, now())`)
  sets.push(`updated_at = now()`)

  values.push(telegramId)
  const res = await pool.query(
    `UPDATE couriers SET ${sets.join(', ')} WHERE telegram_id = $${i} RETURNING *`,
    values,
  )
  return res.rows[0] || null
}

/**
 * Сброс данных по запросу сотрудника (1.5). Согласие на обработку ПД сохраняется.
 */
export async function resetData(telegramId) {
  const res = await pool.query(
    `UPDATE couriers
        SET last_name = NULL, first_name = NULL, middle_name = NULL, phone = NULL,
            rocket_number = NULL, birth_date = NULL, inn = NULL, city = NULL,
            citizenship = NULL, vehicle_type = NULL, car_number = NULL, zone = NULL,
            extra = '{}'::jsonb, status = 'lead', registered_at = NULL, updated_at = now()
      WHERE telegram_id = $1
      RETURNING *`,
    [telegramId],
  )
  return res.rows[0] || null
}
