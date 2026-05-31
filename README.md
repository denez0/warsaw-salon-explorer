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

Seed 100 sample salons into the local SQLite database:

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

## Quick Demo

After setup, the app shows:
1. **Listing page** (`/`) — Grid of salon cards with name, district badge, star rating, and review count
2. **District filter** — Click district chips to filter (Śródmieście, Mokotów, Praga, etc.)
3. **Search** — Type to filter by salon name or services
4. **Detail view** — Click any salon card to see full details
5. **Edit mode** — Click "Edit" on a detail page to modify salon information (saves via PUT API)

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

## Design Decisions

### Why Google Maps as the data source?
Google Maps provides the most comprehensive, up-to-date listings for Warsaw beauty salons with verified ratings and review counts. Unlike Booksy (which blocked automated access during development), Google Maps results are publicly accessible and contain structured data including ratings, review counts, and addresses that can be parsed without authentication.

### Why SQLite?
Zero-configuration database that requires no separate server process. The entire database is a single file — perfect for an MVP that should run immediately after `npm install && npm run db:setup`. If scaling to production, I'd migrate to PostgreSQL for concurrent write support and geospatial queries.

### Why Next.js?
Single codebase for both frontend and backend eliminates CORS issues, reduces configuration overhead, and allows server-side rendering for fast initial page loads. The API routes pattern maps naturally to REST endpoints without requiring a separate Express/Fastify server.

### Why no phone/website data?
The Google Maps search results page does not expose phone numbers or websites without clicking into each listing's detail panel. During development, the detail-panel click approach proved unreliable (DOM changes, rate limiting). For the MVP, I prioritized having 100+ records with accurate names, addresses, districts, ratings, and review counts over incomplete enrichment. In production, the Google Places API returns all fields — including formatted_phone_number and website — in a single API call.

### Read-only ratings
Ratings and review counts come from Google Maps and reflect real customer experiences. The edit form only allows modification of salon-owned information (phone, website, services, price range). Ratings are displayed but not editable to maintain data integrity.

## What I'd Improve With More Time

1. **Google Places API integration** — Replace scraping with the official API for reliable phone, website, price level, and photo data
2. **Geospatial search** — Add PostgreSQL/PostGIS for "salons near me" queries and map-based browsing with Leaflet
3. **Image support** — Display salon photos from Google Places to help users evaluate options visually
4. **Booking integration** — Connect with Booksy API for real-time availability and appointment scheduling
5. **Pagination** — Server-side pagination for the salon listing (currently all records load at once — fine for 100, not for 10,000)
6. **Authentication** — Admin login to protect the edit functionality
7. **Automated data refresh** — Scheduled GitHub Action to re-scrape weekly and keep listings current
8. **Full-text search** — Elasticsearch or PostgreSQL full-text search for searching by service type or salon name
9. **Mobile responsiveness testing** — Test and polish the UI across device sizes
10. **Analytics** — Track which districts and services are most searched to guide data collection priorities

## Scaling to All of Poland

The current architecture supports Warsaw (~100 records) but would need changes for nationwide scale:

- **Data Collection**: Replace district-by-district scraping with the Google Places API using a grid-based search pattern. Poland has ~900 cities/towns; a grid search at 5km resolution would cover the country in ~50,000 API calls.
- **Database**: Migrate from SQLite to PostgreSQL with PostGIS extension for geospatial indexing. Add table partitioning by voivodeship for query performance.
- **API**: Add response caching (Redis), rate limiting, and pagination. Consider GraphQL for flexible field selection on mobile clients.
- **Infrastructure**: Deploy on AWS/Google Cloud with auto-scaling. Database read replicas for high-traffic regions. CDN (Cloudflare) for static assets.
- **Data Pipeline**: Scheduled Airflow/Prefect jobs for incremental data updates. Deduplication using fuzzy matching on name + coordinates. ML-based categorization for service type classification.

The core architecture — Next.js API routes reading from a relational database — scales to this level with those infrastructure additions.
