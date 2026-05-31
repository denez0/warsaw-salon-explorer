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

Seed 110 sample salons into the local SQLite database:

```bash
npm run db:seed
```

Or run both:

```bash
npm run db:setup
```

If you are working with raw scraped JSON, run the cleanup script first:

```bash
npm run data:clean
```

This writes normalized copies into `data/cleaned-*.json` and drops empty or generic fields such as ambiguous `price_range` values.

To re-seed from scratch, delete the database file (e.g. `data/beauty_salons.db`) and run `npm run db:seed` again.

### Schema: `Salon`

| Column       | Type    | Notes                       |
| ------------ | ------- | --------------------------- |
| id           | INTEGER | Primary key                 |
| name         | TEXT    |                             |
| address      | TEXT    |                             |
| district     | TEXT    | Indexed                     |
| phone        | TEXT    |                             |
| website      | TEXT    |                             |
| services     | TEXT    | JSON array string           |
| price_range  | TEXT    |                             |
| rating       | REAL    | Indexed                     |
| review_count | INTEGER |                             |
| latitude     | REAL    |                             |
| longitude    | REAL    |                             |
| created_at   | TEXT    | ISO datetime, default `now` |
| updated_at   | TEXT    | ISO datetime, default `now` |

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page reads from SQLite on the server.

## Project layout

- `app/` — App Router pages
- `lib/db/` — schema, migrations, server-only DB client, query helpers
- `scripts/` — CLI migrate, seed, and data cleanup tools (run via `tsx`, outside the webpack bundle)
- `data/` — raw JSON and SQLite database file location (gitignored)

`better-sqlite3` is only imported from server code (`lib/db/client.ts` uses `server-only`) or from `scripts/` for seeding.

## Google Maps scraper

Fetch Warsaw salon/barber listings from [Google Maps](https://www.google.com/maps) into `data/maps-salons.json` (UTF-8 JSON array). Uses Puppeteer with stealth via `puppeteer-extra`.

```bash
npm run scrape:maps
```

Optional environment variables:

| Variable                                  | Default    | Purpose                                                   |
| ----------------------------------------- | ---------- | --------------------------------------------------------- |
| `SCRAPE_MAX_QUERIES`                      | all        | Limit district search queries (for testing)               |
| `SCRAPE_SCROLL_MIN` / `SCRAPE_SCROLL_MAX` | `5` / `10` | Random scroll rounds on the results feed                  |
| `SCRAPE_MAX_DETAIL_CLICKS`                | `40`       | Max place detail pages for full address / phone / website |
| `SCRAPE_HEADLESS`                         | headless   | Set to `false` to show the browser                        |

Flags: `--dry-run` (no file write), `--headed`, `--listings-only` (skip detail-panel enrichment).

Output fields: `name`, `address`, `district`, `rating`, `review_count`, `phone`, `website`, `source_url`, `scraped_at`. Searches use Polish district names in the query URL (`fryzjer`, `salon urody`, `barber` × Warsaw districts). Saves incrementally after each district. `data/maps-salons.json` is gitignored.

Fetch Warsaw salon/barber listings from [Google Maps](https://www.google.com/maps) into `data/maps-salons.json` (UTF-8 JSON array). Uses Puppeteer with the stealth plugin (Chromium from `puppeteer`).

```bash
npm run scrape:maps
```

Optional environment variables:

| Variable                                  | Default    | Purpose                                                   |
| ----------------------------------------- | ---------- | --------------------------------------------------------- |
| `SCRAPE_MAX_QUERIES`                      | all        | Limit district search queries (for testing)               |
| `SCRAPE_SCROLL_MIN` / `SCRAPE_SCROLL_MAX` | `5` / `10` | Random scroll rounds on the results feed                  |
| `SCRAPE_MAX_DETAIL_CLICKS`                | `40`       | Max place detail pages for full address / phone / website |
| `SCRAPE_HEADLESS`                         | headless   | Set to `false` to show the browser                        |

Flags: `--dry-run` (no file write), `--headed`, `--listings-only` (skip detail-panel enrichment).

Output fields: `name`, `address`, `district`, `rating`, `review_count`, `phone`, `website`, `source_url`, `scraped_at`. Searches use Polish district names in the query URL (`fryzjer`, `salon urody`, `barber` × Warsaw districts). Saves incrementally after each district. `data/maps-salons.json` is gitignored.

## Scripts

| Script                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Start dev server                                |
| `npm run build`       | Production build                                |
| `npm run db:migrate`  | Create schema and indexes                       |
| `npm run db:seed`     | Insert 110 sample salons                        |
| `npm run db:setup`    | migrate + seed                                  |
| `npm run data:clean`  | Clean raw JSON data files and normalize records |
| `npm run scrape:maps` | Scrape Google Maps → JSON                       |

## Security

Do not commit `.env` or database files. `.gitignore` excludes `node_modules`, `.env*`, and `*.db` files.
