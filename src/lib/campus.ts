/**
 * Buildings of the ring campus, as labelled on the campus map. Lettered
 * academic buildings A–G form the ring; H, J, M and S are facilities.
 * Display data only — nothing here is used for authorization or booking rules.
 */
export type BuildingKind = "academic" | "facility";

export interface CampusBuilding {
  code: string;
  kind: BuildingKind;
  /** Short one-line summary for lists. */
  summary: string;
  /** What is inside, as listed on the campus map. */
  places: readonly string[];
}

export const CAMPUS_BUILDINGS: readonly CampusBuilding[] = [
  {
    code: "A",
    kind: "academic",
    summary: "CHIPS · IRE · IME · Dining Hall",
    places: ["CHIPS", "IRE", "IME", "Dining Hall"],
  },
  { code: "B", kind: "academic", summary: "Scholar Space", places: ["Scholar Space"] },
  {
    code: "C",
    kind: "academic",
    summary: "CHIPS · X³ CoVenture · Innovation Factory",
    places: ["CHIPS", "X³ CoVenture", "Innovation Factory"],
  },
  {
    code: "D",
    kind: "academic",
    summary: "AIAC · IOT · Library",
    places: ["AIAC", "IOT", "Library (1F–2F)"],
  },
  {
    code: "E",
    kind: "academic",
    summary: "IFB · EEH · Learning Mall",
    places: ["IFB", "EEH", "Learning Mall (2F–3F)"],
  },
  {
    code: "F",
    kind: "academic",
    summary: "Western Restaurant",
    places: ["Western Restaurant (1F)"],
  },
  { code: "G", kind: "academic", summary: "SCT · Museum", places: ["SCT", "Museum (1F)"] },
  {
    code: "H",
    kind: "facility",
    summary: "Administrative Services Centre",
    places: ["Administrative Services Centre"],
  },
  { code: "J", kind: "facility", summary: "Students Centre", places: ["Students Centre"] },
  {
    code: "M",
    kind: "facility",
    summary: "Multifunctional Hall",
    places: ["Multifunctional Hall"],
  },
  { code: "S", kind: "facility", summary: "Stadium", places: ["Stadium"] },
];

const BY_CODE = new Map(CAMPUS_BUILDINGS.map((b) => [b.code, b]));

export function findBuilding(code: string): CampusBuilding | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/**
 * Best-effort building letter from a free-text location:
 * "Building D, room 425", "Office C-308", "B-301", "D425", "D 4F".
 * Two-letter codes such as "SD 425" are not campus-map buildings and return undefined.
 */
export function buildingFromLocation(location: string | null | undefined) {
  if (!location) return undefined;
  const text = location.trim();
  const patterns = [
    /\bbuilding\s+([a-z])\b/i,
    /^(?:office\s+|room\s+)?([a-z])[-\s]?\d/i,
    /\b(?:office|room)\s+([a-z])[-\s]?\d/i,
    /(?:^|[\s,·(])([a-z])-\d{2,4}\b/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const building = findBuilding(match[1]);
      if (building) return building;
    }
  }
  return undefined;
}
