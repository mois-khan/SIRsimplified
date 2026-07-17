// Builds a "BLO-wise voter list" Excel workbook so each Booth Level Officer can
// be handed the voters that belong to their booth (name + mobile + details).
//
// Structure:
//   • "Summary" sheet  — index of every BLO, their contact number, voter count.
//   • One sheet per BLO — that BLO's voters, GROUPED under bold date headers
//                         (the day the form was filled), oldest day first.
//   • "Unassigned"      — voters with no BLO selected (only if any exist).
//
// resolveContact(name) -> phone string is injected by the caller (the API route
// passes bloNumberByName from lib/blo) so this module stays env-free & testable.

import ExcelJS from "exceljs";

const TEAL = "FF128C7E";
const TEAL_LIGHT = "FFD1FAE5";
const BAND = "FFA7DEC9"; // date-header banner
const DARK = "FF0B3D2E";
const WHITE = "FFFFFFFF";
const GREY = "FF9CA3AF";
const ZEBRA = "FFF3FBF7";

const THIN = { style: "thin", color: { argb: "FFD1D5DB" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const UNASSIGNED = "Unassigned";

// Excel sheet names: max 31 chars, may not contain : \ / ? * [ ] and must be
// unique. Sanitise, truncate, and de-duplicate with a numeric suffix.
const sanitizeSheetName = (name, used) => {
  const base = (name || "Sheet").replace(/[:\\/?*[\]]/g, " ").trim().substring(0, 31) || "Sheet";
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = base.substring(0, 31 - suffix.length) + suffix;
    i++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

const styleCell = (cell, { fill, bold, color, align, indent, text } = {}) => {
  if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  if (bold || color) cell.font = { bold: !!bold, color: color ? { argb: color } : undefined };
  cell.alignment = { vertical: "middle", horizontal: align || "left", ...(indent ? { indent } : {}) };
  if (text) cell.numFmt = "@";
};

// IST day label + a sortable key, from a created_at value.
const dayInfo = (createdAt) => {
  const t = createdAt ? new Date(createdAt) : null;
  if (!t || isNaN(t)) return { label: "Undated", sortKey: Number.POSITIVE_INFINITY };
  const label = t.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
  });
  return { label, sortKey: t.getTime() };
};

export function buildBloVoterWorkbook(submissions = [], resolveContact = () => "") {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RR Foundation";
  workbook.created = new Date();

  // Group submissions by BLO (blank/absent -> Unassigned).
  const groups = new Map();
  for (const sub of submissions) {
    const key = sub.blo_name && sub.blo_name.trim()
      ? sub.blo_name.trim().toUpperCase()
      : UNASSIGNED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sub);
  }

  // Real BLOs alphabetically; Unassigned always last.
  const bloNames = [...groups.keys()]
    .filter((k) => k !== UNASSIGNED)
    .sort((a, b) => a.localeCompare(b));
  const orderedKeys = groups.has(UNASSIGNED) ? [...bloNames, UNASSIGNED] : bloNames;

  const generatedOn = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short",
  });

  // ───────────────────────── Summary sheet ─────────────────────────
  const summary = workbook.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 3 }] });
  [8, 34, 20, 14].forEach((w, i) => (summary.getColumn(i + 1).width = w));

  summary.mergeCells(1, 1, 1, 4);
  const sTitle = summary.getCell(1, 1);
  sTitle.value = "RR FOUNDATION — BLO-WISE VOTER LIST";
  sTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
  sTitle.font = { bold: true, size: 15, color: { argb: WHITE } };
  sTitle.alignment = { vertical: "middle", horizontal: "center" };
  summary.getRow(1).height = 30;

  summary.mergeCells(2, 1, 2, 4);
  const sSub = summary.getCell(2, 1);
  sSub.value = `Generated: ${generatedOn}      Total Voters: ${submissions.length}      BLOs: ${bloNames.length}`;
  sSub.font = { italic: true, size: 10, color: { argb: DARK } };
  sSub.alignment = { vertical: "middle", horizontal: "center" };
  summary.getRow(2).height = 18;

  ["#", "BLO Name", "Contact Number", "Total Voters"].forEach((h, i) => {
    const c = summary.getCell(3, i + 1);
    c.value = h;
    styleCell(c, { fill: TEAL_LIGHT, bold: true, color: DARK, align: i === 0 ? "center" : "left" });
    c.border = BORDER;
  });
  summary.getRow(3).height = 20;

  orderedKeys.forEach((key, idx) => {
    const rowNum = idx + 4;
    const isUnassigned = key === UNASSIGNED;
    const contact = isUnassigned ? "-" : (resolveContact(key) || "N/A");
    const values = [idx + 1, key, contact, groups.get(key).length];
    values.forEach((v, i) => {
      const c = summary.getCell(rowNum, i + 1);
      c.value = v;
      styleCell(c, {
        fill: idx % 2 === 1 ? ZEBRA : undefined,
        align: i === 0 || i === 3 ? "center" : "left",
        text: i === 2,
      });
      c.border = BORDER;
    });
  });
  summary.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 4 } };

  // ─────────────────────── One sheet per BLO ───────────────────────
  const usedNames = new Set(["summary"]);
  const colWidths = [6, 30, 16, 14, 10, 20, 24];
  const headers = ["#", "Voter Name", "Mobile No", "House No", "Booth No", "EPIC No", "Status"];

  for (const key of orderedKeys) {
    const isUnassigned = key === UNASSIGNED;
    const all = groups.get(key);
    const contact = isUnassigned ? "" : (resolveContact(key) || "N/A");
    const ws = workbook.addWorksheet(
      sanitizeSheetName(isUnassigned ? "Unassigned" : key, usedNames),
      { views: [{ state: "frozen", ySplit: 2 }] }
    );
    colWidths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

    // Title row
    ws.mergeCells(1, 1, 1, 7);
    const title = ws.getCell(1, 1);
    title.value = isUnassigned
      ? `UNASSIGNED VOTERS (no BLO selected)      Total: ${all.length}`
      : `BLO: ${key}       Contact: ${contact}       Total Voters: ${all.length}`;
    title.font = { bold: true, size: 13, color: { argb: WHITE } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isUnassigned ? GREY : TEAL } };
    title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 28;

    // Header row
    headers.forEach((h, i) => {
      const c = ws.getCell(2, i + 1);
      c.value = h;
      styleCell(c, { fill: TEAL_LIGHT, bold: true, color: DARK, align: i === 0 ? "center" : "left" });
      c.border = BORDER;
    });
    ws.getRow(2).height = 20;

    if (all.length === 0) {
      ws.mergeCells(3, 1, 3, 7);
      const empty = ws.getCell(3, 1);
      empty.value = "No voters in this group.";
      empty.alignment = { horizontal: "center" };
      continue;
    }

    // Group this BLO's voters by day (form-filled date), oldest day first.
    const byDay = new Map();
    for (const r of all) {
      const { label, sortKey } = dayInfo(r.created_at);
      if (!byDay.has(label)) byDay.set(label, { sortKey, rows: [] });
      byDay.get(label).rows.push(r);
    }
    const orderedDays = [...byDay.entries()].sort((a, b) => a[1].sortKey - b[1].sortKey);

    let rowNum = 3;
    let serial = 0;
    for (const [label, grp] of orderedDays) {
      // Bold date-header banner spanning the row.
      ws.mergeCells(rowNum, 1, rowNum, 7);
      const banner = ws.getCell(rowNum, 1);
      banner.value = `${label.toUpperCase()}    —    ${grp.rows.length} voter${grp.rows.length === 1 ? "" : "s"}`;
      banner.font = { bold: true, size: 11, color: { argb: DARK } };
      banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND } };
      banner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      for (let i = 1; i <= 7; i++) ws.getCell(rowNum, i).border = BORDER;
      ws.getRow(rowNum).height = 22;
      rowNum++;

      // That day's voters, sorted by name.
      const dayRows = grp.rows.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      for (const r of dayRows) {
        serial++;
        const values = [
          serial,
          r.name || "",
          r.mobile || "",
          r.house_no || "",
          r.booth_no || "",
          r.epic_no || "",
          r.status || "Pending",
        ];
        values.forEach((v, i) => {
          const c = ws.getCell(rowNum, i + 1);
          c.value = v;
          styleCell(c, {
            fill: serial % 2 === 0 ? ZEBRA : undefined,
            align: i === 0 ? "center" : "left",
            text: i === 2 || i === 5, // mobile & EPIC as text (keep exact digits)
          });
          c.border = BORDER;
        });
        rowNum++;
      }
    }
  }

  return workbook;
}
