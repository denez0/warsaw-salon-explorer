import { openStandaloneDb } from "../lib/db/standalone";
import { getDatabasePath } from "../lib/db/path";

function main(): void {
  const dbPath = getDatabasePath();
  const db = openStandaloneDb();
  db.close();
  console.log(`Database ready at: ${dbPath}`);
}

main();
