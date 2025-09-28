import { NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  const allowedExtensions = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 }
    );
  }

  const candidatePaths = [
    path.resolve(process.cwd(), "public", "assets", "designs", filename),
    path.resolve(process.cwd(), "..", "assets", "designs", filename),
  ];

  const assetPath = candidatePaths.find((candidate) => existsSync(candidate));
  if (!assetPath) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const stream = createReadStream(assetPath);
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
