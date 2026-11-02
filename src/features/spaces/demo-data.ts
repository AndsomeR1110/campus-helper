import type { Space } from "./types";

/** Fictional fixtures; no claim of live availability or official campus integration. */
export const DEMO_SPACES: readonly Space[] = Array.from({ length: 20 }, (_, i) => ({
  id: `demo-seat-${i + 1}`,
  campus: "Demo campus",
  building: i < 10 ? "Demo Library East" : "Demo Library West",
  floor: (i % 3) + 1,
  seat: `${i < 10 ? "E" : "W"}-${String((i % 10) + 1).padStart(2, "0")}`,
  type: i % 3 === 0 ? "DISCUSSION" : i % 3 === 1 ? "QUIET" : "COMPUTER",
  discussion: i % 3 === 0,
  capacity: 1,
  power: i % 4 !== 0,
}));
