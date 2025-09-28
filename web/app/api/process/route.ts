import { NextResponse } from "next/server";
import JSZip from "jszip";
import { applyWatermark } from "@/lib/watermark";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const designId = String(formData.get("designId") ?? "");
  const photographerName = String(formData.get("photographerName") ?? "");

  const files = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
  }

  const zip = new JSZip();

  await Promise.all(
    files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const result = await applyWatermark({
        buffer: Buffer.from(arrayBuffer),
        fileName: file.name,
        designId,
        photographerName,
      });
      zip.file(result.outputName, result.outputBuffer);
    })
  );

  const zippedBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zippedUint8 = new Uint8Array(zippedBuffer);

  return new NextResponse(zippedUint8, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=digicamwm-watermarked.zip",
    },
  });
}
