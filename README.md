# Beauty Salons (Warszawa)

Next.js 14 application with TypeScript, Tailwind CSS, App Router, and a local SQLite database (`better-sqlite3`) storing Warsaw beauty salon listings.

## Prerequisites

- Node.js 18+
- npm
- Build tools for native modules (Windows: Visual Studio Build Tools or `windows-build-tools` if `better-sqlite3` fails to compile)

## Setup

```bash
npm install
```

Copy optional environment config:

```bash
copy .env.example .env
```

By default the database file is created at `data/beauty_salons.db`. Override with `DATABASE_PATH` in `.env` if needed.

## Database

Create tables and indexes:

```bash
npm run db:migrate
```

Seed 110 sample salons (Warsaw districts, ratings 3.5–5.0, Polish names and addresses):

```bash
npm run db:seed
```

Or run both:

```bash
npm run db:setup
```

To re-seed from scratch, delete the database file (e.g. `data/beauty_salons.db`) and run `npm run db:seed` again.

### Schema: `Salon`

| Column        | Type    | Notes                          |
|---------------|---------|--------------------------------|
| id            | INTEGER | Primary key                    |
| name          | TEXT    |                                |
| address       | TEXT    |                                |
| district      | TEXT    | Indexed                        |
| phone         | TEXT    |                                |
| website       | TEXT    |                                |
| services      | TEXT    | JSON array string              |
| price_range   | TEXT    |                                |
| rating        | REAL    | Indexed                        |
| review_count  | INTEGER |                                |
| latitude      | REAL    |                                |
| longitude     | REAL    |                                |
| created_at    | TEXT    | ISO datetime, default `now`    |
| updated_at    | TEXT    | ISO datetime, default `now`    |

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page reads from SQLite on the server.

## Project layout

- `app/` — App Router pages
- `lib/db/` — schema, migrations, server-only DB client, query helpers
- `scripts/` — CLI migrate and seed (run via `tsx`, outside the webpack bundle)
- `data/` — SQLite file location (gitignored)

`better-sqlite3` is only imported from server code (`lib/db/client.ts` uses `server-only`) or from `scripts/` for seeding.

## Scripts

| Script          | Description                    |
|-----------------|--------------------------------|
| `npm run dev`   | Start dev server               |
| `npm run build` | Production build               |
| `npm run db:migrate` | Create schema and indexes |
| `npm run db:seed`    | Insert 110 sample salons  |
| `npm run db:setup`   | migrate + seed            |

## Security

Do not commit `.env` or database files. `.gitignore` excludes `node_modules`, `.env*`, and `*.db` files.
