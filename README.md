# YourMedPortal

Applicazione **full-stack** per il **project work** (traccia *API-based* nel settore sanitario): portale per **prenotazioni**, **referti** con allegati e **dashboard operativa** per gli operatori. L’**[`analisi funzionale`](docs/analisi-funzionale.pdf)** del dominio resta in `docs/`.

## Contesto e scelta organizzativa (PAMAFIR)

Il caso d’uso è calato su un’impresa sanitaria multi-servizio del tipo **laboratorio di analisi, diagnostica strumentale e ambulatori**, analogamente a reti come **PAMAFIR (Gruppo sanitario Pa.ma.fi.r.)**: molte sedi, convenzioni, prenotazioni ad alta frequenza e consegna di **referti** e allegati in formato digitale. La digitalizzazione qui riguarda soprattutto **prenotazione controllata degli slot**, **tracciamento referti** con codice e codice fiscale, e **strumenti interni** per macroaree, tipologie visita, calendario e audit delle attività.

## Obiettivo del project work e adempimenti

Rispetto alla consegna / traccia, il repository copre:

- **Front-end** web (HTML, CSS, JavaScript tramite **SvelteKit** e **Svelte 5**).
- **Back-end** **API REST** in **TypeScript** (linguaggio object-oriented), con persistenza **MySQL** e **Drizzle ORM**.
- **Contratto API** descritto in **OpenAPI 3** ed esplorabile via **Swagger UI** sull’istanza dell’API (`/swagger`, specifica in `/openapi.json`).

In questo repo ci sono il codice, l’**OpenAPI** (Swagger) e, per il rapporto, gli **screenshot** in [`docs/artifacts/`](docs/artifacts/) e sotto le **sezioni UML / ER** (file sorgente `.mmd` + immagini esportate).

## Schemi UML (API)

Diagrammi dell’architettura a oggetti del back-end in `apps/api` (pacchetti, classi, servizi, repository). Sorgente **Mermaid** in `docs/diagrams/`; anteprima o stampa da **`docs/artifacts/`** (PNG o SVG). Per rigenerare le immagini dopo una modifica agli `.mmd`: `npm run docs:uml` o `npm run docs:diagrams` (con Node/npx, scarica Mermaid CLI al bisogno).

| Contenuto | Sorgente (`.mmd`) | Esportazione |
| --- | --- | --- |
| Vista macro a pacchetti / layer | [`docs/diagrams/uml-api-packages.mmd`](docs/diagrams/uml-api-packages.mmd) | [PNG](docs/artifacts/uml-api-packages.png) · [SVG](docs/artifacts/uml-api-packages.svg) |
| Classi (servizi, repository, `AppContainer`, …) | [`docs/diagrams/uml-api-classes.mmd`](docs/diagrams/uml-api-classes.mmd) | [PNG](docs/artifacts/uml-api-classes.png) · [SVG](docs/artifacts/uml-api-classes.svg) |

## Schema ER (database)

Modello entità–relazione coerente con le tabelle in `apps/api/src/db/schema.ts` (Drizzle su MySQL). Sorgente in [`docs/diagrams/er-db.mmd`](docs/diagrams/er-db.mmd); per il report usare in genere le immagini sotto. Rigenerazione: `npm run docs:er` oppure `npm run docs:diagrams`.

| Esportazione |
| --- |
| [er-database.png](docs/artifacts/er-database.png) · [er-database.svg](docs/artifacts/er-database.svg) |

*Nota:* nello schema Drizzle non sono definite tutte le foreign key a livello di DB; le linee del diagramma sono le relazioni previste a livello logico e usate dal codice.

### Leggenda dello schema ER

Il diagramma l’ho fatto in Mermaid (`er-db.mmd`): tra due tabelle c’è una linea e agli estremi ci sono quei trattini / parentesi stile “crow’s foot” che a lezione hanno chiamato cardinalità. In pratica ti dice se da un lato è collegata **una** riga sola o se dall’altra ne arrivano **tante** (o anche zero).

- **`||`**: da quel lato il legame c’è **sempre** (è una, non zero). Nel dubbio: pensa *deve* esserci il collegamento.
- **`o{` / lato con la “coda” verso le molte**: dall’altra parte ci possono stare **0, 1, 2, …** record. È il caso classico 1 a N: una macroarea, sotto tante tipologie; una prenotazione appartiene a **una** tipologia ma una tipologia ha **tante** prenotazioni, ecc. Nel mio schema è tutto così, salvo dove dico sotto; **N a N** non c’è: se servisse, di solito si mette in mezzo un’altra tabella ponte, qui non l’ho messa.
- **`|o`**: significa *zero o uno* — cioè il collegamento **può** non esserci. L’esempio qui è `admin_user_id` sui log: in tabella c’è il campo ma può essere vuoto, quindi il log c’è lo stesso senza un operatore collegato.

