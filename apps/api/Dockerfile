# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w api --omit=dev

FROM base AS build
COPY package.json package-lock.json ./
COPY apps/api apps/api
RUN npm ci -w api
RUN npm run build -w api

FROM base AS runner
ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
# Per `npm run db:reset` nel container (schema + seed): sorgente Drizzle e tool TS non sono in dist
COPY --from=build /app/apps/api/scripts ./scripts
COPY --from=build /app/apps/api/src ./src
COPY --from=build /app/apps/api/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3001
CMD ["node", "dist/server.js"]
