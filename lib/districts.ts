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
