import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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
    const { id } = await params;
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
            Bucket: process.env.R2_BUCKET_NAME || "enumeration-forms",
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

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!photo || photo.size === 0) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    const fileExt = photo.name.split('.').pop();
    const fileName = `${id}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "enumeration-forms",
      Key: fileName,
      Body: buffer,
      ContentType: photo.type,
    }));

    const publicDomain = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    const id_photo_url = `${publicDomain}/${fileName}`;

    const { error: dbError } = await supabase
      .from('submissions')
      .update({ id_photo_url })
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, url: id_photo_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload photo" }, { status: 500 });
  }
}
