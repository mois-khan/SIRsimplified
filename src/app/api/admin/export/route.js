import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    // 1. Fetch all submissions
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // 2. Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Submissions");

    // 3. Define columns
    worksheet.columns = [
      { header: "Date", key: "created_at", width: 20 },
      { header: "Name", key: "name", width: 25 },
      { header: "Mobile", key: "mobile", width: 15 },
      { header: "EPIC No", key: "epic_no", width: 20 },
      { header: "House No", key: "house_no", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Photo URL", key: "id_photo_url", width: 40 },
    ];

    // 4. Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" }
    };

    // 5. Add rows
    submissions.forEach((sub) => {
      worksheet.addRow({
        created_at: new Date(sub.created_at).toLocaleString(),
        name: sub.name,
        mobile: sub.mobile,
        epic_no: sub.epic_no,
        house_no: sub.house_no || "N/A",
        status: sub.status || "Pending",
        id_photo_url: sub.id_photo_url || "No Photo",
      });
    });

    // 6. Generate the Excel file in memory
    const buffer = await workbook.xlsx.writeBuffer();

    // 7. Return as a downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="voter_submissions_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
