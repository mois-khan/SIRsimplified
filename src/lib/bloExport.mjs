// Builds a "BLO-wise voter list" Excel workbook so each Booth Level Officer can
// be handed the voters that belong to their booth (name + mobile + details).
//
// Structure:
//   • "Summary" sheet  — index of every BLO, their contact number, voter count.
//   • One sheet per BLO — that BLO's voters (sorted by name).
//   • "Unassigned"      — voters with no BLO selected (only if any exist).
//
// resolveContact(name) -> phone string is injected by the caller (the API route
// passes bloNumberByName from lib/blo) so this module stays env-free & testable.

import ExcelJS from "exceljs";

const TEAL = "FF128C7E";
const TEAL_LIGHT = "FFD1FAE5";
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
  styleCell(sTitle, { fill: TEAL, bold: true, color: WHITE, align: "center" });
  sTitle.font = { bold: true, size: 15, color: { argb: WHITE } };
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
    const rows = groups.get(key)
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
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
      ? `UNASSIGNED VOTERS (no BLO selected)      Total: ${rows.length}`
      : `BLO: ${key}       Contact: ${contact}       Total Voters: ${rows.length}`;
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

    // Data rows
    rows.forEach((r, idx) => {
      const rowNum = idx + 3;
      const values = [
        idx + 1,
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
          fill: idx % 2 === 1 ? ZEBRA : undefined,
          align: i === 0 ? "center" : "left",
          text: i === 2 || i === 5, // mobile & EPIC as text (keep exact digits)
        });
        c.border = BORDER;
      });
    });

    if (rows.length === 0) {
      ws.mergeCells(3, 1, 3, 7);
      const empty = ws.getCell(3, 1);
      empty.value = "No voters in this group.";
      empty.alignment = { horizontal: "center" };
    }

    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 7 } };
  }

  return workbook;
}
