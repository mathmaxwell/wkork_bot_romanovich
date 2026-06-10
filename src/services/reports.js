import { pool } from '../db/pool.js'

/** Отчёт по слоту (2.2). attachments: [{type,file_id}] */
export async function saveSlotReport(courierId, kind, data) {
  const res = await pool.query(
    `INSERT INTO slot_reports (courier_id, kind, slot_date, slot_time, zone, reason, attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      courierId, kind,
      data.slot_date || null, data.slot_time || null, data.zone || null,
      data.reason || null, JSON.stringify(data.attachments || []),
    ],
  )
  return res.rows[0]
}

/** Кол-во завершённых смен курьера — для светофора 1/5 (2.5). */
export async function countCompletedSlots(courierId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS n FROM slot_reports WHERE courier_id = $1 AND kind = 'shift_end'`,
    [courierId],
  )
  return res.rows[0].n
}

/** Событие экипировки (2.5). action: received | returned */
export async function saveEquipmentEvent(courierId, action, data) {
  const res = await pool.query(
    `INSERT INTO equipment_events (courier_id, action, bag_number, city, photo_file_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [courierId, action, data.bag_number || null, data.city || null, data.photo_file_id || null],
  )
  return res.rows[0]
}

/** Претензия (2.5). attachments: [{type,file_id}] */
export async function saveClaim(courierId, data) {
  const res = await pool.query(
    `INSERT INTO claims (courier_id, reason, order_number, description, attachments)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [
      courierId, data.reason, data.order_number || null,
      data.description || null, JSON.stringify(data.attachments || []),
    ],
  )
  return res.rows[0]
}

/**
 * Обращение к менеджеру (2.3) с троттлингом «раз в 15 минут».
 * Возвращает { ok, request, retryAfterSec }.
 */
export async function createManagerRequest(courierId, message, throttleSec = 15 * 60) {
  const last = await pool.query(
    `SELECT created_at, EXTRACT(EPOCH FROM (now() - created_at))::int AS age_sec
       FROM manager_requests WHERE courier_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [courierId],
  )
  if (last.rows[0] && last.rows[0].age_sec < throttleSec) {
    return { ok: false, retryAfterSec: throttleSec - last.rows[0].age_sec }
  }
  const res = await pool.query(
    `INSERT INTO manager_requests (courier_id, message) VALUES ($1, $2) RETURNING *`,
    [courierId, message || null],
  )
  return { ok: true, request: res.rows[0] }
}
