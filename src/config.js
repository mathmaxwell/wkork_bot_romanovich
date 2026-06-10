import 'dotenv/config'

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`✗ Не задана обязательная переменная окружения ${name}. Заполните .env (см. .env.example).`)
    process.exit(1)
  }
  return value
}

export const config = {
  botToken: required('BOT_TOKEN'),
  databaseUrl: required('DATABASE_URL'),
  managerChatId: process.env.MANAGER_CHAT_ID || null,
  webAppUrl: process.env.WEBAPP_URL || null,
  kisArtLink: process.env.KIS_ART_LINK || null,
}
