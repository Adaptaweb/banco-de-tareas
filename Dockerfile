FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++  # needed for better-sqlite3 native build
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/astro.config.mjs ./
EXPOSE 5000
CMD npx concurrently -n bot,web "npx tsx src/telegram-bot.ts" "node dist/server/entry.mjs"
