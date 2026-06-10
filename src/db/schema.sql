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
