#!/bin/sh
set -e
# Svelte/Vite bakes import.meta.env at build time. This injects the API URL at
# container start so runtime env (e.g. Dokploy) can set PUBLIC_API_URL without a rebuild.
URL="${PUBLIC_API_URL:-http://localhost:3001}"
escaped=$(printf '%s' "$URL" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g")
printf "window.__YMP__={publicApiUrl:'%s'};\n" "$escaped" > /usr/share/nginx/html/config.js
exec nginx -g 'daemon off;'
