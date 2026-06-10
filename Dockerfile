FROM node:20-alpine

WORKDIR /app

# Устанавливаем зависимости отдельно для кеширования слоёв
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Копируем исходники
COPY src ./src

# Непривилегированный пользователь
USER node

CMD ["node", "src/index.js"]
