export const SALON_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS Salon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,
  services TEXT NOT NULL,
  price_range TEXT NOT NULL,
  rating REAL NOT NULL,
  review_count INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SALON_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_salon_district ON Salon (district);`,
  `CREATE INDEX IF NOT EXISTS idx_salon_rating ON Salon (rating);`,
];
