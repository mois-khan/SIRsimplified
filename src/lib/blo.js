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
