# Front-end (SvelteKit)

Interfaccia del portale: area pubblica (prenotazioni, referti) e pannello operatori. Stile con Tailwind; componenti UI in stile shadcn.

## Prerequisiti

Node e npm (come da monorepo). L’URL dell’API va in `PUBLIC_API_URL` nel file `.env` della root, raggiungibile dal browser (es. `http://localhost:3001`).

## Comandi (da `apps/web`)

| Comando     | Cosa fa                |
| ----------- | ---------------------- |
| `npm run dev`    | server di sviluppo (Vite) |
| `npm run build`  | build produzione     |
| `npm run check`  | `svelte-check` + tipi  |
| `npm run test:e2e` | Playwright (serve l’app da root con `webServer` nel config) |

In sviluppo l’app è in genere su `http://127.0.0.1:5173` se non cambi la porta in Vite.

## Produzione (build statica / Docker)

La build di produzione usa `@sveltejs/adapter-static` (output in `build/`) e, nel deployment Docker del monorepo, l’immagine **nginx** definita in `apps/web/Dockerfile`. **MySQL non è incluso** nel `docker-compose` del repository: va provisionato a parte (es. su Dokploy) e l’URL dell’API per il browser va impostato al build (es. `PUBLIC_API_URL`). Dettagli: **[README alla root del monorepo](../README.md)** (sezione Docker / Dokploy).
