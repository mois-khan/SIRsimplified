import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const mobile = formData.get("mobile");
    const epic_no = formData.get("epic_no")?.toUpperCase();
    const house_no = formData.get("house_no")?.toUpperCase() || null;
    const booth_no = formData.get("booth_no")?.toUpperCase() || null;
    const photo = formData.get("photo");
    const status = formData.get("status") || "Pending";
    const notes = formData.get("notes") || null;

    if (!name || !mobile || !epic_no) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let id_photo_url = null;

    // 1. Upload photo if exists
    if (photo && photo.size > 0) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("voter_ids")
        .upload(filePath, photo);

      if (uploadError) {
        console.error("Upload error (skipping photo):", uploadError);
        // We do not fail the whole request if photo upload fails.
      } else {
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("voter_ids")
          .getPublicUrl(filePath);
          
        id_photo_url = publicUrlData.publicUrl;
      }
    }

    // 2. Insert into database
    const { data: dbData, error: dbError } = await supabase
      .from("submissions")
      .insert([
        {
          name,
          mobile,
          epic_no,
          house_no,
          booth_no,
          id_photo_url,
          status,
          notes,
        }
      ])
      .select();

    if (dbError) {
      console.error("DB error:", dbError);
      if (dbError.code === '23505') {
        return NextResponse.json({ error: "Duplicate Entry: This Voter ID/EPIC No has already been submitted." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to save submission", details: dbError }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: dbData[0] }, { status: 200 });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
