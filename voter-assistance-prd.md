# Voter Assistance Portal — Simplified PRD

## What it does
- Public search of the 2002 electoral roll by **EPIC number** or **house number**
- Public form to collect visitor details + WhatsApp join button
- Admin table to view all submissions + download as Excel
- Everything lives in **Supabase** — database, file storage (ID photos), and auth. No separate services.
- Telugu names stay in Telugu — no translation. Search works because EPIC and house number are already in English/numbers.

---

## Tech Stack (final)
- **Next.js** — the whole app, frontend + backend API routes
- **Supabase** — Postgres database, Storage (for ID photos), Auth (admin login only)
- **exceljs** — Excel export, run inside a Next.js API route

That's it. No Python service, no separate file storage, no separate pipeline host — the extraction script is the only thing that runs outside Next.js, and it writes straight into Supabase.

---

## Data Tables (Supabase)

**`electors_2002`**
```
id, ac_no, ac_name, ps_no, house_no, elector_name, relation_type,
relation_name, epic_no, age, gender, verified (boolean)
```
`verified = true` only once a human has visually confirmed `house_no` + `epic_no` against the original PDF page (see Accuracy Protocol below). Public search only returns `verified = true` rows.

**`submissions`**
```
id, name, mobile, epic_no, house_no, id_photo_url, status,
whatsapp_joined, consent_given, created_at
```

---

## Pages

1. **Home** — two buttons: "Search 2002 Roll" / "Get Help"
2. **Search (`/search`)** — enter EPIC or house number → shows match or the "not found, here's what to do" explainer
3. **Submit (`/submit`)** — name, mobile, EPIC, house no (optional), ID photo (optional), consent checkbox
4. **Thank you** — "Join WhatsApp Group" button (opens your invite link)
5. **Admin (`/admin`)** — login, then table of submissions + "Download Excel" button

---

## Accuracy Protocol (this is the important part)

You said errors aren't acceptable — here's how to get there without full manual typing:

1. **Extract with a vision model, twice, independently.** Run each PDF page through Gemini or Claude's vision capability twice (or once each with two different prompts). Compare the two outputs field by field.
2. **Auto-approve rows where both passes agree exactly** on `house_no` and `epic_no` — these are almost certainly correct, since it's machine-printed text and two independent reads matching is a strong signal.
3. **Flag rows where the two passes disagree**, or where `epic_no` doesn't match the expected format (`AP` + 9 digits), or `age` is outside 1–110. These get `verified = false` and go into a review queue.
4. **One-by-one human check — but only for flagged rows, and only on `house_no` + `epic_no`**, side-by-side with the original PDF image. This is the field people will actually search by, so it's the one that must be exact. The Telugu name field doesn't need this same scrutiny — if it's slightly off, the person searching will still recognize their own name visually once they find the right row via house number/EPIC.
5. **Only `verified = true` rows appear in public search.** Anything still in the review queue is invisible to the public until checked. This means you never show someone a wrong result — worst case, their row just isn't live yet.

This turns "type 858 rows correctly by hand" into "review maybe 30–80 flagged rows per ward," while keeping the two fields that matter most for search near-100% reliable before they ever go public.

---

## Phase-Wise Implementation Plan

### Phase 0 — Setup (few hours)
- Create Supabase project, set up the two tables above
- Scaffold Next.js app, connect to Supabase
- Deploy a bare skeleton so the URL is live early

### Phase 1 — 2002 Roll: Extract + Verify + Search
*(Do this first — it's your highest-trust feature and takes the longest to get right)*
- Write the extraction script (PDF → images → vision model → JSON → insert into `electors_2002` with `verified = false`)
- Run it on 1 ward, check how many rows get flagged
- Build the admin review queue page (flagged rows next to page image, approve/correct)
- Build the public `/search` page (EPIC or house number → verified rows only)
- Repeat extraction across all your ward PDFs

### Phase 2 — Public Submission + WhatsApp
- Build `/submit` form → writes to `submissions`
- Build thank-you page with WhatsApp invite link button
- Wire up consent checkbox properly (unchecked by default)

### Phase 3 — Admin Dashboard for Submissions
- Table view of `submissions` with search/filter
- Status dropdown (pending / found in 2002 / not found / followed up)
- "Download Excel" button (exceljs, exports current filtered view)

### Phase 4 — Polish
- "Not an official ECI site" disclaimer on every page
- Telugu UI translation (labels/buttons only — not the roll data)
- Basic rate-limiting on `/search` so it can't be scraped in bulk
- Mobile-responsive pass, since most users will be on phones

---

## Open Decisions
- One WhatsApp group for everyone, or per-ward?
- How long do you keep `submissions` data after Oct 1, 2026 (when SIR closes)?
