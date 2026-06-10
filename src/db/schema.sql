-- Раздел 1: курьеры (регистрация, согласие на обработку ПД, уникальный системный ID)

CREATE TABLE IF NOT EXISTS couriers (
  id              SERIAL PRIMARY KEY,
  telegram_id     BIGINT UNIQUE NOT NULL,
  system_uid      TEXT UNIQUE,                       -- уникальный айди в системе (1.2.1)
  status          TEXT NOT NULL DEFAULT 'lead',      -- lead | new | existing | registered
  consent_given   BOOLEAN NOT NULL DEFAULT FALSE,    -- согласие на обработку ПД (1.2)
  consent_at      TIMESTAMPTZ,

  -- ФИО
  last_name       TEXT,
  first_name      TEXT,
  middle_name     TEXT,

  phone           TEXT,
  rocket_number   TEXT,                              -- смена через менеджера
  birth_date      TEXT,                              -- смена через менеджера
  inn             TEXT,
  city            TEXT,
  citizenship     TEXT,
  vehicle_type    TEXT,
  car_number      TEXT,
  zone            TEXT,                              -- обновляется при каждом входе

  -- городские поля (Москва: КИС АРТ, модуль Эвело, № ТС; СПб: прописка, СНИЛС и т.д.)
  extra           JSONB NOT NULL DEFAULT '{}'::jsonb,

  registered_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couriers_telegram ON couriers (telegram_id);
CREATE INDEX IF NOT EXISTS idx_couriers_status   ON couriers (status);

-- Раздел 2.2: отчёты по слотам (выход / невыход / ранний сход / завершение смены)
CREATE TABLE IF NOT EXISTS slot_reports (
  id            SERIAL PRIMARY KEY,
  courier_id    INTEGER NOT NULL REFERENCES couriers (id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                 -- shift_start | no_show | early_leave | shift_end
  slot_date     TEXT,
  slot_time     TEXT,
  zone          TEXT,
  reason        TEXT,                           -- причина (для невыхода / раннего схода)
  attachments   JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{type,file_id}]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slot_reports_courier ON slot_reports (courier_id, kind);

-- Раздел 2.5: экипировка (получил / сдал)
CREATE TABLE IF NOT EXISTS equipment_events (
  id            SERIAL PRIMARY KEY,
  courier_id    INTEGER NOT NULL REFERENCES couriers (id) ON DELETE CASCADE,
  action        TEXT NOT NULL,                  -- received | returned
  bag_number    TEXT,
  city          TEXT,
  photo_file_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipment_courier ON equipment_events (courier_id);

-- Раздел 2.5: претензии
CREATE TABLE IF NOT EXISTS claims (
  id            SERIAL PRIMARY KEY,
  courier_id    INTEGER NOT NULL REFERENCES couriers (id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  order_number  TEXT,
  description   TEXT,
  attachments   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claims_courier ON claims (courier_id);

-- Раздел 2.3: обращения к менеджеру (для троттлинга «раз в 15 минут»)
CREATE TABLE IF NOT EXISTS manager_requests (
  id            SERIAL PRIMARY KEY,
  courier_id    INTEGER NOT NULL REFERENCES couriers (id) ON DELETE CASCADE,
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manager_requests_courier ON manager_requests (courier_id, created_at);
