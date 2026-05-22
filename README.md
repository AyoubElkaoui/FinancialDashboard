# Syntess Rapport

Business intelligence dashboard voor Syntess Atrium (Firebird database). Strikt read-only.

## Stack

| Laag | Technologie |
|------|-------------|
| Backend | Node.js 25 + Fastify 5 + TypeScript strict |
| Database driver | node-firebird 1.1.x |
| Frontend | Next.js 16 + React 19 + TypeScript strict |
| UI | shadcn/ui (Base UI) + Tailwind CSS v4 |
| Data fetching | TanStack Query v5 |
| Tabellen | TanStack Table v8 |
| Charts | Recharts |
| Export | ExcelJS (xlsx) |

---

## Één commando starten

```bash
# Eerste keer: dependencies installeren
npm run setup

# Daarna altijd:
npm run dev
```

Opent backend op `http://localhost:3001` en frontend op `http://localhost:3000`.
Inloggen met **admin / admin**.

> **Mock mode** is standaard aan — werkt zonder Firebird DB.
> Zet `MOCK_MODE=false` in `backend/.env` voor live data.

---

## Snelle start

### 1. Read-only Firebird user aanmaken

Voer uit als SYSDBA op de Syntess server:

```bash
isql -user SYSDBA -pass masterkey /pad/naar/SYNTESS.FDB
```

```sql
INPUT /pad/naar/syntess-rapport/backend/scripts/create-readonly-user.sql;
```

Pas het wachtwoord aan in het SQL-script vóór je het uitvoert.

### 2. Backend configureren

```bash
cd backend
cp .env.example .env
# Vul in: FB_DATABASE, FB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
nano .env
```

### 3. Backend testen

```bash
cd backend
npm install
npm run test:connection     # Test Firebird verbinding
npm run introspect          # Schrijft docs/SCHEMA.md
```

### 4. Frontend configureren

```bash
cd frontend
cp .env.example .env.local
# Vul NEXT_PUBLIC_API_URL in als backend niet op localhost:3001 draait
```

### 5. Development starten

**Backend:**
```bash
cd backend
npm run dev
# Draait op http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm run dev
# Draait op http://localhost:3000
```

---

## Productie deployment (Docker)

```bash
# 1. .env files invullen
cp backend/.env.example backend/.env && nano backend/.env

# 2. Starten
docker compose up -d

# 3. Logs checken
docker compose logs -f backend
```

**Let op:** Als Firebird op dezelfde host draait, zet in `docker-compose.yml`:
- `network_mode: host` voor de backend container, of
- `FB_HOST=host.docker.internal` in de backend `.env`

---

## API endpoints

| Methode | Path | Omschrijving |
|---------|------|--------------|
| POST | `/api/v1/auth/login` | Inloggen |
| GET | `/api/v1/auth/me` | Huidig gebruiker |
| GET | `/api/v1/health` | Health check + DB status |
| GET | `/api/v1/dashboard/kpis` | KPI cijfers |
| GET | `/api/v1/dashboard/omzet-per-maand` | Omzet grafiek data |
| GET | `/api/v1/dashboard/top-klanten` | Top 10 klanten |
| GET | `/api/v1/projecten` | Projectenlijst (paginated) |
| GET | `/api/v1/projecten/:id` | Project detail |
| GET | `/api/v1/facturen` | Facturenlijst (paginated) |
| GET | `/api/v1/facturen/aging` | Aging buckets |
| GET | `/api/v1/facturen/:id` | Factuur detail |
| GET | `/api/v1/werkbonnen` | Werkbonnenlijst |
| GET | `/api/v1/klanten` | Klantenlijst |
| GET | `/api/v1/inkoop` | Inkoopfacturen |
| GET | `/api/v1/grootboek/rubrieken` | Grootboekrekeningen |
| GET | `/api/v1/grootboek/mutaties` | Mutaties (paginated) |
| GET | `/api/v1/rapportages/export` | Excel/PDF export |

Alle endpoints behalve `/auth/login` en `/health` vereisen `Authorization: Bearer <token>`.

---

## Schema introspectie

Na het instellen van de DB verbinding:

```bash
cd backend && npm run introspect
```

Dit schrijft `backend/docs/SCHEMA.md` met alle `AT_*` tabellen, kolommen en foreign keys.
Stuur de output naar de ontwikkelaar zodat de queries op de echte schema's afgestemd kunnen worden.

---

## Veiligheid

- Backend verbindt **altijd** als read-only user `SYNTESS_RO`
- Alle SQL gebruikt parameterized queries — geen string concatenation
- Tabel-/kolomnamen uit user-input worden getoetst aan een whitelist
- Rate limiting: 200 req/min globaal, 5 auth-pogingen per 15 min
- JWT in Authorization header (niet in cookie, zodat CSRF niet van toepassing is)
- SQL errors worden nooit naar de client gelekt

---

## Volgende stappen na introspectie

1. Stuur `docs/SCHEMA.md` op
2. Queries in `src/routes/` afstemmen op echte kolomnamen
3. Overige modules (werkbonnen, klanten, inkoop, grootboek, rapportages) volledig bouwen
4. Dashboard KPI queries verfijnen op basis van echte data

---

## Licentie

Intern gebruik. Niet voor verspreiding.
