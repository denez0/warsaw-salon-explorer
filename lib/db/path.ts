import path from "path";

const DEFAULT_DB_FILENAME = "beauty_salons.db";

/** Absolute path to the SQLite database file. */
export function getDatabasePath(): string {
  const fromEnv = process.env.DATABASE_PATH?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), "data", DEFAULT_DB_FILENAME);
}
