import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { analyzeFoodImage, NO_PROVIDERS_MESSAGE, NoProvidersAvailableError } from "@/lib/ai/analyze";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 10MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uploadDir = path.join(process.cwd(), "public", "uploads", user.id);
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  const imagePath = `/uploads/${user.id}/${filename}`;

  const scanResult = await db.scanResult.create({
    data: {
      userId: user.id,
      imagePath,
      status: "pending",
      // Real value is filled in once we know which provider actually
      // answered — see the success branch below.
      model: "pending",
    },
  });

  try {
    const { foods, model } = await analyzeFoodImage({ base64, mimeType: file.type });

    await db.scanResult.update({
      where: { id: scanResult.id },
      data: { status: "done", detectedJson: JSON.stringify(foods), model: model.model },
    });

    return NextResponse.json({ imagePath, foods, model });
  } catch (error) {
    await db.scanResult.update({ where: { id: scanResult.id }, data: { status: "failed" } });

    if (error instanceof NoProvidersAvailableError) {
      return NextResponse.json({ error: NO_PROVIDERS_MESSAGE }, { status: 503 });
    }

    console.error("[scan] unexpected failure", error);
    return NextResponse.json({ error: "Analysis failed", imagePath }, { status: 502 });
  }
}
