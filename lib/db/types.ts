export type SalonRow = {
  id: number;
  name: string;
  address: string;
  district: string;
  phone: string;
  website: string | null;
  services: string;
  price_range: string;
  rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
};

export type SalonInsert = Omit<
  SalonRow,
  "id" | "created_at" | "updated_at"
> & {
  services: string[] | string;
};
