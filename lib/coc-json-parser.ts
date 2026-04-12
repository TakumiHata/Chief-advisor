/**
 * Parser for CoC in-game JSON export data.
 * Converts internal data IDs to human-readable names.
 */

import {
  HERO_IDS,
  UNIT_IDS,
  SIEGE_IDS,
  SPELL_IDS,
  PET_IDS,
  EQUIPMENT_IDS,
  BUILDING_IDS,
  TRAP_IDS,
  resolveName,
} from "./coc-ids";

export interface ParsedHero {
  name: string;
  level: number;
  upgrading: boolean;
}

export interface ParsedUnit {
  name: string;
  level: number;
}

export interface ParsedEquipment {
  name: string;
  level: number;
}

export interface ParsedBuilding {
  name: string;
  level: number;
  count: number;
}

export interface ParsedPlayerData {
  tag: string;
  townHallLevel: number;
  heroes: ParsedHero[];
  units: ParsedUnit[];
  siegeMachines: ParsedUnit[];
  spells: ParsedUnit[];
  pets: ParsedUnit[];
  equipment: ParsedEquipment[];
  buildings: ParsedBuilding[];
  traps: ParsedBuilding[];
  wallSummary: string;
}

interface RawEntry {
  data: number;
  lvl: number;
  cnt?: number;
  timer?: number;
}

export function parseCocJson(raw: string): ParsedPlayerData {
  const data = JSON.parse(raw);

  const thEntry = data.buildings?.find(
    (b: RawEntry) => b.data === 1000013 && b.lvl >= 1
  );
  const townHallLevel = thEntry?.lvl ?? 0;

  const heroes: ParsedHero[] = (data.heroes ?? []).map((h: RawEntry) => ({
    name: resolveName(h.data, HERO_IDS),
    level: h.lvl,
    upgrading: !!h.timer,
  }));

  const units: ParsedUnit[] = (data.units ?? []).map((u: RawEntry) => ({
    name: resolveName(u.data, UNIT_IDS),
    level: u.lvl,
  }));

  const siegeMachines: ParsedUnit[] = (data.siege_machines ?? []).map(
    (s: RawEntry) => ({
      name: resolveName(s.data, SIEGE_IDS),
      level: s.lvl,
    })
  );

  const spells: ParsedUnit[] = (data.spells ?? []).map((s: RawEntry) => ({
    name: resolveName(s.data, SPELL_IDS),
    level: s.lvl,
  }));

  const pets: ParsedUnit[] = (data.pets ?? []).map((p: RawEntry) => ({
    name: resolveName(p.data, PET_IDS),
    level: p.lvl,
  }));

  const equipment: ParsedEquipment[] = (data.equipment ?? []).map(
    (e: RawEntry) => ({
      name: resolveName(e.data, EQUIPMENT_IDS),
      level: e.lvl,
    })
  );

  // Aggregate buildings (excluding walls and TH which are shown separately)
  const buildingMap = new Map<string, ParsedBuilding>();
  for (const b of data.buildings ?? []) {
    if (b.data === 1000010) continue; // walls handled separately
    const name = resolveName(b.data, BUILDING_IDS);
    const key = `${name}_${b.lvl}`;
    const existing = buildingMap.get(key);
    if (existing) {
      existing.count += b.cnt ?? 1;
    } else {
      buildingMap.set(key, { name, level: b.lvl, count: b.cnt ?? 1 });
    }
  }

  const traps: ParsedBuilding[] = (data.traps ?? []).map((t: RawEntry) => ({
    name: resolveName(t.data, TRAP_IDS),
    level: t.lvl,
    count: t.cnt ?? 1,
  }));

  // Wall summary
  const walls = (data.buildings ?? []).filter(
    (b: RawEntry) => b.data === 1000010
  );
  const wallParts = walls.map(
    (w: RawEntry) => `Lv.${w.lvl}×${w.cnt ?? 1}`
  );
  const wallSummary = wallParts.length > 0 ? wallParts.join(", ") : "なし";

  return {
    tag: data.tag ?? "",
    townHallLevel,
    heroes,
    units,
    siegeMachines,
    spells,
    pets,
    equipment,
    buildings: Array.from(buildingMap.values()),
    traps,
    wallSummary,
  };
}