**Deve / può** in due parole: se la colonna in DB ha il **NOT NULL** sulla foreign key, allora **deve** esserci il record padre; se il campo ammette **NULL**, allora quella parte del legame **può** mancare, anche se la riga c’è.

## Approccio e scelte progettuali

- **API-first**: il front-end consuma solo le route REST documentate; nessun accoppiamento proprietario tra client e server oltre al contratto HTTP/JSON (e stream file dove previsto).
- **Separazione per contesti**: endpoint **pubblici** (`/api/public/...`, scarico allegati) vs **amministrativi** (`/api/admin/...` e upload allegati con **JWT**).
- **Dominio laboratorio**: **macroaree** (capacità e durata slot), **tipologie visita**, **prenotazioni** con codice, **referti** (stato *pending* / *ready*), **allegati** (PDF/immagini) con limite quantità e dimensione.
- **Back-end strutturato**: composizione tramite **contenitore applicativo** (`AppContainer`), servizi di applicazione e repository verso il DB, per mantenere le regole di business in moduli dedicati e testabili.
- **OpenAPI** coerente con l’esecuzione: health, download allegato pubblico, upload referto in multipart.

## Funzionalità principali

| Area | Contenuto |
|------|-----------|
| **Portale pubblico** | Home, prenotazione con scelta tipologia e settimana, annullamento con CF + codice, consultazione referto con CF + codice, download allegati autorizzati. |
| **Area operatori** | Login JWT, panoramica indicatori, gestione macroaree e tipologie, calendario/prenotazioni, referti (creazione, note, allegati), utenti amministratori, log attività. |
| **API** | REST + OpenAPI; autenticazione **Bearer** per le route admin; upload **multipart/form-data** per gli allegati referto. |

## Stack tecnico

- **`apps/web`** — SvelteKit 2, Svelte 5, componenti UI (shadcn-svelte), Tailwind; client HTTP verso l’API.
- **`apps/api`** — Hono, `@hono/zod-openapi`, Swagger UI, Drizzle ORM, MySQL 8.4.
- **Monorepo** — `npm` workspaces e **Turborepo** (`turbo`).

*Nota:* la traccia indica tra i linguaggi adatti **Java** e **Python**; l’API principale resta in **TypeScript** (a oggetti, servizi, repository), ma per evitare dubbi in sede di valutazione su quanto basti quel paradigma, ho aggiunto anche un’**API equivalente in Python (FastAPI)**. Setup e avvio: **[`apps/python-api/README.md`](apps/python-api/README.md)**.

## Avvio in sviluppo

Prerequisiti: **Node.js**, **npm** e un **MySQL 8.4** (o compatibile) raggiungibile tramite `DATABASE_URL`. Il database **non** è avviato dal `docker-compose.yml` del repository: in **sviluppo locale** puoi usare un’istanza installata a mano, un container dedicato, oppure un servizio remoto, purché l’URL in `.env` sia corretto.

1. Clonare il repository e installare le dipendenze:

   ```bash
   npm install
   ```

2. Copiare l’ambiente e configurare la connessione al database:

   ```bash
   cp .env.example .env
   ```

   Modifica `DATABASE_URL` in `.env` in base a dove gira MySQL (host, porta, utente, password, database). Esempio con MySQL in container dedicato (comando a parte, non dal compose del repo):

   ```bash
   docker run -d --name yourmedportal-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=yourmedportal -p 3306:3306 mysql:8.4
   ```

   Poi allinea `DATABASE_URL` a quell’host/porta (es. `mysql://root:root@127.0.0.1:3306/yourmedportal`).

3. Inizializzare o resettare lo schema e i dati di prova:

   ```bash
   npm run db:reset
   ```

4. Avviare API e web app:

   ```bash
   npm run dev
   ```

   Di default l’API espone la porta **3001** e il front-end (Vite) la **5173**; `PUBLIC_API_URL` nel `.env` deve coincidere con l’URL raggiungibile dal browser (es. `http://localhost:3001`).

Dopo l’avvio: documentazione interattiva **Swagger** su `http://localhost:3001/swagger` (e `openapi.json` sulla stessa base URL).

## Docker Compose e deployment (es. Dokploy)

Il file **`docker-compose.yml` in root** serve a costruire e avviare **solo** i servizi applicativi:

- **`api`** — immagine da `apps/api` (`tsc` + `node` sulla porta 3001);
- **`web`** — build statica SvelteKit (`@sveltejs/adapter-static`) servita con **nginx**.

