// Booth Level Officers (BLOs) are configured once via the NEXT_PUBLIC_BLO_LIST
// env var. Each BLO is responsible for one or more BOOTHS, so a voter's BLO is
// derived automatically from their booth number — no manual selection.
//
// Format: comma-separated entries of  NAME:MOBILE:BOOTHS
//   • BOOTHS is one or more booth numbers separated by ";"
//   • the booths part is optional (a BLO with no booths just won't auto-assign)
// e.g.
//   NEXT_PUBLIC_BLO_LIST=MAMATHA:8897325974:45;46,RAVISH KUMAR:9000000001:47
//
// Names & booths are normalised to UPPERCASE to match the rest of the data.

const normalizeBooth = (b) => (b == null ? "" : String(b).trim().toUpperCase());

export const parseBloList = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => {
      const parts = entry.split(":");
      if (parts.length < 2) return null;
      const name = parts[0].trim().toUpperCase();
      const number = (parts[1] || "").replace(/\D/g, ""); // digits only
      const booths = (parts[2] || "")
        .split(/[;/]/)               // allow ";" or "/" between booths
        .map(normalizeBooth)
        .filter(Boolean);
      return name ? { name, number, booths } : null;
    })
    .filter(Boolean);
};

// Referenced literally so Next.js inlines the value into the client bundle.
// Always sorted A→Z by name so every dropdown/filter shows BLOs alphabetically.
export const BLO_LIST = parseBloList(process.env.NEXT_PUBLIC_BLO_LIST || "")
  .sort((a, b) => a.name.localeCompare(b.name));

// booth number -> { name, number }. If two BLOs claim the same booth, the last
// one configured wins.
const BOOTH_TO_BLO = new Map();
for (const b of BLO_LIST) {
  for (const booth of b.booths) {
    BOOTH_TO_BLO.set(booth, { name: b.name, number: b.number });
  }
}

// Core lookup: which BLO covers this booth?
export const bloByBooth = (boothNo) => BOOTH_TO_BLO.get(normalizeBooth(boothNo)) || null;
export const bloNameByBooth = (boothNo) => bloByBooth(boothNo)?.name || "";

// name -> dialable number lookup (tap-to-call). Returns "" when unknown.
export const bloNumberByName = (name) => {
  if (!name) return "";
  const target = name.trim().toUpperCase();
  const match = BLO_LIST.find((b) => b.name === target);
  return match ? match.number : "";
};

// Normalise a stored blo_name to its UPPERCASE key (or "" if none).
export const normalizeBlo = (name) =>
  name && name.trim() ? name.trim().toUpperCase() : "";

// The BLO a submission effectively belongs to. Booth mapping is authoritative;
// we fall back to any previously-stored blo_name so legacy/manual assignments
// aren't lost while booths are still being configured.
export const effectiveBloName = (sub) =>
  bloNameByBooth(sub?.booth_no) || normalizeBlo(sub?.blo_name);

export const effectiveBlo = (sub) => {
  const name = effectiveBloName(sub);
  return name ? { name, number: bloNumberByName(name) } : null;
};

// Build the list of BLO names for filters/dropdowns: configured BLOs merged
// with any BLO effectively present in the data, sorted A→Z, plus a flag for
// whether any records are unassigned.
export const bloOptionsFromSubmissions = (submissions = []) => {
  const set = new Set(BLO_LIST.map((b) => b.name));
  let hasUnassigned = false;
  for (const s of submissions) {
    const v = effectiveBloName(s);
    if (v) set.add(v);
    else hasUnassigned = true;
  }
  const names = [...set].sort((a, b) => a.localeCompare(b));
  return { names, hasUnassigned };
};
