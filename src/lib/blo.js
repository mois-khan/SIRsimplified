// Booth Level Officers (BLOs) are configured once via the NEXT_PUBLIC_BLO_LIST
// env var, so the same name->number map is available to the public form
// (dropdown) and the admin cards (tap-to-call + reassign).
//
// Format: comma-separated "NAME:MOBILE" pairs, e.g.
//   NEXT_PUBLIC_BLO_LIST=RAMESH KUMAR:9876543210,SUNITA DEVI:9123456780
//
// Names are normalised to UPPERCASE to match the rest of the voter data.

export const parseBloList = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => {
      const idx = entry.indexOf(":");
      if (idx === -1) return null;
      const name = entry.slice(0, idx).trim().toUpperCase();
      const number = entry.slice(idx + 1).replace(/\D/g, ""); // digits only
      return name ? { name, number } : null;
    })
    .filter(Boolean);
};

// Referenced literally so Next.js inlines the value into the client bundle.
export const BLO_LIST = parseBloList(process.env.NEXT_PUBLIC_BLO_LIST || "");

// name -> dialable number lookup for tap-to-call on the admin cards.
// Returns "" when the BLO isn't in the configured list (e.g. removed later).
export const bloNumberByName = (name) => {
  if (!name) return "";
  const target = name.trim().toUpperCase();
  const match = BLO_LIST.find((b) => b.name === target);
  return match ? match.number : "";
};

// Normalise a stored blo_name to its UPPERCASE key (or "" if none).
export const normalizeBlo = (name) =>
  name && name.trim() ? name.trim().toUpperCase() : "";

// Build the list of BLO names to show in filters/dropdowns: the configured
// BLOs merged with any BLO actually present in the data, sorted A→Z, plus a
// flag for whether any records are unassigned. Keeps every UI list consistent.
export const bloOptionsFromSubmissions = (submissions = []) => {
  const set = new Set(BLO_LIST.map((b) => b.name));
  let hasUnassigned = false;
  for (const s of submissions) {
    const v = normalizeBlo(s.blo_name);
    if (v) set.add(v);
    else hasUnassigned = true;
  }
  const names = [...set].sort((a, b) => a.localeCompare(b));
  return { names, hasUnassigned };
};
