import { createBot } from './bot/index.js'
import { pool } from './db/pool.js'

async function main() {
  // Проверяем подключение к БД до старта polling.
  await pool.query('SELECT 1')
  console.log('✓ Подключение к PostgreSQL установлено')

  const bot = createBot()

  const stop = async (signal) => {
    console.log(`\n${signal} — останавливаю бота...`)
    await bot.stop()
    await pool.end()
    process.exit(0)
  }
  process.once('SIGINT', () => stop('SIGINT'))
  process.once('SIGTERM', () => stop('SIGTERM'))

  console.log('✓ Бот запускается (long polling)...')
  await bot.start({
    onStart: (info) => console.log(`✓ Бот @${info.username} запущен`),
  })
}

main().catch((err) => {
  console.error('✗ Не удалось запустить бота:', err)
  process.exit(1)
})
