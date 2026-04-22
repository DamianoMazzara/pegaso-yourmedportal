# API in Python (FastAPI)

È l’equivalente dell’`apps/api` in TypeScript: stesso MySQL, stesse route REST. Le env sono quelle del monorepo (`.env` in root: `DATABASE_URL`, `JWT_SECRET`, `API_PORT`, `PUBLIC_API_URL`, e opzionale `UPLOAD_DIR`). Il **database non è avviato dal `docker-compose` del monorepo** (lì ci sono solo API e web; su Dokploy MySQL va creato a parte): stesso modello, stringa `DATABASE_URL` che punta al tuo MySQL.

**Setup (Windows, da questa cartella):**

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

**DB:** se le tabelle ci sono già (es. dopo `npm run db:reset` con Drizzle), allinea solo Alembic:

```powershell
alembic -c alembic.ini stamp head
```

Se il database è vuoto: `alembic -c alembic.ini upgrade head`.

**Avvio:** `PYTHONPATH` che punta a `src` (oppure `pip install -e .` dal `pyproject`), poi ad es.:

```powershell
$env:API_PORT=3001
uvicorn yourmedportal_api.main:app --host 0.0.0.0 --port $env:API_PORT
```

Le cartelle `uploads/` dipendono dalla working directory, come con il processo Node. Swagger: `/swagger`, spec: `/openapi.json`.
