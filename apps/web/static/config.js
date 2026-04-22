// In `npm run dev`, Vite serves this file; `publicApiUrl` is left empty so `api.ts` uses
// `PUBLIC_API_URL` from the root `.env`. In Docker, docker-entrypoint.sh overwrites
// the built `config.js` with the real URL.
window.__YMP__ = { publicApiUrl: '' };
