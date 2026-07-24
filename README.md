# BloxDeck

BloxDeck is a Roblox companion launcher. It organizes saved experiences, favorites,
collections, launch history, and opens games only through official Roblox URLs:

```txt
https://www.roblox.com/games/{placeId}
```

It does not ask for Roblox passwords, `.ROBLOSECURITY`, private tokens, cookies, or modify the
official Roblox client, process, files, or network behavior.

## Stack

- Monorepo: pnpm workspaces through Corepack
- Backend: Python, FastAPI, Uvicorn, SQLAlchemy
- Database: PostgreSQL with Alembic migrations
- Desktop: Tauri v2, React 19, TypeScript, Vite
- UI: Tailwind CSS v4, Radix UI, Lucide React
- State/data: Zustand, TanStack Query
- DB inspection: DBeaver

## Project Layout

```txt
RobloxDeck/
  backend/
    app/
    scripts/
    requirements.txt
  frontend/
    src/
    src-tauri/
  alembic/
    versions/
  packages/
    shared/
    ui/
  .env
  alembic.ini
  package.json
  pnpm-workspace.yaml
```

## Requirements

- Node.js 20+ with Corepack
- Python 3.11+
- PostgreSQL running locally
- DBeaver for database inspection
- Rust toolchain for Tauri desktop builds

## Database

The local database name is:

```txt
bloxdeck
```

Create it in DBeaver if it does not exist yet. The project reads the connection from `.env` and
`backend/.env`.

## Roblox Login

Real Roblox login needs an OAuth 2.0 app in Roblox Creator Dashboard. Configure its redirect URI as:

```txt
http://localhost:3333/auth/roblox/callback
```

Then add these values to `.env` and `backend/.env`:

```env
ROBLOX_CLIENT_ID=your_client_id
ROBLOX_CLIENT_SECRET=your_client_secret
ROBLOX_REDIRECT_URI=http://localhost:3333/auth/roblox/callback
ROBLOX_SCOPES=openid profile user.inventory-item:read
```

Restart the backend after changing OAuth variables.

## Setup

From the project root:

```powershell
cd C:\Users\Lucas\Documents\workspaces\RobloxDeck
corepack.cmd pnpm install
corepack.cmd pnpm --filter api exec node scripts/python.cjs -m pip install --target ..\.python-packages -r requirements.txt
```

Run Alembic migrations:

```powershell
corepack.cmd pnpm db:migrate
```

Start the Python API with Uvicorn:

```powershell
corepack.cmd pnpm dev:api
```

API URL:

```txt
http://localhost:3333
```

Check or stop the backend:

```powershell
corepack.cmd pnpm api:status
corepack.cmd pnpm api:stop
```

You can also run Uvicorn directly:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 3333 --reload
```

Start the frontend in the browser:

```powershell
corepack.cmd pnpm dev:front
```

Start the frontend and open Chrome automatically:

```powershell
corepack.cmd pnpm dev:chrome
```

Or from the frontend folder:

```powershell
cd frontend
corepack.cmd pnpm run dev
```

Start the native Tauri app:

```powershell
corepack.cmd pnpm dev:tauri
```

## Useful Scripts

```json
{
  "dev": "corepack pnpm -r --parallel dev",
  "dev:api": "corepack pnpm --filter api dev",
  "api:status": "corepack pnpm --filter api status",
  "api:stop": "corepack pnpm --filter api stop",
  "dev:desktop": "corepack pnpm --filter desktop dev",
  "dev:front": "corepack pnpm --filter desktop dev",
  "dev:chrome": "corepack pnpm --filter desktop dev:chrome",
  "dev:tauri": "corepack pnpm --filter desktop dev:tauri",
  "db:migrate": "corepack pnpm --filter api migrate",
  "db:studio": "echo Use DBeaver for database inspection",
  "build": "build backend, shared packages, and frontend web",
  "build:desktop": "build native Tauri app"
}
```

## API Routes

```txt
GET    /health
GET    /games
POST   /games
GET    /games/:id
PATCH  /games/:id
DELETE /games/:id

GET    /favorites
POST   /favorites/:gameId
DELETE /favorites/:gameId

GET    /collections
POST   /collections
GET    /collections/:id
POST   /collections/:id/games/:gameId
DELETE /collections/:id/games/:gameId

GET    /history
POST   /history/:gameId
DELETE /history
DELETE /history/:historyId

GET    /stats
GET    /profile
PATCH  /profile

GET    /auth/roblox/start
POST   /auth/roblox/callback
DELETE /auth/roblox/session

GET    /roblox/social
GET    /roblox/users/:userId/profile
GET    /roblox/inventory
```

## Data Flow

The desktop app never connects directly to PostgreSQL. It talks to the FastAPI backend through
`VITE_API_URL`.

`POST /history/:gameId` is called before opening an official Roblox game URL. If the API is
temporarily unavailable, the launcher still opens the official URL and logs the issue in the
desktop console.

## Safety Boundaries

BloxDeck intentionally excludes:

- executors
- exploits
- anticheat bypass
- DLL injection
- prohibited automation
- Roblox password or cookie capture
- official client modification
- hooks into the Roblox process