I servizi sono collegati alla rete esterna **`dokploy-network`**, come previsto per il deployment su **[Dokploy](https://docs.dokploy.com/)** (Traefik, routing, certificati). In Dokploy **MySQL non va definito in questo compose**: va creato a parte (database applicativo Dokploy, stack dedicato, o istanza esterna). L’API ottiene la connessione solo tramite variabili d’ambiente (es. `DATABASE_URL` nel file env associato al servizio o ai secret): il compose **non** provisiona il database.

In produzione, al **build** del front-end passa l’URL pubblico dell’API, ad esempio `PUBLIC_API_URL` come build arg (vedi `docker-compose.yml`), e configura **CORS** sull’API se domini e porte differiscono (variabile `CORS_ORIGINS` sull’API, oltre alle origini di default per sviluppo).

In sviluppo locale, se la rete `dokploy-network` non esiste ancora: `docker network create dokploy-network` (una tantum) prima di `docker compose up --build`, oppure adatta i nomi di rete al tuo ambiente.

## Test

È presente una suite di **integrazione** sull’API (richiede DB configurato tramite `.env`):

```bash
npm run api:test
```

Sul **front-end** sono disponibili test **end-to-end** con **Playwright** (flussi UI contro l’API reale). Avvia prima API e web in dev (o comunque un’istanza raggiungibile come da `PUBLIC_API_URL`), poi dalla root:

```bash
npm run web:e2e
```

Alla prima esecuzione può essere necessario installare i browser di test: `npx playwright install` (dalla cartella `apps/web`).

## Anteprima schermate (test funzionale)

Le immagini sotto sono tratte da [`docs/artifacts/`](docs/artifacts/) e documentano il flusso pubblico, l’accesso operatori, la documentazione OpenAPI e le schermate amministrative.

### Portale pubblico

| | | |
|:---:|:---:|:---:|
| [![Home](docs/artifacts/public/home.png)](docs/artifacts/public/home.png) | [![Prenota](docs/artifacts/public/prenota.png)](docs/artifacts/public/prenota.png) | [![Annulla prenotazione](docs/artifacts/public/annulla-prenotazione.png)](docs/artifacts/public/annulla-prenotazione.png) |
| [Home](docs/artifacts/public/home.png) | [Prenota](docs/artifacts/public/prenota.png) | [Annulla](docs/artifacts/public/annulla-prenotazione.png) |

| | |
|:---:|:---:|
| [![Referti](docs/artifacts/public/referti.png)](docs/artifacts/public/referti.png) | [![Dettaglio referto](docs/artifacts/public/referti-dettaglio.png)](docs/artifacts/public/referti-dettaglio.png) |
| [Referti](docs/artifacts/public/referti.png) | [Dettaglio referto](docs/artifacts/public/referti-dettaglio.png) |

### Accesso operatori e API

| | |
|:---:|:---:|
| [![Login operatori](docs/artifacts/Login%20Operatori.png)](docs/artifacts/Login%20Operatori.png) | [![Swagger UI](docs/artifacts/Swagger%20UI.png)](docs/artifacts/Swagger%20UI.png) |
| [Login operatori](docs/artifacts/Login%20Operatori.png) | [Swagger UI](docs/artifacts/Swagger%20UI.png) |

### Dashboard amministrativa

| | | |
|:---:|:---:|:---:|
| [![Panoramica](docs/artifacts/admin/panoramica.png)](docs/artifacts/admin/panoramica.png) | [![Macroaree](docs/artifacts/admin/macroaree.png)](docs/artifacts/admin/macroaree.png) | [![Tipologie visita](docs/artifacts/admin/tipologie-visita.png)](docs/artifacts/admin/tipologie-visita.png) |
| [Panoramica](docs/artifacts/admin/panoramica.png) | [Macroaree](docs/artifacts/admin/macroaree.png) | [Tipologie](docs/artifacts/admin/tipologie-visita.png) |

| | | |
|:---:|:---:|:---:|
| [![Calendario](docs/artifacts/admin/calendario.png)](docs/artifacts/admin/calendario.png) | [![Prenotazioni](docs/artifacts/admin/prenotazioni.png)](docs/artifacts/admin/prenotazioni.png) | [![Referti](docs/artifacts/admin/referti.png)](docs/artifacts/admin/referti.png) |
| [Calendario](docs/artifacts/admin/calendario.png) | [Prenotazioni](docs/artifacts/admin/prenotazioni.png) | [Referti admin](docs/artifacts/admin/referti.png) |

| | |
|:---:|:---:|
| [![Utenti admin](docs/artifacts/admin/utenti-admin.png)](docs/artifacts/admin/utenti-admin.png) | [![Log attività](docs/artifacts/admin/log-attivita.png)](docs/artifacts/admin/log-attivita.png) |
| [Utenti](docs/artifacts/admin/utenti-admin.png) | [Log attività](docs/artifacts/admin/log-attivita.png) |

---

*Repository dedicato al project work — CdS Informatica per le Aziende Digitali (L-31), tema “La digitalizzazione dell’impresa”.*
