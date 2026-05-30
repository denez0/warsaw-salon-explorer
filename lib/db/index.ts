export { getDb } from "./client";
export { getDatabasePath } from "./path";
export { runMigrations, ensureDataDirectory } from "./migrate";
export type { SalonRow, SalonInsert } from "./types";
export type { SalonDetail, SalonListItem } from "./salon-serialize";
export type { SalonUpdateInput } from "./salon-validation";
export {
  getSalonById,
  listSalonsApi,
  updateSalon,
} from "./salon-queries";
export { countSalons, listSalons } from "./salons";
