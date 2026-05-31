export const DISTRICTS = [
  "Śródmieście",
  "Mokotów",
  "Praga",
  "Wola",
  "Żoliborz",
  "Ochota",
  "Wilanów",
  "Bielany",
  "Targówek",
  "Ursynów",
] as const;

export type District = (typeof DISTRICTS)[number];

/** Approximate district centers for realistic Warsaw coordinates. */
export const DISTRICT_COORDS: Record<
  District,
  { lat: number; lng: number }
> = {
  Śródmieście: { lat: 52.2297, lng: 21.0122 },
  Mokotów: { lat: 52.193, lng: 21.026 },
  Praga: { lat: 52.255, lng: 21.04 },
  Wola: { lat: 52.233, lng: 20.98 },
  Żoliborz: { lat: 52.269, lng: 20.985 },
  Ochota: { lat: 52.21, lng: 20.985 },
  Wilanów: { lat: 52.163, lng: 21.087 },
  Bielany: { lat: 52.29, lng: 20.945 },
  Targówek: { lat: 52.28, lng: 21.05 },
  Ursynów: { lat: 52.145, lng: 21.04 },
};

const STREET_NAMES = [
  "Marszałkowska",
  "Nowy Świat",
  "Puławska",
  "Wilcza",
  "Chmielna",
  "Złota",
  "Krucza",
  "Hoża",
  "Wspólna",
  "Grzybowska",
  "Targowa",
  "Francuska",
  "Solec",
  "Dobra",
  "Żurawia",
  "Koszykowa",
  "Belwederska",
  "Rakowiecka",
  "Grójecka",
  "Wolska",
  "Kasprzaka",
  "Słoneczna",
  "Stawki",
  "Powstańców",
  "Wołoska",
  "Puławska",
  "Al. Niepodległości",
  "Wąwozowa",
  "Płocka",
  "Batorego",
];

const NAME_PREFIXES = [
  "Studio",
  "Salon",
  "Atelier",
  "Beauty",
  "Gabinet",
  "Centrum",
  "Punkt",
  "Klinika",
];

const NAME_CORES = [
  "Urody",
  "Fryzjer",
  "Włosów",
  "Stylizacji",
  "Piękna",
  "Glamour",
  "Elegance",
  "Prestiż",
  "Perła",
  "Aurora",
  "Luna",
  "Bella",
  "Vita",
  "Nova",
  "Harmonia",
  "Blask",
  "Róża",
  "Lilia",
  "Jasmin",
  "Magnolia",
  "Orchidea",
  "Diament",
  "Perła Północy",
  "Złoty Liść",
  "Srebrna Nitka",
  "Czarujące Spojrzenie",
  "Delikatna Dłoń",
  "Stylowa",
  "Modna",
  "Królewska",
];

const SERVICES_POOL = [
  "strzyżenie damskie",
  "strzyżenie męskie",
  "koloryzacja",
  "balayage",
  "ombre",
  "stylizacja",
  "upięcie ślubne",
  "manicure",
  "pedicure",
  "hybryda",
  "żelowe",
  "regeneracja włosów",
  "keratyna",
  "przedłużanie włosów",
  "brwi",
  "rzęsy",
  "makijaż dzienny",
  "makijaż wieczorowy",
  "depilacja woskiem",
  "zabiegi na twarz",
  "peeling",
  "masaż głowy",
  "farbowanie brwi",
  "laminacja brwi",
];

const PRICE_RANGES = ["50–80 zł", "80–120 zł", "120–180 zł", "180–250 zł", "250+ zł"];

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

function randomOffset(seed: number, scale: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * scale;
}

function ratingForIndex(i: number): number {
  const raw = 3.5 + ((i * 17) % 16) / 10;
  return Math.round(raw * 10) / 10;
}

function reviewCountForIndex(i: number): number {
  return 12 + ((i * 37) % 480);
}

function phoneForIndex(i: number): string {
  const prefix = pick(["22", "500", "501", "502", "503", "504", "505", "600", "601", "602", "603", "604", "605", "606", "607", "608", "609", "660", "661", "662", "663", "664", "665", "666", "667", "668", "669", "690", "691", "692", "693", "694", "695", "696", "697", "698", "699"], i);
  const num = String(1000000 + ((i * 7919) % 8999999)).slice(0, 7);
  if (prefix === "22") {
    return `+48 ${prefix} ${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
  }
  return `+48 ${prefix} ${num.slice(0, 3)} ${num.slice(3, 6)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function servicesForIndex(i: number): string[] {
  const count = 3 + (i % 4);
  const services: string[] = [];
  for (let j = 0; j < count; j++) {
    const service = pick(SERVICES_POOL, i + j * 7);
    if (!services.includes(service)) {
      services.push(service);
    }
  }
  return services;
}

export type SeedSalon = {
  name: string;
  address: string;
  district: District;
  phone: string;
  website: string;
  services: string[];
  price_range: string;
  rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
};

export function generateSalons(total = 110): SeedSalon[] {
  const salons: SeedSalon[] = [];
  const perDistrict = Math.ceil(total / DISTRICTS.length);

  for (let d = 0; d < DISTRICTS.length; d++) {
    const district = DISTRICTS[d];
    const center = DISTRICT_COORDS[district];

    for (let j = 0; j < perDistrict && salons.length < total; j++) {
      const i = salons.length;
      const prefix = pick(NAME_PREFIXES, i + d);
      const core = pick(NAME_CORES, i * 3 + j);
      const name = `${prefix} ${core}${j > 0 ? ` ${district.split(" ")[0]}` : ""}`.trim();
      const street = pick(STREET_NAMES, i + d * 3);
      const building = 1 + ((i * 13 + j * 5) % 120);
      const address = `ul. ${street} ${building}, ${district}, Warszawa`;
      const lat = center.lat + randomOffset(i * 11 + j, 0.018);
      const lng = center.lng + randomOffset(i * 7 + j * 3, 0.025);
      const slug = slugify(name);

      salons.push({
        name,
        address,
        district,
        phone: phoneForIndex(i),
        website: `https://www.${slug}.pl`,
        services: servicesForIndex(i),
        price_range: pick(PRICE_RANGES, i + d),
        rating: ratingForIndex(i),
        review_count: reviewCountForIndex(i),
        latitude: Math.round(lat * 1e6) / 1e6,
        longitude: Math.round(lng * 1e6) / 1e6,
      });
    }
  }

  return salons;
}
