# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
ARG PUBLIC_API_URL=http://localhost:3001
ENV PUBLIC_API_URL=$PUBLIC_API_URL
COPY package.json package-lock.json ./
COPY apps/web apps/web
RUN npm ci -w web
RUN npm run build -w web

FROM nginx:alpine AS runner
COPY --from=build /app/apps/web/build /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 3002
ENTRYPOINT ["/docker-entrypoint.sh"]
