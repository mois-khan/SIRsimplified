import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { bloNumberByName, effectiveBloName } from "../../../../lib/blo";
import { buildBloVoterWorkbook } from "../../../../lib/bloExport.mjs";

// GET /api/admin/export-blo
// Returns a BLO-wise voter list workbook (one sheet per BLO + a Summary sheet)
// so each Booth Level Officer can be handed their own voters.
export async function GET() {
  try {
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("BLO export fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // BLO is derived from each voter's booth so the sheet always reflects the
    // current booth → BLO mapping, even if stored blo_name is stale/empty.
    const enriched = (submissions || []).map((s) => ({ ...s, blo_name: effectiveBloName(s) || null }));
    const workbook = buildBloVoterWorkbook(enriched, bloNumberByName);
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="blo_wise_voter_list_${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("BLO export error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
