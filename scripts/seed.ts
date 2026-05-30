import { openStandaloneDb } from "../lib/db/standalone";
import { getDatabasePath } from "../lib/db/path";
import { generateSalons } from "./seed-data";

const INSERT_SQL = `
INSERT INTO Salon (
  name, address, district, phone, website, services,
  price_range, rating, review_count, latitude, longitude
) VALUES (
  @name, @address, @district, @phone, @website, @services,
  @price_range, @rating, @review_count, @latitude, @longitude
);
`;

function main(): void {
  const db = openStandaloneDb();
  const existing = db
    .prepare("SELECT COUNT(*) AS count FROM Salon")
    .get() as { count: number };

  if (existing.count > 0) {
    console.log(
      `Database already has ${existing.count} salons. Skipping seed (delete ${getDatabasePath()} to re-seed).`
    );
    db.close();
    process.exit(0);
  }

  const salons = generateSalons(110);
  const insert = db.prepare(INSERT_SQL);

  const insertMany = db.transaction((rows: ReturnType<typeof generateSalons>) => {
    for (const salon of rows) {
      insert.run({
        ...salon,
        services: JSON.stringify(salon.services),
      });
    }
  });

  insertMany(salons);

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM Salon")
    .get() as { count: number };

  db.close();
  console.log(`Seeded ${count} beauty salons into ${getDatabasePath()}`);
}

main();
