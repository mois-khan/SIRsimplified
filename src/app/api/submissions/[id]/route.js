import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Configure Cloudflare R2 Client
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { id_photo_url } = body;

    // 1. Delete Photo if exists
    if (id_photo_url) {
      const fileName = id_photo_url.split('/').pop();

      if (id_photo_url.includes("supabase.co")) {
        // Old photo: Delete from Supabase
        const { error: storageError } = await supabase.storage
          .from('voter_ids')
          .remove([fileName]);
        if (storageError) console.error("Supabase Storage delete error:", storageError);
      } else {
        // New photo: Delete from Cloudflare R2
        try {
          await r2.send(new DeleteObjectCommand({
            Bucket: "voter-ids",
            Key: fileName,
          }));
        } catch (r2Error) {
          console.error("R2 Storage delete error:", r2Error);
        }
      }
    }

    // 2. Delete Database Record
    const { error: dbError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete record error:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
